import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const IMGBB_KEY = 'a3c4d52586dedcc730da4af027c12ebf'
const PASSWORD_SECRET = 'chat-mock-dev-secret'

function hashPassword(password) {
  return Buffer.from(password + PASSWORD_SECRET + '_salt').toString('base64')
}

function verifyPassword(password, storedHash) {
  return hashPassword(password) === storedHash
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, 'data.json')

const app = express()
app.use(express.json({ limit: '10mb' }))
app.use(cors())

// ── 持久化 ──────────────────────────────────────────
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    } catch (e) {}
  }
  return { users: {}, contacts: {}, messages: {}, moments: {}, redPackets: {}, transactions: {}, friendRequests: {}, blocks: {} }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

let store = loadData()
if (!store.blocks) store.blocks = {}

function persist() {
  saveData(store)
}

// ── 工具函数 ────────────────────────────────────────
function genId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2)
}

function generateChatCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let code = 'chat_'
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

function getAuth(req) {
  const auth = req.headers.authorization || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return null
}

function getUserFromToken(token) {
  if (!token) return null
  return Object.values(store.users).find(u => u._token === token) || null
}

function getChatId(id1, id2) {
  return id1 < id2 ? `${id1}||${id2}` : `${id2}||${id1}`
}

// ── 清理过期红包（24小时未领取自动退还）────────────
function expireRedPackets() {
  const now = Date.now()
  for (const [id, pkt] of Object.entries(store.redPackets)) {
    if (pkt.status === 'open' && now - new Date(pkt.created_at).getTime() > 24 * 60 * 60 * 1000) {
      // 自动退还
      const sender = store.users[pkt.sender_id]
      if (sender) sender.balance += pkt.amount
      pkt.status = 'expired'
      const txId = genId()
      store.transactions[txId] = { id: txId, user_id: pkt.sender_id, amount: pkt.amount, type: 'refund', description: '红包24小时未领取已退还', created_at: new Date().toISOString() }
      persist()
    }
  }
}

// ── Auth ────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  const { username, password, chat_code } = req.body
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' })
  if (Object.values(store.users).some(u => u.username === username)) return res.status(400).json({ error: '用户名已被占用，请换个用户名' })
  let finalChatCode = (chat_code || '').trim()
  if (finalChatCode) {
    if (!/^[a-zA-Z0-9]{6,20}$/.test(finalChatCode)) return res.status(400).json({ error: 'chat号需6-20位字母或数字' })
    const codeExists = Object.values(store.users).find(u => u.chat_code === finalChatCode)
    if (codeExists) return res.status(400).json({ error: '该chat号已被使用' })
  } else {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    finalChatCode = 'chat_' + Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('')
  }
  const id = genId()
  const user = { id, username, chat_code: finalChatCode, password: hashPassword(password), balance: 100.00, paymentPassword: null, _token: genId() }
  store.users[id] = user
  store.users[id].username = username
  delete store.users[username]
  const txId = genId()
  store.transactions[txId] = { id: txId, user_id: id, amount: 100, type: 'receive', description: '注册赠送', created_at: new Date().toISOString() }
  persist()
  res.json({ token: user._token, user: { id: user.id, username: user.username, chat_code: user.chat_code, balance: user.balance, hasPaymentPassword: !!user.paymentPassword } })
})

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body
  const user = Object.values(store.users).find(u => u.username === username)
  if (!user || !verifyPassword(password, user.password)) return res.status(401).json({ error: '用户名或密码错误' })
  res.json({ token: user._token, user: { id: user.id, username: user.username, chat_code: user.chat_code, balance: user.balance, hasPaymentPassword: !!user.paymentPassword } })
})

app.get('/api/auth/me', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  res.json({ user: { id: user.id, username: user.username, chat_code: user.chat_code, balance: user.balance, hasPaymentPassword: !!user.paymentPassword } })
})

