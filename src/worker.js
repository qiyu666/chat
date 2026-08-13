const SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  balance REAL DEFAULT 100.00,
  avatar TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  payment_password TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (friend_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user1_id TEXT NOT NULL,
  user2_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chat_id) REFERENCES chats(id)
);

CREATE TABLE IF NOT EXISTS moments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT,
  images TEXT,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS moment_likes (
  moment_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (moment_id, user_id)
);

CREATE TABLE IF NOT EXISTS red_packets (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT,
  amount REAL NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'open',
  claimed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  related_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`

const encoder = new TextEncoder()

function generateId() {
  return crypto.randomUUID()
}

function hashPassword(password, secret) {
  const data = encoder.encode(password + secret + '_salt')
  return btoa(String.fromCharCode(...data))
}

async function verifyPassword(password, hash, secret) {
  return hashPassword(password, secret) === hash
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
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, payloadB64, sig] = parts
    const payload = JSON.parse(atob(payloadB64))
    const sigInput = encoder.encode(header + '.' + payloadB64 + '.' + secret)
    const hashBuffer = await crypto.subtle.digest('SHA-256', sigInput)
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    if (sig !== expectedSig) return null
    return payload
  } catch (e) {
    return null
  }
}

async function handleRequest(req, env) {
  const url = new URL(req.url)
  const path = url.pathname
  const method = req.method
  const JWT_SECRET = env.JWT_SECRET

  const authHeader = req.headers.get('Authorization') || ''
  let userId = null
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const payload = await verifyJWT(token, JWT_SECRET)
    if (payload) userId = payload.userId
  }

  const respond = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  const respondError = (message, status = 400) =>
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  const requireAuth = () => {
    if (!userId) return respondError('未登录', 401)
    return null
  }

  if (path === '/auth/register' && method === 'POST') {
    const body = await req.json()
    const { username, password } = body
    if (!username || !password) return respondError('用户名和密码不能为空')
    if (username.length < 2) return respondError('用户名至少2个字符')
    if (password.length < 4) return respondError('密码至少4个字符')

    const existing = await DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    if (existing) return respondError('用户名已存在')

    const id = generateId()
    const hash = hashPassword(password, JWT_SECRET)
    await DB.prepare('INSERT INTO users (id, username, password_hash, balance) VALUES (?, ?, ?, 100.00)').bind(id, username, hash).run()
    await DB.prepare("INSERT INTO transactions (id, user_id, amount, type, description) VALUES (?, ?, 100.00, 'receive', '注册赠送')").bind(generateId(), id).run()

    const token = await signJWT({ userId: id, username }, JWT_SECRET)
    return respond({ token, user: { id, username, balance: 100.00 } })
  }

  if (path === '/auth/login' && method === 'POST') {
    const body = await req.json()
    const { username, password } = body
    if (!username || !password) return respondError('用户名和密码不能为空')

    const user = await DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first()
    if (!user) return respondError('用户不存在')
    if (!await verifyPassword(password, user.password_hash, JWT_SECRET)) return respondError('密码错误')

    const token = await signJWT({ userId: user.id, username: user.username }, JWT_SECRET)
    return respond({
      token,
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        hasPaymentPassword: !!user.payment_password
      }
    })
  }

  if (path === '/auth/me' && method === 'GET') {
    const err = requireAuth()
    if (err) return err
    const user = await DB.prepare('SELECT id, username, balance, created_at, payment_password FROM users WHERE id = ?').bind(userId).first()
    if (!user) return respondError('用户不存在', 404)
    return respond({ user: { id: user.id, username: user.username, balance: user.balance, hasPaymentPassword: !!user.payment_password } })
  }

  if (path === '/contacts' && method === 'GET') {
    const err = requireAuth()
    if (err) return err
    const friends = await DB.prepare(`
      SELECT u.id, u.username, u.balance, u.created_at,
             (SELECT content FROM messages m JOIN chats c ON m.chat_id = c.id
              WHERE (c.user1_id = ? OR c.user2_id = ?) AND m.sender_id != ?
              ORDER BY m.created_at DESC LIMIT 1) as last_message,
             (SELECT COUNT(*) FROM messages m JOIN chats c ON m.chat_id = c.id
              WHERE (c.user1_id = ? OR c.user2_id = ?) AND m.sender_id != ? AND m.created_at > c.created_at) as unread
      FROM contacts c
      JOIN users u ON (c.friend_id = u.id AND c.user_id = ?) OR (c.user_id = u.id AND c.friend_id = ?)
      ORDER BY c.created_at DESC
    `).bind(userId, userId, userId, userId, userId, userId, userId, userId).all()

    const contacts = (friends.results || []).map(r => ({
      id: r.username,
      username: r.username,
      userId: r.id,
      lastMessage: r.last_message,
      unread: r.unread || 0
    }))
    return respond({ contacts })
  }

  if (path === '/contacts/search' && method === 'GET') {
    const err = requireAuth()
    if (err) return err
    const q = url.searchParams.get('q') || ''
    const users = await DB.prepare(
      'SELECT id, username FROM users WHERE username LIKE ? AND id != ? LIMIT 10'
    ).bind(`%${q}%`, userId).all()
    return respond({ users: (users.results || []).map(u => ({ id: u.id, username: u.username })) })
  }

  if (path === '/contacts/add' && method === 'POST') {
    const err = requireAuth()
    if (err) return err
    const body = await req.json()
    const { username } = body
    if (!username) return respondError('请输入用户名')
    const friend = await DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    if (!friend) return respondError('用户不存在')
    if (friend.id === userId) return respondError('不能添加自己')
    const already = await DB.prepare(
      'SELECT id FROM contacts WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)'
    ).bind(userId, friend.id, friend.id, userId).first()
    if (already) return respondError('已经是好友')
    const id = generateId()
    await DB.prepare('INSERT INTO contacts (id, user_id, friend_id) VALUES (?, ?, ?)').bind(id, userId, friend.id).run()
    await DB.prepare('INSERT INTO contacts (id, user_id, friend_id) VALUES (?, ?, ?)').bind(generateId(), friend.id, userId).run()
    return respond({ success: true })
  }

  if (path === '/messages/create' && method === 'POST') {
    const err = requireAuth()
    if (err) return err
    const body = await req.json()
    const { contactId } = body
    const existing = await DB.prepare(
      'SELECT id FROM chats WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)'
    ).bind(userId, contactId, contactId, userId).first()
    if (existing) return respond({ chatId: existing.id })
    const id = generateId()
    await DB.prepare('INSERT INTO chats (id, user1_id, user2_id) VALUES (?, ?, ?)').bind(id, userId, contactId).run()
    return respond({ chatId: id })
  }

  if (path.startsWith('/messages/:chatId') && method === 'GET') {
    const err = requireAuth()
    if (err) return err
    const chatId = path.split('/')[2]
    const msgs = await DB.prepare(
      'SELECT m.*, u.username as sender_username, u.id as sender_id FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.chat_id = ? ORDER BY m.created_at ASC'
    ).bind(chatId).all()
    const contactInfo = await DB.prepare(
      'SELECT user1_id, user2_id FROM chats WHERE id = ?'
    ).bind(chatId).first()
    const otherId = contactInfo?.user1_id === userId ? contactInfo?.user2_id : contactInfo?.user1_id
    const otherUser = await DB.prepare('SELECT username FROM users WHERE id = ?').bind(otherId).first()
    return respond({ messages: (msgs.results || []).map(m => ({
      id: m.id,
      content: m.content,
      isSelf: m.sender_id === userId,
      senderUsername: m.sender_username,
      senderAvatar: m.sender_username?.[0]?.toUpperCase() || '?',
      createdAt: m.created_at
    })), contact: otherUser ? { id: otherId, username: otherUser.username } : null })
  }

  if (path.startsWith('/messages/') && path.endsWith('/send') && method === 'POST') {
    const err = requireAuth()
    if (err) return err
    const chatId = path.split('/')[2]
    const body = await req.json()
    const { content, imageUrl } = body
    if (!content) return respondError('消息内容不能为空')
    const id = generateId()
    await DB.prepare('INSERT INTO messages (id, chat_id, sender_id, content, image_url) VALUES (?, ?, ?, ?, ?)').bind(id, chatId, userId, content, imageUrl || null).run()
    return respond({ success: true })
  }

  if (path === '/moments' && method === 'GET') {
    const err = requireAuth()
    if (err) return err
    const moments = await DB.prepare(`
      SELECT m.*, u.username,
             (SELECT COUNT(*) FROM moment_likes ml WHERE ml.moment_id = m.id) as like_count,
             (SELECT COUNT(*) FROM moment_likes ml WHERE ml.moment_id = m.id AND ml.user_id = ?) as my_like
      FROM moments m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `).bind(userId).all()
    const result = (moments.results || []).map(m => ({
      id: m.id,
      username: m.username,
      content: m.content,
      images: m.images ? JSON.parse(m.images) : [],
      likes: m.like_count,
      liked: m.my_like === 1,
      comments: 0,
      isMy: m.user_id === userId,
      createdAt: m.created_at
    }))
    return respond({ moments: result })
  }

  if (path === '/moments' && method === 'POST') {
    const err = requireAuth()
    if (err) return err
    const body = await req.json()
    const { content, imageUrls = [] } = body
    const id = generateId()
    await DB.prepare('INSERT INTO moments (id, user_id, content, images) VALUES (?, ?, ?, ?)').bind(
      id, userId, content || null, imageUrls.length > 0 ? JSON.stringify(imageUrls) : null
    ).run()
    return respond({ success: true, id })
  }

  if (path.startsWith('/moments/') && path.endsWith('/like') && method === 'POST') {
    const err = requireAuth()
    if (err) return err
    const momentId = path.split('/')[2]
    const existing = await DB.prepare('SELECT id FROM moment_likes WHERE moment_id = ? AND user_id = ?').bind(momentId, userId).first()
    if (existing) {
      await DB.prepare('DELETE FROM moment_likes WHERE moment_id = ? AND user_id = ?').bind(momentId, userId).run()
      await DB.prepare("UPDATE moments SET like_count = like_count - 1 WHERE id = ?").bind(momentId).run()
    } else {
      await DB.prepare('INSERT INTO moment_likes (moment_id, user_id) VALUES (?, ?)').bind(momentId, userId).run()
      await DB.prepare("UPDATE moments SET like_count = like_count + 1 WHERE id = ?").bind(momentId).run()
    }
    return respond({ success: true })
  }

  if (path.startsWith('/moments/') && method === 'DELETE') {
    const err = requireAuth()
    if (err) return err
    const momentId = path.split('/')[2]
    const moment = await DB.prepare('SELECT user_id FROM moments WHERE id = ?').bind(momentId).first()
    if (!moment) return respondError('动态不存在', 404)
    if (moment.user_id !== userId) return respondError('无权删除', 403)
    await DB.prepare('DELETE FROM moments WHERE id = ?').bind(momentId).run()
    return respond({ success: true })
  }

  if (path === '/wallet/balance' && method === 'GET') {
    const err = requireAuth()
    if (err) return err
    const user = await DB.prepare('SELECT balance FROM users WHERE id = ?').bind(userId).first()
    return respond({ balance: user?.balance || 0 })
  }

  if (path === '/wallet/set-password' && method === 'POST') {
    const err = requireAuth()
    if (err) return err
    const body = await req.json()
    const { password } = body
    if (!password || !/^\d{6}$/.test(password)) return respondError('支付密码必须为6位数字')
    const hash = hashPassword(password, JWT_SECRET)
    await DB.prepare('UPDATE users SET payment_password = ? WHERE id = ?').bind(hash, userId).run()
    return respond({ success: true })
  }

  if (path === '/wallet/transfer' && method === 'POST') {
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

  if (path === '/wallet/redpacket/send' && method === 'POST') {
    const err = requireAuth()
    if (err) return err
    const body = await req.json()
    const { amount, chatId, message, password } = body
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) return respondError('金额必须大于0')
    if (!password) return respondError('请提供支付密码')
    const user = await DB.prepare('SELECT balance, payment_password FROM users WHERE id = ?').bind(userId).first()
    if (!user) return respondError('用户不存在')
    if (!user.payment_password) return respondError('请先设置支付密码')
    if (!(await verifyPassword(password, user.payment_password, JWT_SECRET))) return respondError('支付密码错误')
    if (user.balance < numAmount) return respondError('余额不足')
    const id = generateId()
    await DB.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').bind(numAmount, userId).run()
    const chat = await DB.prepare('SELECT user1_id, user2_id FROM chats WHERE id = ?').bind(chatId).first()
    if (!chat) return respondError('聊天不存在')
    const receiverId = chat.user1_id === userId ? chat.user2_id : chat.user1_id
    await DB.prepare('INSERT INTO red_packets (id, sender_id, receiver_id, amount, message, status) VALUES (?, ?, ?, ?, ?, ?)').bind(
      id, userId, receiverId, numAmount, message || null, 'open'
    ).run()
    await DB.prepare("INSERT INTO transactions (id, user_id, amount, type, description) VALUES (?, ?, ?, 'send', '发送红包')").bind(generateId(), userId, numAmount).run()
    return respond({ success: true, packetId: id })
  }

  if (path.startsWith('/wallet/redpacket/') && path.endsWith('/claim') && method === 'POST') {
    const err = requireAuth()
    if (err) return err
    const packetId = path.split('/')[3]
    const packet = await DB.prepare('SELECT * FROM red_packets WHERE id = ?').bind(packetId).first()
    if (!packet) return respondError('红包不存在')
    if (packet.status !== 'open') return respondError('红包已被领取')
    if (packet.receiver_id !== userId) return respondError('无权领取')
    await DB.prepare("UPDATE red_packets SET status = 'claimed', claimed_at = datetime('now') WHERE id = ?").bind(packetId).run()
    await DB.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').bind(packet.amount, userId).run()
    await DB.prepare("INSERT INTO transactions (id, user_id, amount, type, description) VALUES (?, ?, ?, 'receive', '收到红包')").bind(generateId(), userId, packet.amount).run()
    return respond({ success: true, amount: packet.amount })
  }

  if (path === '/wallet/transactions' && method === 'GET') {
    const err = requireAuth()
    if (err) return err
    const page = parseInt(url.searchParams.get('page')) || 1
    const txs = await DB.prepare(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20 OFFSET ?'
    ).bind(userId, (page - 1) * 20).all()
    return respond({ transactions: (txs.results || []) })
  }

  return respondError('Not Found', 404)
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
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
