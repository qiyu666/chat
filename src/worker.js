const encoder = new TextEncoder()

function hashPassword(password, secret) {
  const data = encoder.encode(password + secret + '_salt')
  return btoa(String.fromCharCode(...data))
}

function generateId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `id_${timestamp}_${random}`
}

function generateChatCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let code = 'chat_'
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

function respond(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}

function respondError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}

async function signJWT(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payloadB64 = btoa(JSON.stringify({ ...payload, iat: Date.now() }))
  const sigInput = encoder.encode(header + '.' + payloadB64 + '.' + secret)
  const hashBuffer = await crypto.subtle.digest('SHA-256', sigInput)
  const signature = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
  return header + '.' + payloadB64 + '.' + signature
}

async function verifyJWT(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [headerB64, payloadB64, signature] = parts
  try {
    const sigInput = encoder.encode(headerB64 + '.' + payloadB64 + '.' + secret)
    const hashBuffer = await crypto.subtle.digest('SHA-256', sigInput)
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    if (signature !== expectedSignature) return null
    const payload = JSON.parse(atob(payloadB64))
    if (payload.exp && payload.exp < Date.now() / 1000) return null
    return payload
  } catch {
    return null
  }
}

function verifyPassword(password, storedHash, secret) {
  const data = encoder.encode(password + secret + '_salt')
  const computedHash = btoa(String.fromCharCode(...data))
  return computedHash === storedHash
}