// PUT /api/auth/password — 修改登录密码
app.put('/api/auth/password', express.json({ limit: '1mb' }), (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const { oldPassword, newPassword } = req.body
  if (!oldPassword || !newPassword) return res.status(400).json({ error: '旧密码和新密码不能为空' })
  if (!verifyPassword(oldPassword, user.password)) return res.status(400).json({ error: '旧密码错误' })
  if (newPassword.length < 4) return res.status(400).json({ error: '新密码至少4位' })
  user.password = hashPassword(newPassword)
  user._token = genId() // 重置 token，需重新登录
  persist()
  res.json({ success: true, token: user._token })
})

// PUT /api/auth/chat_code — 修改chat号
app.put('/api/auth/chat_code', express.json({ limit: '1mb' }), (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const { chat_code } = req.body
  if (!chat_code || !/^[a-zA-Z0-9]{6,20}$/.test(chat_code)) return res.status(400).json({ error: 'chat号需6-20位字母或数字' })
  const existing = Object.values(store.users).find(u => u.chat_code === chat_code && u.id !== user.id)
  if (existing) return res.status(400).json({ error: '该chat号已被使用' })
  user.chat_code = chat_code
  persist()
  res.json({ success: true })
})

// GET /api/users/chat_code/:code — 通过chat号查找用户
app.get(/^\/api\/users\/chat_code\/(.+)/, (req, res) => {
  const code = req.params[0]
  const user = Object.values(store.users).find(u => u.chat_code === code)
  if (!user) return res.json({ user: null })
  res.json({ user: { id: user.id, username: user.username, chat_code: user.chat_code } })
})

// DELETE /api/auth/account — 注销账号
app.delete('/api/auth/account', express.json({ limit: '1mb' }), (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const { password } = req.body
  if (!password || !verifyPassword(password, user.password)) return res.status(400).json({ error: '登录密码错误' })

  const userId = user.id
  const username = user.username

  // 1. 清理联系人：从所有好友的联系人列表移除自己
  const friendIds = store.contacts[userId] || []
  friendIds.forEach(fid => {
    if (store.contacts[fid]) {
      store.contacts[fid] = store.contacts[fid].filter(id => id !== userId)
    }
  })
  delete store.contacts[userId]

  // 2. 清理聊天记录：所有包含自己的 chat
  Object.keys(store.messages).forEach(chatId => {
    if (chatId.includes(userId)) delete store.messages[chatId]
  })

  // 3. 清理好友请求
  Object.values(store.friendRequests).forEach(reqList => {
    store.friendRequests[reqList.userId] = (reqList.requests || []).filter(r =>
      r.fromUserId !== userId && r.toUserId !== userId
    )
  })

  // 4. 清理钱包交易
  Object.keys(store.transactions).forEach(tid => {
    if (store.transactions[tid].user_id === userId) delete store.transactions[tid]
  })

  // 5. 清理红包：发送或接收的红包
  Object.keys(store.redpackets).forEach(rpid => {
    const rp = store.redpackets[rpid]
    if (rp.sender_id === userId || rp.receiver_id === userId) delete store.redpackets[rpid]
  })

  // 6. 删除用户（按 id 和 username 双保险删除）
  delete store.users[userId]
  if (store.users[username]) delete store.users[username]

  persist()
  res.json({ success: true })
})

// POST /api/wallet/set-password — 设置/修改支付密码（新用户首次设置6位数密码）
app.post('/api/wallet/set-password', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const { password } = req.body
  if (!password || !/^\d{6}$/.test(password)) return res.status(400).json({ error: '支付密码必须为6位数字' })
  user.paymentPassword = password
  persist()
  res.json({ success: true })
})

// PUT /api/wallet/password — 修改支付密码（需验证旧密码）
app.put('/api/wallet/password', express.json({ limit: '1mb' }), (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  if (!user.paymentPassword) return res.status(400).json({ error: '请先设置支付密码' })
  const { oldPassword, newPassword } = req.body
  if (!oldPassword || !newPassword) return res.status(400).json({ error: '旧密码和新密码不能为空' })
  if (!verifyPassword(oldPassword, user.paymentPassword)) return res.status(400).json({ error: '旧支付密码错误' })
  if (!/^\d{6}$/.test(newPassword)) return res.status(400).json({ error: '新支付密码必须为6位数字' })
  user.paymentPassword = hashPassword(newPassword)
  persist()
  res.json({ success: true })
})

