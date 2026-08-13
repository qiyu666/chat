import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const IMGBB_KEY = 'a3c4d52586dedcc730da4af027c12ebf'

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
  return { users: {}, contacts: {}, messages: {}, moments: {}, redPackets: {}, transactions: {}, friendRequests: {} }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

let store = loadData()

function persist() {
  saveData(store)
}

// ── 工具函数 ────────────────────────────────────────
function genId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2)
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
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' })
  if (store.users[username]) return res.status(400).json({ error: '用户名已存在' })
  const id = genId()
  const user = { id, username, password, balance: 100.00, paymentPassword: null, _token: genId() }
  store.users[id] = user
  store.users[id].username = username          // key by id, value has username
  // Remove old username-keyed entry if exists
  delete store.users[username]
  const txId = genId()
  store.transactions[txId] = { id: txId, user_id: id, amount: 100, type: 'receive', description: '注册赠送', created_at: new Date().toISOString() }
  persist()
  res.json({ token: user._token, user: { id: user.id, username: user.username, balance: user.balance, hasPaymentPassword: !!user.paymentPassword } })
})

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body
  const user = Object.values(store.users).find(u => u.username === username)
  if (!user || user.password !== password) return res.status(401).json({ error: '用户名或密码错误' })
  res.json({ token: user._token, user: { id: user.id, username: user.username, balance: user.balance, hasPaymentPassword: !!user.paymentPassword } })
})

app.get('/api/auth/me', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  res.json({ user: { id: user.id, username: user.username, balance: user.balance, hasPaymentPassword: !!user.paymentPassword } })
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

// POST /api/wallet/transfer — 用户间转账（需验证支付密码）
app.post('/api/wallet/transfer', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  if (!user.paymentPassword) return res.status(400).json({ error: '请先设置支付密码' })
  const { targetUsername, amount, password } = req.body
  if (!targetUsername || !amount || !password) return res.status(400).json({ error: '缺少参数' })
  if (!/^\d{6}$/.test(password)) return res.status(400).json({ error: '支付密码错误' })
  if (password !== user.paymentPassword) return res.status(400).json({ error: '支付密码错误' })
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
  const { targetUsername } = req.body
  const target = Object.values(store.users).find(u => u.username === targetUsername)
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
  const friendIds = store.contacts[user.id] || []
  const friends = friendIds.map(fid => {
    const f = store.users[fid]
    const chatId = f ? getChatId(user.id, f.id) : null
    const lastMsg = (store.messages[chatId] || [])
      .filter(m => m.sender_id !== user.id)
      .pop()
    return f ? { id: f.id, username: f.username, lastMessage: lastMsg?.content || '', unread: 0, chatId } : null
  }).filter(Boolean)
  expireRedPackets()
  persist()
  res.json({ contacts: friends })
})

app.get('/api/contacts/search', (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const q = req.query.q || ''
  const results = Object.values(store.users)
    .filter(u => u.username.includes(q) && u.id !== user.id)
    .map(u => ({ id: u.id, username: u.username }))
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
app.get('/api/messages/:chatId', (req, res) => {
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

app.post('/api/messages/:chatId/send', express.json({ limit: '5mb' }), (req, res) => {
  const token = getAuth(req)
  const user = getUserFromToken(token)
  if (!user) return res.status(401).json({ error: '未登录' })
  const chatId = req.params.chatId
  const parts = chatId.split('||')
  if (!parts.includes(user.id)) return res.status(403).json({ error: '无权发送消息' })
  const { content } = req.body
  if (!content) return res.status(400).json({ error: '消息内容不能为空' })
  if (!store.messages[chatId]) store.messages[chatId] = []
  store.messages[chatId].push({
    id: genId(),
    chat_id: chatId,
    sender_id: user.id,
    senderUsername: user.username,
    content,
    created_at: new Date().toISOString()
  })
  persist()
  res.json({ success: true })
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
  if (!password || password !== user.paymentPassword) return res.status(400).json({ error: '支付密码错误' })
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

const PORT = 3456
app.listen(PORT, () => console.log(`Mock server running on http://localhost:${PORT}`))