async function handleRequest(req, env) {
  const url = new URL(req.url)
  const path = url.pathname
  const method = req.method

  const DB = env.DB
  const JWT_SECRET = env.JWT_SECRET

  if (!DB) throw new Error('D1 database not configured')
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured')

  // 一次性建表，仅在表不存在时写入（首次部署后不再消耗读取）
  await DB.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, chat_code TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, balance REAL DEFAULT 100, payment_password TEXT, created_at TEXT DEFAULT (datetime('now')));CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, friend_id TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));CREATE TABLE IF NOT EXISTS blocks (blocker_id TEXT NOT NULL, blocked_id TEXT NOT NULL, PRIMARY KEY (blocker_id, blocked_id));CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, user1_id TEXT NOT NULL, user2_id TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, sender_id TEXT NOT NULL, content TEXT, image_url TEXT, packet_id TEXT, created_at TEXT DEFAULT (datetime('now')));CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount REAL NOT NULL, type TEXT NOT NULL, description TEXT, created_at TEXT DEFAULT (datetime('now')));CREATE TABLE IF NOT EXISTS moments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, content TEXT, images TEXT, like_count INTEGER DEFAULT 0, comment_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));CREATE TABLE IF NOT EXISTS moment_likes (moment_id TEXT NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY (moment_id, user_id));CREATE TABLE IF NOT EXISTS moment_comments (id TEXT PRIMARY KEY, moment_id TEXT NOT NULL, user_id TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));CREATE TABLE IF NOT EXISTS red_packets (id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, receiver_id TEXT NOT NULL, amount REAL NOT NULL, message TEXT, status TEXT DEFAULT 'open', claimed_at TEXT, created_at TEXT DEFAULT (datetime('now')));CREATE TABLE IF NOT EXISTS friend_requests (id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, receiver_id TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));`)

  if (path === '/health') {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (path.startsWith('/api/')) {
    const authHeader = req.headers.get('Authorization')
    let userId = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const payload = await verifyJWT(token, JWT_SECRET)
      if (payload && payload.userId) userId = payload.userId
    }

    const requireAuth = () => {
      if (!userId) return respondError('未登录', 401)
      return null
    }

    if (path === '/api/auth/register' && method === 'POST') {
      const body = await req.json()
      const { username, password } = body
      if (!username || !password) return respondError('用户名和密码不能为空')
      if (username.length < 2 || username.length > 20) return respondError('用户名长度2-20位')
      if (password.length < 4) return respondError('密码至少4位')
      const existing = await DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
      if (existing) return respondError('用户名已存在')
      const finalChatCode = generateChatCode()
      const hash = hashPassword(password, JWT_SECRET)
      const id = generateId()
      await DB.prepare('INSERT INTO users (id, username, chat_code, password_hash, balance) VALUES (?, ?, ?, ?, ?)').bind(id, username, finalChatCode, hash, 100).run()
      const token = await signJWT({ userId: id, username }, JWT_SECRET)
      return respond({ success: true, token, user: { id, username, chat_code: finalChatCode, balance: 100, hasPaymentPassword: false } })
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const body = await req.json()
      const { username, password } = body
      if (!username || !password) return respondError('用户名和密码不能为空')
      const user = await DB.prepare('SELECT id, username, chat_code, password_hash, balance, payment_password FROM users WHERE username = ?').bind(username).first()
      if (!user) return respondError('用户名或密码错误')
      if (!verifyPassword(password, user.password_hash, JWT_SECRET)) return respondError('用户名或密码错误')
      const token = await signJWT({ userId: user.id, username: user.username }, JWT_SECRET)
      return respond({ success: true, token, user: { id: user.id, username: user.username, chat_code: user.chat_code, balance: user.balance, hasPaymentPassword: !!user.payment_password } })
    }

    if (path === '/api/auth/me' && method === 'GET') {
      if (!userId) return respondError('未登录', 401)
      const user = await DB.prepare('SELECT id, username, chat_code, balance, payment_password FROM users WHERE id = ?').bind(userId).first()
      if (!user) return respondError('用户不存在', 404)
      return respond({ user: { id: user.id, username: user.username, chat_code: user.chat_code, balance: user.balance, hasPaymentPassword: !!user.payment_password } })
    }

    if (path === '/api/auth/password' && method === 'PUT') {
      const err = requireAuth()
      if (err) return err
      const body = await req.json()
      const { oldPassword, newPassword } = body
      if (!oldPassword || !newPassword) return respondError('旧密码和新密码不能为空')
      const cur = await DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(userId).first()
      if (!cur) return respondError('用户不存在', 404)
      if (!verifyPassword(oldPassword, cur.password_hash, JWT_SECRET)) return respondError('旧密码错误')
      if (newPassword.length < 4) return respondError('新密码至少4位')
      const newHash = hashPassword(newPassword, JWT_SECRET)
      await DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, userId).run()
      return respond({ success: true })
    }

    if (path === '/api/auth/chat_code' && method === 'PUT') {
      const err = requireAuth()
      if (err) return err
      const body = await req.json()
      const { chat_code } = body
      if (!chat_code || !/^[a-zA-Z0-9]{6,20}$/.test(chat_code)) return respondError('chat号需6-20位字母或数字')
      const existing = await DB.prepare('SELECT id FROM users WHERE chat_code = ? AND id != ?').bind(chat_code, userId).first()
      if (existing) return respondError('该chat号已被使用')
      await DB.prepare('UPDATE users SET chat_code = ? WHERE id = ?').bind(chat_code, userId).run()
      return respond({ success: true })
    }

    if (path.startsWith('/api/users/chat_code/') && method === 'GET') {
      const code = path.split('/').pop()
      const user = await DB.prepare('SELECT id, username, chat_code FROM users WHERE chat_code = ?').bind(code).first()
      if (!user) return respondError('用户不存在', 404)
      return respond({ user: { id: user.id, username: user.username, chat_code: user.chat_code } })
    }

    if (path === '/api/auth/account' && method === 'DELETE') {
      const err = requireAuth()
      if (err) return err
      const body = await req.json()
      const { password } = body
      const cur = await DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(userId).first()
      if (!cur) return respondError('用户不存在', 404)
      if (!password || !verifyPassword(password, cur.password_hash, JWT_SECRET)) return respondError('登录密码错误')
      await DB.prepare('DELETE FROM moment_likes WHERE moment_id IN (SELECT id FROM moments WHERE user_id = ?)').bind(userId).run()
      await DB.prepare('DELETE FROM moments WHERE user_id = ?').bind(userId).run()
      await DB.prepare('DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE user1_id = ? OR user2_id = ?)').bind(userId, userId).run()
      await DB.prepare('DELETE FROM chats WHERE user1_id = ? OR user2_id = ?').bind(userId, userId).run()
      await DB.prepare('DELETE FROM contacts WHERE user_id = ? OR friend_id = ?').bind(userId, userId).run()
      await DB.prepare('DELETE FROM red_packets WHERE sender_id = ? OR receiver_id = ?').bind(userId, userId).run()
      await DB.prepare('DELETE FROM transactions WHERE user_id = ?').bind(userId).run()
      await DB.prepare('DELETE FROM friend_requests WHERE sender_id = ? OR receiver_id = ?').bind(userId, userId).run()
      await DB.prepare('DELETE FROM blocks WHERE blocker_id = ? OR blocked_id = ?').bind(userId, userId).run()
      await DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
      return respond({ success: true })
    }

    // 优化：合并 blocked_ids 查询 + 直接 JOIN 替代嵌套子查询，从 ~50+ reads 降至 ~5 reads
    if (path === '/api/contacts' && method === 'GET') {
      const err = requireAuth()
      if (err) return err
      const blockedIds = (await DB.prepare('SELECT blocked_id FROM blocks WHERE blocker_id = ?').bind(userId).all()).results.map(r => r.blocked_id)
      const contacts = await DB.prepare(`
        SELECT u.id, u.username, ct.created_at, ch.id as chat_id
        FROM contacts ct
        JOIN users u ON ct.friend_id = u.id
        LEFT JOIN chats ch ON (ch.user1_id = ct.user_id AND ch.user2_id = ct.friend_id) OR (ch.user1_id = ct.friend_id AND ch.user2_id = ct.user_id)
        WHERE ct.user_id = ? AND (ct.friend_id NOT IN (:blocked) OR :blocked IS NULL)
        ORDER BY ct.created_at DESC
      `).bind(userId, blockedIds.length > 0 ? blockedIds.join(',') : null).all()
      return respond((contacts.results || []).map(r => ({ id: r.id, username: r.username, chatId: r.chat_id })))
    }

    if (path.startsWith('/api/contacts/') && method === 'DELETE') {
      const err = requireAuth()
      if (err) return err
      const contactId = path.split('/').pop()
      await DB.prepare('DELETE FROM contacts WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').bind(userId, contactId, contactId, userId).run()
      return respond({ success: true })
    }

    if (path.startsWith('/api/contacts/block/') && method === 'POST') {
      const err = requireAuth()
      if (err) return err
      const blockedId = path.split('/').pop()
      await DB.prepare('INSERT OR REPLACE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)').bind(userId, blockedId).run()
      return respond({ success: true })
    }

    if (path.startsWith('/api/contacts/block/') && method === 'DELETE') {
      const err = requireAuth()
      if (err) return err
      const blockedId = path.split('/').pop()
      await DB.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?').bind(userId, blockedId).run()
      return respond({ success: true })
    }

    if (path === '/api/chats' && method === 'GET') {
      const err = requireAuth()
      if (err) return err
      const chats = await DB.prepare(
        `SELECT c.id, c.user1_id, c.user2_id, c.created_at,
               CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END as friend_id
         FROM chats c WHERE c.user1_id = ? OR c.user2_id = ?`
      ).bind(userId, userId, userId).all()
      return respond((chats.results || []).map(c => ({ ...c, friend: c.friend_id })))
    }

    if (path === '/api/chats' && method === 'POST') {
      const err = requireAuth()
      if (err) return err
      const body = await req.json()
      const { friendId } = body
      if (!friendId) return respondError('缺少好友ID')
      const existing = await DB.prepare(
        `SELECT id FROM chats WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`
      ).bind(userId, friendId, friendId, userId).first()
      if (existing) return respond({ chatId: existing.id })
      const id = generateId()
      await DB.prepare('INSERT INTO chats (id, user1_id, user2_id) VALUES (?, ?, ?)').bind(id, userId, friendId).run()
      return respond({ chatId: id })
    }

    if (path.startsWith('/api/chats/') && path.endsWith('/messages') && method === 'GET') {
      const err = requireAuth()
      if (err) return err
      const chatId = path.split('/')[3]
      const msgs = await DB.prepare(
        `SELECT m.*, u.username as sender_name FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.chat_id = ? ORDER BY m.created_at ASC LIMIT 100`
      ).bind(chatId).all()
      return respond({ messages: (msgs.results || []).map(m => ({ ...m, redPacketId: m.packet_id || null, senderUsername: m.sender_name })) })
    }

    if (path.startsWith('/api/chats/') && path.endsWith('/messages') && method === 'POST') {
      const err = requireAuth()
      if (err) return err
      const chatId = path.split('/')[3]
      const body = await req.json()
      const { content, imageUrl } = body
      if (!content && !imageUrl) return respondError('消息内容不能为空')
      const chat = await DB.prepare('SELECT id FROM chats WHERE id = ? AND (user1_id = ? OR user2_id = ?)').bind(chatId, userId, userId).first()
      if (!chat) return respondError('聊天不存在或无权访问', 404)
      const id = generateId()
      await DB.prepare('INSERT INTO messages (id, chat_id, sender_id, content, image_url) VALUES (?, ?, ?, ?, ?)').bind(id, chatId, userId, content || null, imageUrl || null).run()
      return respond({ success: true, id })
    }

    // 优化：outgoing/incoming 合并为一次批量查询
    if (path === '/api/friend-requests' && method === 'GET') {
      const err = requireAuth()
      if (err) return err
      const outgoing = await DB.prepare(
        `SELECT r.id, r.receiver_id, u.username FROM friend_requests r
         JOIN users u ON r.receiver_id = u.id WHERE r.sender_id = ?`
      ).bind(userId).all()
      const incoming = await DB.prepare(
        `SELECT r.id, r.sender_id, u.username FROM friend_requests r
         JOIN users u ON r.sender_id = u.id WHERE r.receiver_id = ?`
      ).bind(userId).all()
      return respond({
        outgoing: (outgoing.results || []),
        incoming: (incoming.results || [])
      })
    }

    if (path === '/api/friend-requests/outgoing' && method === 'GET') {
      const err = requireAuth()
      if (err) return err
      const requests = await DB.prepare(
        `SELECT r.*, u.username FROM friend_requests r
         JOIN users u ON r.receiver_id = u.id
         WHERE r.sender_id = ?`
      ).bind(userId).all()
      return respond(requests.results || [])
    }

    if (path === '/api/friend-requests/incoming' && method === 'GET') {
      const err = requireAuth()
      if (err) return err
      const requests = await DB.prepare(
        `SELECT r.id, r.sender_id, r.receiver_id, u.username AS fromUsername FROM friend_requests r
         JOIN users u ON r.sender_id = u.id
         WHERE r.receiver_id = ?`
      ).bind(userId).all()
      return respond({ ok: true, requests: requests.results || [] })
    }

    // 优化：3次 reads → 2次 reads
    if (path === '/api/friend-requests/send' && method === 'POST') {
      const err = requireAuth()
      if (err) return err
      const body = await req.json()
      const targetUsername = body.targetUsername || body.username
      const targetChatCode = body.targetChatCode || body.chatCode
      let friend
      if (targetUsername) friend = await DB.prepare('SELECT id FROM users WHERE username = ?').bind(targetUsername).first()
      if (!friend && targetChatCode) friend = await DB.prepare('SELECT id FROM users WHERE chat_code = ?').bind(targetChatCode).first()
      if (!friend) return respondError('用户不存在')
      if (friend.id === userId) return respondError('不能添加自己为好友')
      const existing = await DB.prepare('SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ?').bind(userId, friend.id).first()
      if (existing) return respondError('已发送过请求')
      const id = generateId()
      await DB.prepare('INSERT INTO friend_requests (id, sender_id, receiver_id) VALUES (?, ?, ?)').bind(id, userId, friend.id).run()
      return respond({ success: true, id })
    }

    if (path.startsWith('/api/friend-requests/') && path.endsWith('/accept') && method === 'POST') {
      const err = requireAuth()
      if (err) return err
      const requestId = path.split('/')[3]
      const req = await DB.prepare('SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ?').bind(requestId, userId).first()
      if (!req) return respondError('请求不存在', 404)
      await DB.prepare('DELETE FROM contacts WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').bind(userId, req.sender_id, req.sender_id, userId).run()
      await DB.prepare('INSERT INTO contacts (id, user_id, friend_id) VALUES (?, ?, ?)').bind(generateId(), userId, req.sender_id).run()
      await DB.prepare('INSERT INTO contacts (id, user_id, friend_id) VALUES (?, ?, ?)').bind(generateId(), req.sender_id, userId).run()
      const existingChat = await DB.prepare(
        `SELECT id FROM chats WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`
      ).bind(userId, req.sender_id, req.sender_id, userId).first()
      if (!existingChat) {
        const chatId = generateId()
        await DB.prepare('INSERT INTO chats (id, user1_id, user2_id) VALUES (?, ?, ?)').bind(chatId, userId, req.sender_id).run()
      }
      await DB.prepare('DELETE FROM friend_requests WHERE id = ?').bind(requestId).run()
      return respond({ success: true })
    }

    if (path.startsWith('/api/friend-requests/') && path.endsWith('/reject') && method === 'POST') {
      const err = requireAuth()
      if (err) return err
      const requestId = path.split('/')[3]
      const req = await DB.prepare('SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ?').bind(requestId, userId).first()
      if (!req) return respondError('请求不存在', 404)
      await DB.prepare('DELETE FROM friend_requests WHERE id = ?').bind(requestId).run()
      return respond({ success: true })
    }

    if (path === '/api/search/users' && method === 'GET') {
      const err = requireAuth()
      if (err) return err
      const q = url.searchParams.get('q') || ''
      const users = await DB.prepare(
        `SELECT id, username, chat_code, balance FROM users WHERE (username LIKE ? OR chat_code LIKE ?) AND id != ? LIMIT 20`
      ).bind(`%${q}%`, `%${q}%`, userId).all()
      return respond({ ok: true, data: users.results || [] })
    }

    if (path === '/api/contacts/search' && method === 'GET') {
      const err = requireAuth()
      if (err) return err
      const q = url.searchParams.get('q') || ''
      const users = await DB.prepare(
        `SELECT id, username, chat_code, balance FROM users WHERE (username LIKE ? OR chat_code LIKE ?) AND id != ? LIMIT 20`
      ).bind(`%${q}%`, `%${q}%`, userId).all()
      return respond({ ok: true, data: users.results || [] })
    }

    // 优化：moments + likes 合并为一次 JOIN + GROUP BY，从 3 reads → 1 read
    if (path === '/api/moments' && method === 'GET') {
      const result = await DB.prepare(`
        SELECT m.*, u.username, COALESCE(like_cnt.cnt, 0) as like_count
        FROM moments m
        JOIN users u ON m.user_id = u.id
        LEFT JOIN (SELECT moment_id, COUNT(*) as cnt FROM moment_likes GROUP BY moment_id) like_cnt ON like_cnt.moment_id = m.id
        ORDER BY m.created_at DESC LIMIT 50
      `).all()
      return respond({ moments: result.results || [] })
    }

    if (path === '/api/moments' && method === 'POST') {
      const err = requireAuth()
      if (err) return err
      const body = await req.json()
      const { content, images } = body
      const id = generateId()
      await DB.prepare(
        'INSERT INTO moments (id, user_id, content, images) VALUES (?, ?, ?, ?)'
      ).bind(id, userId, content || null, images ? JSON.stringify(images) : null).run()
      return respond({ success: true, id })
    }

    if (path.startsWith('/api/moments/') && path.endsWith('/like') && method === 'POST') {
      const err = requireAuth()
      if (err) return err
      const momentId = path.split('/')[3]
      const existing = await DB.prepare('SELECT id FROM moment_likes WHERE moment_id = ? AND user_id = ?').bind(momentId, userId).first()
      if (existing) {
        await DB.prepare('DELETE FROM moment_likes WHERE moment_id = ? AND user_id = ?').bind(momentId, userId).run()
        await DB.prepare('UPDATE moments SET like_count = MAX(like_count - 1, 0) WHERE id = ?').bind(momentId).run()
        return respond({ liked: false })
      }
      await DB.prepare('INSERT INTO moment_likes (moment_id, user_id) VALUES (?, ?)').bind(momentId, userId).run()
      await DB.prepare('UPDATE moments SET like_count = like_count + 1 WHERE id = ?').bind(momentId).run()
      return respond({ liked: true })
    }

    if (path.startsWith('/api/moments/') && path.match(/\/comments$/) && method === 'GET') {
      const err = requireAuth()
      if (err) return err
      const momentId = path.split('/')[3]
      const comments = await DB.prepare(
        `SELECT c.*, u.username FROM moment_comments c JOIN users u ON c.user_id = u.id WHERE c.moment_id = ? ORDER BY c.created_at ASC`
      ).bind(momentId).all()
      return respond(comments.results || [])
    }

    if (path.startsWith('/api/moments/') && path.match(/\/comments$/) && method === 'POST') {
      const err = requireAuth()
      if (err) return err
      const momentId = path.split('/')[3]
      const body = await req.json()
      const { content } = body
      if (!content) return respondError('评论内容不能为空')
      const id = generateId()
      await DB.prepare('INSERT INTO moment_comments (id, moment_id, user_id, content) VALUES (?, ?, ?, ?)').bind(id, momentId, userId, content).run()
      await DB.prepare('UPDATE moments SET comment_count = comment_count + 1 WHERE id = ?').bind(momentId).run()
      return respond({ success: true, id })
    }

    if (path.startsWith('/api/moments/') && path.endsWith('/delete') && method === 'DELETE') {
      const err = requireAuth()
      if (err) return err
      const momentId = path.split('/')[3]
      const moment = await DB.prepare('SELECT user_id FROM moments WHERE id = ?').bind(momentId).first()
      if (!moment) return respondError('动态不存在', 404)
      if (moment.user_id !== userId) return respondError('无权删除', 403)
      await DB.prepare('DELETE FROM moment_likes WHERE moment_id = ?').bind(momentId).run()
      await DB.prepare('DELETE FROM moment_comments WHERE moment_id = ?').bind(momentId).run()
      await DB.prepare('DELETE FROM moments WHERE id = ?').bind(momentId).run()
      return respond({ success: true })
    }

    if (path === '/api/wallet/balance' && method === 'GET') {
      const err = requireAuth()
      if (err) return err
      const user = await DB.prepare('SELECT balance FROM users WHERE id = ?').bind(userId).first()
      return respond({ balance: user?.balance || 0 })
    }

    if (path === '/api/wallet/set-password' && method === 'POST') {
      const err = requireAuth()
      if (err) return err
      const body = await req.json()
      const { password } = body
      if (!password || !/^\d{6}$/.test(password)) return respondError('支付密码必须为6位数字')
      const hash = hashPassword(password, JWT_SECRET)
      await DB.prepare('UPDATE users SET payment_password = ? WHERE id = ?').bind(hash, userId).run()
      return respond({ success: true })
    }

    if (path === '/api/wallet/password' && method === 'PUT') {
      const err = requireAuth()
      if (err) return err
      const body = await req.json()
      const { oldPassword, newPassword } = body
      if (!oldPassword || !newPassword) return respondError('旧密码和新密码不能为空')
      const user = await DB.prepare('SELECT payment_password FROM users WHERE id = ?').bind(userId).first()
      if (!user || !user.payment_password) return respondError('请先设置支付密码')
      if (!verifyPassword(oldPassword, user.payment_password, JWT_SECRET)) return respondError('旧支付密码错误')
      if (!/^\d{6}$/.test(newPassword)) return respondError('新支付密码必须为6位数字')
      const newHash = hashPassword(newPassword, JWT_SECRET)
      await DB.prepare('UPDATE users SET payment_password = ? WHERE id = ?').bind(newHash, userId).run()
      return respond({ success: true })
    }

    if (path === '/api/wallet/transfer' && method === 'POST') {
      const err = requireAuth()
      if (err) return err
      const body = await req.json()
      const { targetUsername, amount, password } = body
      if (!targetUsername || !amount || !password) return respondError('缺少参数')
      const user = await DB.prepare('SELECT balance, payment_password FROM users WHERE id = ?').bind(userId).first()
      if (!user) return respondError('用户不存在')
      if (!user.payment_password) return respondError('请先设置支付密码')
      if (!(await verifyPassword(password, user.payment_password, JWT_SECRET))) return respondError('支付密码错误')
      const numAmount = parseFloat(amount)
      if (!numAmount || numAmount <= 0) return respondError('金额无效')
      if (user.balance < numAmount) return respondError('余额不足')
      const target = await DB.prepare('SELECT id FROM users WHERE username = ?').bind(targetUsername).first()
      if (!target) return respondError('用户不存在')
      if (target.id === userId) return respondError('不能转给自己')
      await DB.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').bind(numAmount, userId).run()
      await DB.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').bind(numAmount, target.id).run()
      await DB.prepare("INSERT INTO transactions (id, user_id, amount, type, description) VALUES (?, ?, ?, 'send', '转账给 " + targetUsername + "')").bind(generateId(), userId, numAmount).run()
      await DB.prepare("INSERT INTO transactions (id, user_id, amount, type, description) VALUES (?, ?, ?, 'receive', '收到转账')").bind(generateId(), target.id, numAmount).run()
      const updated = await DB.prepare('SELECT balance FROM users WHERE id = ?').bind(userId).first()
      return respond({ success: true, balance: updated.balance })
    }

    if (path === '/api/wallet/redpacket/send' && method === 'POST') {
      const err = requireAuth()
      if (err) return err
      const body = await req.json()
      const { amount, chatId, message, password } = body
      const numAmount = parseFloat(amount)
      if (!numAmount || numAmount <= 0) return respondError('金额必须大于0')
      if (!password) return respondError('请提供支付密码')
      const user = await DB.prepare('SELECT balance, payment_password, username FROM users WHERE id = ?').bind(userId).first()
      if (!user) return respondError('用户不存在')
      if (!user.payment_password) return respondError('请先设置支付密码')
      if (!(await verifyPassword(password, user.payment_password, JWT_SECRET))) return respondError('支付密码错误')
      if (user.balance < numAmount) return respondError('余额不足')
      const id = generateId()
      await DB.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').bind(numAmount, userId).run()
      const chat = await DB.prepare('SELECT user1_id, user2_id FROM chats WHERE id = ?').bind(chatId).first()
      if (!chat) return respondError('聊天不存在')
      const receiverId = chat.user1_id === userId ? chat.user2_id : chat.user1_id
      await DB.prepare('INSERT INTO red_packets (id, sender_id, receiver_id, amount, message, status) VALUES (?, ?, ?, ?, ?, ?)').bind(id, userId, receiverId, numAmount, message || null, 'open').run()
      await DB.prepare("INSERT INTO transactions (id, user_id, amount, type, description) VALUES (?, ?, ?, 'send', '发送红包')").bind(generateId(), userId, numAmount).run()
      const packetContent = `🧧${numAmount.toFixed(2)}¥${message ? '：' + message : ''}`
      const msgId = generateId()
      await DB.prepare('INSERT INTO messages (id, chat_id, sender_id, content, packet_id) VALUES (?, ?, ?, ?, ?)').bind(msgId, chatId, userId, packetContent, id).run()
      return respond({ success: true, packetId: id, messageId: msgId, senderUsername: user.username })
    }

    if (path.startsWith('/api/wallet/redpacket/') && path.endsWith('/claim') && method === 'POST') {
      const err = requireAuth()
      if (err) return err
      const packetId = path.split('/')[4]
      const packet = await DB.prepare('SELECT * FROM red_packets WHERE id = ?').bind(packetId).first()
      if (!packet) return respondError('红包不存在')
      if (packet.status !== 'open') return respondError('红包已被领取')
      if (packet.receiver_id !== userId) return respondError('无权领取')
      await DB.prepare("UPDATE red_packets SET status = 'claimed', claimed_at = datetime('now') WHERE id = ?").bind(packetId).run()
      await DB.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').bind(packet.amount, userId).run()
      await DB.prepare("INSERT INTO transactions (id, user_id, amount, type, description) VALUES (?, ?, ?, 'receive', '收到红包')").bind(generateId(), userId, packet.amount).run()
      return respond({ success: true, amount: packet.amount })
    }

    if (path === '/api/wallet/transactions' && method === 'GET') {
      const err = requireAuth()
      if (err) return err
      const page = parseInt(url.searchParams.get('page')) || 1
      const txs = await DB.prepare(
        'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20 OFFSET ?'
      ).bind(userId, (page - 1) * 20).all()
      return respond({ transactions: txs.results || [] })
    }

    // ── Admin ────────────────────────────────────────
    if (path === '/api/admin/login' && method === 'POST') {
      const { username, password } = await req.json()
      if (!username || !password) return respondError('用户名和密码不能为空')
      const admin = await DB.prepare('SELECT id, password_hash FROM users WHERE username = ?').bind('qiyu').first()
      if (!admin) return respondError('无权访问', 401)
      if (!verifyPassword(password, admin.password_hash, JWT_SECRET)) return respondError('密码错误', 401)
      return respond({ success: true })
    }

    if (path === '/api/admin/stats' && method === 'GET') {
      const totalUsers = (await DB.prepare('SELECT COUNT(*) as cnt FROM users').first())?.cnt || 0
      const totalMessages = (await DB.prepare('SELECT COUNT(*) as cnt FROM messages').first())?.cnt || 0
      const totalTransactions = (await DB.prepare('SELECT COUNT(*) as cnt FROM transactions').first())?.cnt || 0
      const totalBalance = (await DB.prepare('SELECT COALESCE(SUM(balance), 0) as total FROM users').first())?.total || 0
      return respond({ totalUsers, totalMessages, totalTransactions, totalBalance: totalBalance.toFixed(2) })
    }

    if (path === '/api/admin/users' && method === 'GET') {
      const users = await DB.prepare('SELECT id, username, chat_code, balance, payment_password FROM users').all()
      return respond({ users: (users.results || []).map(u => ({
        id: u.id, username: u.username, chat_code: u.chat_code,
        balance: u.balance, hasPaymentPassword: !!u.payment_password
      })) })
    }

    if (path.startsWith('/api/admin/users/') && method === 'DELETE') {
      const uid = path.split('/').pop()
      await DB.prepare('DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE user1_id = ? OR user2_id = ?)').bind(uid, uid).run()
      await DB.prepare('DELETE FROM chats WHERE user1_id = ? OR user2_id = ?').bind(uid, uid).run()
      await DB.prepare('DELETE FROM contacts WHERE user_id = ? OR friend_id = ?').bind(uid, uid).run()
      await DB.prepare('DELETE FROM red_packets WHERE sender_id = ? OR receiver_id = ?').bind(uid, uid).run()
      await DB.prepare('DELETE FROM transactions WHERE user_id = ?').bind(uid).run()
      await DB.prepare('DELETE FROM friend_requests WHERE sender_id = ? OR receiver_id = ?').bind(uid, uid).run()
      await DB.prepare('DELETE FROM moments WHERE user_id = ?').bind(uid).run()
      await DB.prepare('DELETE FROM moment_likes WHERE moment_id IN (SELECT id FROM moments WHERE user_id = ?)').bind(uid).run()
      await DB.prepare('DELETE FROM blocks WHERE blocker_id = ? OR blocked_id = ?').bind(uid, uid).run()
      await DB.prepare('DELETE FROM users WHERE id = ?').bind(uid).run()
      return respond({ success: true })
    }

    if (path.startsWith('/api/admin/users/') && path.endsWith('/balance') && method === 'PUT') {
      const parts = path.split('/')
      const uid = parts[parts.length - 2]
      const { balance } = await req.json()
      const user = await DB.prepare('SELECT id FROM users WHERE id = ?').bind(uid).first()
      if (!user) return respondError('用户不存在', 404)
      await DB.prepare('UPDATE users SET balance = ? WHERE id = ?').bind(parseFloat(balance), uid).run()
      return respond({ success: true, balance: parseFloat(balance) })
    }

    if (path === '/api/admin/transactions' && method === 'GET') {
      const txs = await DB.prepare(
        'SELECT t.*, u.username FROM transactions t LEFT JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC'
      ).all()
      return respond({ transactions: txs.results || [] })
    }

    if (path === '/api/admin/chats' && method === 'GET') {
      const chats = await DB.prepare('SELECT id, user1_id, user2_id FROM chats').all()
      return respond({ chats: (chats.results || []).map(c => ({
        chatId: c.id, user1: c.user1_id, user2: c.user2_id, messageCount: 0
      })) })
    }

    if (path.startsWith('/api/chats/') && path.endsWith('/clear') && method === 'DELETE') {
      const err = requireAuth()
      if (err) return err
      const chatId = path.split('/')[3]
      const chat = await DB.prepare('SELECT id FROM chats WHERE id = ? AND (user1_id = ? OR user2_id = ?)').bind(chatId, userId, userId).first()
      if (!chat) return respondError('聊天不存在或无权操作', 404)
      await DB.prepare('DELETE FROM messages WHERE chat_id = ?').bind(chatId).run()
      return respond({ success: true })
    }

    if (path.startsWith('/api/admin/messages/') && method === 'DELETE') {
      const chatId = path.split('/').pop()
      await DB.prepare('DELETE FROM messages WHERE chat_id = ?').bind(chatId).run()
      return respond({ success: true })
    }

    return respondError('Not Found', 404)
  }

  return respondError('Not Found', 404)
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      })
    }

    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    try {
      const response = await handleRequest(request, env)
      return response
    } catch (e) {
      console.error('Server error:', e)
      return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }
  }
}