// POST /api/wallet/transfer — 用户间转账（需验证支付密码）
app.post('/api/wallet/transfer', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  if (!user.paymentPassword) return res.status(400).json({ error: '请先设置支付密码' })
  const { targetUsername, amount, password } = req.body
  if (!targetUsername || !amount || !password) return res.status(400).json({ error: '缺少参数' })
  if (!/^\d{6}$/.test(password)) return res.status(400).json({ error: '支付密码错误' })
  if (!verifyPassword(password, user.paymentPassword)) return res.status(400).json({ error: '支付密码错误' })
  const numAmount = parseFloat(amount)
  if (!numAmount || numAmount <= 0) return res.status(400).json({ error: '金额必须大于0' })
  if (numAmount > 99999) return res.status(400).json({ error: '单笔转账不得超过99999元' })
  const target = Object.values(store.users).find(u => u.username === targetUsername)
  if (!target) return res.status(404).json({ error: '收款用户不存在' })
  if (target.id === user.id) return res.status(400).json({ error: '不能转给自己' })
  if (user.balance < numAmount) return res.status(400).json({ error: '余额不足' })

  expireRedPackets()
  persist()

  user.balance -= numAmount
  target.balance += numAmount
  const txId = genId()
  store.transactions[txId] = { id: txId, user_id: user.id, amount: numAmount, type: 'transfer_out', description: `转账给 ${targetUsername}`, created_at: new Date().toISOString() }
  const txId2 = genId()
  store.transactions[txId2] = { id: txId2, user_id: target.id, amount: numAmount, type: 'transfer_in', description: `收到 ${user.username} 转账`, created_at: new Date().toISOString() }
  persist()
  res.json({ success: true, balance: user.balance })
})

// ── Friend Requests ────────────────────────────────
// POST /api/friend-requests/send  { targetUsername }
// GET  /api/friend-requests/incoming
// POST /api/friend-requests/:reqId/accept
// POST /api/friend-requests/:reqId/reject

app.post('/api/friend-requests/send', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const { targetUsername, targetChatCode } = req.body
  let target = Object.values(store.users).find(u => u.username === targetUsername)
  if (!target) target = Object.values(store.users).find(u => u.chat_code === targetChatCode)
  if (!target) return res.status(401).json({ error: '用户不存在' })
  if (target.id === user.id) return res.status(400).json({ error: '不能添加自己' })

  // 已经是好友则直接返回成功
  const userFriends = store.contacts[user.id] || []
  if (userFriends.includes(target.id)) return res.json({ success: true, alreadyFriend: true })

  const reqId = genId()
  const friendReq = { id: reqId, fromId: user.id, toId: target.id, status: 'pending', created_at: new Date().toISOString() }
  const key = `req_${target.id}`
  store.friendRequests[key] = store.friendRequests[key] || []
  store.friendRequests[key].push(friendReq)
  persist()
  res.json({ success: true, reqId })
})

app.get('/api/friend-requests/incoming', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const key = `req_${user.id}`
  const list = (store.friendRequests[key] || [])
    .filter(r => r.status === 'pending')
    .map(r => {
      const fromUser = store.users[r.fromId]
      return { ...r, fromUsername: fromUser?.username }
    })
  res.json({ requests: list })
})

app.post('/api/friend-requests/:reqId/accept', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const reqId = req.params.reqId
  const key = `req_${user.id}`
  const list = store.friendRequests[key] || []
  const friendReq = list.find(r => r.id === reqId && r.status === 'pending')
  if (!friendReq) return res.status(404).json({ error: '请求不存在' })
  friendReq.status = 'accepted'
  // 互加好友
  if (!store.contacts[user.id]) store.contacts[user.id] = []
  if (!store.contacts[user.id].includes(friendReq.fromId)) store.contacts[user.id].push(friendReq.fromId)
  if (!store.contacts[friendReq.fromId]) store.contacts[friendReq.fromId] = []
  if (!store.contacts[friendReq.fromId].includes(user.id)) store.contacts[friendReq.fromId].push(user.id)
  persist()
  res.json({ success: true })
})

app.post('/api/friend-requests/:reqId/reject', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const reqId = req.params.reqId
  const key = `req_${user.id}`
  const list = store.friendRequests[key] || []
  const idx = list.findIndex(r => r.id === reqId && r.status === 'pending')
  if (idx === -1) return res.status(404).json({ error: '请求不存在' })
  list[idx].status = 'rejected'
  persist()
  res.json({ success: true })
})

// ── Contacts ───────────────────────────────────────
app.get('/api/contacts', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const blockedIds = new Set(store.blocks[user.id] || [])
  const friendIds = store.contacts[user.id] || []
  const friends = friendIds.filter(fid => !blockedIds.has(fid)).map(fid => {
    const f = store.users[fid]
    const chatId = f ? getChatId(user.id, f.id) : null
    const allMsgs = store.messages[chatId] || []
    const lastMsg = allMsgs[allMsgs.length - 1]
    const unread = allMsgs.filter(m => m.sender_id !== user.id && !m._read).length
    return f ? { id: f.id, username: f.username, lastMessage: lastMsg?.content || '', unread, chatId } : null
  }).filter(Boolean)
  expireRedPackets()
  persist()
  res.json({ contacts: friends })
})

// DELETE /api/contacts/:id — 删除好友
app.delete('/api/contacts/:id', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const { id } = req.params
  console.log('[DELETE contact] user:', user.id, 'target:', id, 'before:', store.contacts[user.id])
  if (store.contacts[user.id]) store.contacts[user.id] = store.contacts[user.id].filter(fid => fid !== id)
  if (store.contacts[id]) store.contacts[id] = store.contacts[id].filter(fid => fid !== user.id)
  console.log('[DELETE contact] after:', store.contacts[user.id])
  persist()
  res.json({ success: true })
})

// POST /api/contacts/block/:id — 拉黑
app.post('/api/contacts/block/:id', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const { id } = req.params
  if (!store.blocks[user.id]) store.blocks[user.id] = []
  if (!store.blocks[user.id].includes(id)) store.blocks[user.id].push(id)
  persist()
  res.json({ success: true })
})

// DELETE /api/contacts/block/:id — 解除拉黑
app.delete('/api/contacts/block/:id', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const { id } = req.params
  if (store.blocks[user.id]) {
    store.blocks[user.id] = store.blocks[user.id].filter(bid => bid !== id)
    persist()
  }
  res.json({ success: true })
})

app.get('/api/contacts/search', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const q = req.query.q || ''
  const results = Object.values(store.users)
    .filter(u => (u.username.includes(q) || u.chat_code?.includes(q)) && u.id !== user.id)
    .map(u => ({ id: u.id, username: u.username, chat_code: u.chat_code }))
  res.json({ users: results })
})

// POST /api/contacts/add — 发送好友请求（旧接口保留兼容）
app.post('/api/contacts/add', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const { username } = req.body
  const friend = Object.values(store.users).find(u => u.username === username)
  if (!friend) return res.status(401).json({ error: '用户不存在' })
  if (friend.id === user.id) return res.status(400).json({ error: '不能添加自己' })
  const userFriends = store.contacts[user.id] || []
  if (userFriends.includes(friend.id)) return res.status(400).json({ error: '已经是好友' })
  // 直接加好友（兼容旧逻辑），也发送请求
  const reqId = genId()
  const friendReq = { id: reqId, fromId: user.id, toId: friend.id, status: 'pending', created_at: new Date().toISOString() }
  const key = `req_${friend.id}`
  store.friendRequests[key] = store.friendRequests[key] || []
  store.friendRequests[key].push(friendReq)
  persist()
  res.json({ success: true, reqId })
})

// ── Messages ───────────────────────────────────────
// 路由与 worker.js / api.js 保持一致: GET /api/chats/:chatId/messages, POST /api/chats/:chatId/messages
app.get('/api/chats/:chatId/messages', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const chatId = req.params.chatId
  const parts = chatId.split('||')
  if (!parts.includes(user.id)) {
    return res.json({ error: '无权访问此聊天', messages: [], contact: null })
  }
  const msgs = store.messages[chatId] || []
  const otherId = parts.find(p => p !== user.id)
  const otherUser = store.users[otherId]
  // 标记对方消息为已读
  msgs.forEach(m => {
    if (m.sender_id !== user.id) m._read = true
  })
  persist()
  res.json({
    messages: msgs.map(m => {
      // 兼容老格式红包消息（没有 _redPacketId 的旧数据）
      const existingId = m._redPacketId
      const legacyId = existingId || (m.content.startsWith('🧧') && m.content.includes('红包')
        ? 'legacy_' + m.id.slice(0, 8)
        : null)
      return {
        id: m.id,
        chat_id: m.chat_id,
        sender_id: m.sender_id,
        content: m.content,
        created_at: m.created_at,
        senderUsername: m.senderUsername,
        _redPacketId: legacyId || null,
        _claimed: m._claimed || false
      }
    }),
    contact: otherUser ? { id: otherUser.id, username: otherUser.username } : null
  })
})

app.post('/api/chats/:chatId/messages', express.json({ limit: '5mb' }), (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const chatId = req.params.chatId
  const parts = chatId.split('||')
  if (!parts.includes(user.id)) return res.status(403).json({ error: '无权发送消息' })
  const { content, imageUrl } = req.body
  const finalContent = content || imageUrl
  if (!finalContent) return res.status(400).json({ error: '消息内容不能为空' })
  if (!store.messages[chatId]) store.messages[chatId] = []
  const msg = {
    id: genId(),
    chat_id: chatId,
    sender_id: user.id,
    senderUsername: user.username,
    content: finalContent,
    created_at: new Date().toISOString(),
    _read: false
  }
  store.messages[chatId].push(msg)
  persist()
  res.json({ success: true, message: msg })
})

// ── Moments ────────────────────────────────────────
app.get('/api/moments', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const list = Object.values(store.moments)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  res.json({ moments: list })
})

app.post('/api/moments', express.json({ limit: '5mb' }), (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const { content, imageUrls = [] } = req.body
  const id = genId()
  const moment = {
    id,
    user_id: user.id,
    username: user.username,
    content,
    images: imageUrls,
    likes: 0,
    liked: false,
    comments: 0,
    isMy: true,
    created_at: new Date().toISOString()
  }
  store.moments[id] = moment
  persist()
  res.json({ success: true, id })
})

app.post('/api/moments/:id/like', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const id = req.params.id
  const moment = store.moments[id]
  if (!moment) return res.status(404).json({ error: '动态不存在' })
  moment.liked = !moment.liked
  moment.likes = (moment.likes || 0) + (moment.liked ? 1 : -1)
  persist()
  res.json({ success: true })
})

app.delete('/api/moments/:id', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const id = req.params.id
  const moment = store.moments[id]
  if (!moment) return res.status(404).json({ error: '动态不存在' })
  if (moment.user_id !== user.id) return res.status(403).json({ error: '无权删除' })
  delete store.moments[id]
  persist()
  res.json({ success: true })
})

app.delete('/api/messages/chat/:chatId', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const chatId = req.params.chatId
  if (store.messages[chatId]) {
    store.messages[chatId] = []
    persist()
  }
  res.json({ success: true })
})

app.delete('/api/messages/:id', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const msgId = req.params.id
  for (const chatId of Object.keys(store.messages)) {
    const idx = store.messages[chatId].findIndex(m => m.id === msgId)
    if (idx !== -1) {
      store.messages[chatId].splice(idx, 1)
      persist()
      return res.json({ success: true })
    }
  }
  res.status(404).json({ error: '消息不存在' })
})

// ── Wallet ─────────────────────────────────────────
app.get('/api/wallet/balance', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  expireRedPackets()
  persist()
  res.json({ balance: user.balance })
})

// POST /api/wallet/redpacket/send — 发送红包（支持 chatId 或 targetUsername）
app.post('/api/wallet/redpacket/send', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  if (!user.paymentPassword) return res.status(400).json({ error: '请先设置支付密码' })
  const { amount, chatId, message, password, targetUsername } = req.body
  if (!password || !verifyPassword(password, user.paymentPassword)) return res.status(400).json({ error: '支付密码错误' })
  const numAmount = parseFloat(amount)
  if (!numAmount || numAmount <= 0) return res.status(400).json({ error: '金额必须大于0' })
  if (!chatId) return res.status(400).json({ error: '缺少聊天ID' })
  const parts = chatId.split('||')
  if (!parts.includes(user.id)) return res.status(403).json({ error: '无权操作' })
  const receiverId = parts.find(p => p !== user.id)
  const receiver = store.users[receiverId]
  if (!receiver) return res.status(404).json({ error: '对方不存在' })
  if (user.balance < numAmount) return res.status(400).json({ error: '余额不足' })

  expireRedPackets()
  persist()

  const packetId = genId()
  user.balance -= numAmount
  store.redPackets[packetId] = {
    id: packetId,
    sender_id: user.id,
    senderUsername: user.username,
    receiver_id: receiverId,
    amount: numAmount,
    message: message || '',
    chatId,
    status: 'open',
    created_at: new Date().toISOString()
  }
  const txId = genId()
  store.transactions[txId] = { id: txId, user_id: user.id, amount: numAmount, type: 'send', description: '发送红包', created_at: new Date().toISOString() }

  // 把红包消息追加到聊天记录，让接收方看到
  if (!store.messages[chatId]) store.messages[chatId] = []
  store.messages[chatId].push({
    id: genId(),
    chat_id: chatId,
    sender_id: user.id,
    senderUsername: user.username,
    content: `🧧 ${user.username} 发了一个红包 ¥${numAmount.toFixed(2)}${message ? '：' + message : ''}`,
    created_at: new Date().toISOString(),
    _redPacketId: packetId
  })

  persist()
  res.json({ success: true, packetId, balance: user.balance })
})

// POST /api/wallet/redpacket/:id/claim — 领取红包
app.post('/api/wallet/redpacket/:id/claim', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const id = req.params.id
  const packet = store.redPackets[id]
  if (!packet) return res.status(404).json({ error: '红包不存在' })
  if (packet.status !== 'open') return res.status(400).json({ error: '红包已被领取或已过期' })
  if (packet.receiver_id !== user.id) return res.status(403).json({ error: '这不是你的红包' })
  packet.status = 'claimed'
  user.balance += packet.amount
  const txId = genId()
  store.transactions[txId] = { id: txId, user_id: user.id, amount: packet.amount, type: 'receive', description: '收到红包', created_at: new Date().toISOString() }
  // 标记聊天消息为已领取
  if (store.messages[packet.chatId]) {
    const msg = store.messages[packet.chatId].find(m => m._redPacketId === packet.id)
    if (msg) msg._claimed = true
  }
  persist()
  res.json({ success: true, amount: packet.amount })
})

app.get('/api/wallet/transactions', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const page = parseInt(req.query.page) || 1
  const txs = Object.values(store.transactions)
    .filter(t => t.user_id === user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice((page - 1) * 20, page * 20)
  res.json({ transactions: txs })
})

// imgbb upload proxy (bypasses browser CORS)
app.post('/api/upload/imgbb', express.json({ limit: '10mb' }), async (req, res) => {
  const { image: base64Data } = req.body
  if (!base64Data) return res.status(400).json({ error: '缺少图片数据' })
  // 去掉 data:image/...;base64, 前缀
  const base64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '')
  const buffer = Buffer.from(base64, 'base64')
  const form = new FormData()
  form.append('key', IMGBB_KEY)
  form.append('image', new Blob([buffer], { type: 'image/png' }), 'upload.png')
  try {
    const imgbbRes = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
    const data = await imgbbRes.json()
    if (!data.success) return res.status(500).json({ error: data.error?.message || '上传失败' })
    res.json({ url: data.data.url })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Admin ──────────────────────────────────────────
const ADMIN_USER = 'qiyu'
const ADMIN_PASSWORD_HASH = hashPassword('1234')

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' })
  const admin = Object.values(store.users).find(u => u.username === ADMIN_USER)
  if (!admin || hashPassword(password) !== admin.password) return res.status(401).json({ error: '无权访问' })
  res.json({ success: true })
})

app.get('/api/admin/stats', (req, res) => {
  const allUsers = Object.values(store.users)
  const allTx = Object.values(store.transactions)
  const allMsgs = Object.values(store.messages).flat()
  const totalBalance = allUsers.reduce((s, u) => s + (u.balance || 0), 0)
  res.json({
    totalUsers: allUsers.length,
    totalMessages: allMsgs.length,
    totalTransactions: allTx.length,
    totalBalance: totalBalance.toFixed(2)
  })
})

app.get('/api/admin/users', (req, res) => {
  const users = Object.values(store.users).map(u => ({
    id: u.id,
    username: u.username,
    chat_code: u.chat_code,
    balance: u.balance,
    hasPaymentPassword: !!u.paymentPassword
  }))
  res.json({ users })
})

app.delete('/api/admin/users/:id', (req, res) => {
  const userId = req.params.id
  delete store.users[userId]
  // 清理相关数据
  Object.keys(store.contacts).forEach(uid => {
    if (store.contacts[uid]) store.contacts[uid] = store.contacts[uid].filter(id => id !== userId)
  })
  delete store.contacts[userId]
  Object.keys(store.messages).forEach(cid => {
    if (cid.includes(userId)) delete store.messages[cid]
  })
  Object.keys(store.transactions).forEach(tid => {
    if (store.transactions[tid].user_id === userId) delete store.transactions[tid]
  })
  persist()
  res.json({ success: true })
})

app.put('/api/admin/users/:id/balance', (req, res) => {
  const userId = req.params.id
  const { balance } = req.body
  const user = store.users[userId]
  if (!user) return res.status(404).json({ error: '用户不存在' })
  user.balance = parseFloat(balance)
  persist()
  res.json({ success: true, balance: user.balance })
})

app.get('/api/admin/transactions', (req, res) => {
  const txs = Object.values(store.transactions)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(tx => {
      const user = store.users[tx.user_id]
      return { ...tx, username: user?.username || '未知' }
    })
  res.json({ transactions: txs })
})

app.get('/api/admin/chats', (req, res) => {
  const chats = Object.entries(store.messages)
    .filter(([chatId]) => chatId.includes('||'))
    .map(([chatId, msgs]) => {
      const [id1, id2] = chatId.split('||')
      const u1 = store.users[id1]
      const u2 = store.users[id2]
      return {
        chatId,
        user1: u1 ? u1.username : id1,
        user2: u2 ? u2.username : id2,
        messageCount: msgs.length
      }
    })
    .sort((a, b) => b.messageCount - a.messageCount)
  res.json({ chats })
})

app.delete('/api/admin/messages/:chatId', (req, res) => {
  const chatId = req.params.chatId
  delete store.messages[chatId]
  persist()
  res.json({ success: true })
})

const PORT = 3456
process.on('uncaughtException', (err) => console.error('[UNCAUGHT]', err.message))
process.on('unhandledRejection', (reason) => console.error('[UNHANDLED]', reason))
app.listen(PORT, '0.0.0.0', () => console.log(`Mock server running on http://0.0.0.0:${PORT}`))

