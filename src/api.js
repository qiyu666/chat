const API_BASE = 'https://chat-api.aiit.cc.cd/api'

const api = {
  async request(method, path, body = null) {
    const url = `${API_BASE}${path}`
    console.log('[API]', method, url)
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    }
    if (body) options.body = JSON.stringify(body)
    const token = localStorage.getItem('token')
    if (token) options.headers['Authorization'] = `Bearer ${token}`
    let res
    try {
      res = await fetch(url, options)
      console.log('[API]', url, 'status:', res.status, 'headers:', [...res.headers.entries()].slice(0, 5).map(([k,v])=>`${k}=${v}`).join(', '))
    } catch (e) {
      console.error('[API] fetch failed:', e.name, e.message, url)
      throw e
    }
    const contentType = res.headers.get('content-type') || ''
    let data
    if (contentType.includes('application/json')) {
      data = await res.json()
    } else {
      const text = await res.text()
      throw new Error(`服务响应异常 (${res.status}): ${text.substring(0, 80)}`)
    }
    if (!res.ok || (data && data.error)) throw new Error(data.error || '请求失败')
    return data
  },

  auth: {
    login(username, password) {
      return api.request('POST', '/auth/login', { username, password })
    },
    register(username, password, chat_code) {
      return api.request('POST', '/auth/register', { username, password, chat_code })
    },
    getMe() {
      return api.request('GET', '/auth/me')
    },
    logout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    changePassword(oldPassword, newPassword) {
      return api.request('PUT', '/auth/password', { oldPassword, newPassword })
    },
    updateChatCode(chat_code) {
      return api.request('PUT', '/auth/chat_code', { chat_code })
    },
    deleteAccount(password) {
      return api.request('DELETE', '/auth/account', { password })
    }
  },

  contacts: {
    list() {
      return api.request('GET', '/contacts')
    },
    addFriend(username) {
      return api.request('POST', '/contacts/add', { username })
    },
    searchUser(username) {
      return api.request('GET', `/contacts/search?q=${encodeURIComponent(username)}`)
    },
    deleteContact(contactId) {
      return api.request('DELETE', `/contacts/${contactId}`)
    },
    blockContact(contactId) {
      return api.request('POST', `/contacts/block/${contactId}`)
    },
    unblockContact(contactId) {
      return api.request('DELETE', `/contacts/block/${contactId}`)
    }
  },

  users: {
    getByChatCode(chat_code) {
      return api.request('GET', `/users/chat_code/${encodeURIComponent(chat_code)}`)
    }
  },

  friendRequests: {
    send(targetUsername, targetChatCode) {
      return api.request('POST', '/friend-requests/send', { targetUsername, targetChatCode })
    },
    incoming() {
      return api.request('GET', '/friend-requests/incoming')
    },
    accept(reqId) {
      return api.request('POST', `/friend-requests/${reqId}/accept`)
    },
    reject(reqId) {
      return api.request('POST', `/friend-requests/${reqId}/reject`)
    }
  },

  messages: {
    get(chatId) {
      return api.request('GET', `/chats/${chatId}/messages`)
    },
    send(chatId, content, imageUrl = null) {
      return api.request('POST', `/chats/${chatId}/messages`, { content, imageUrl })
    },
    delete(messageId) {
      return api.request('DELETE', `/messages/${messageId}`)
    },
    clearChat(chatId) {
      return api.request('DELETE', `/chats/${chatId}/clear`)
    }
  },

  moments: {
    list() {
      return api.request('GET', '/moments')
    },
    create(content, imageUrls = []) {
      return api.request('POST', '/moments', { content, images: imageUrls })
    },
    like(momentId) {
      return api.request('POST', `/moments/${momentId}/like`)
    },
    delete(momentId) {
      return api.request('DELETE', `/moments/${momentId}`)
    },
    getComments(momentId) {
      return api.request('GET', `/moments/${momentId}/comments`)
    },
    addComment(momentId, content) {
      return api.request('POST', `/moments/${momentId}/comments`, { content })
    }
  },

  wallet: {
    getBalance() {
      return api.request('GET', '/wallet/balance')
    },
    setPassword(password) {
      return api.request('POST', '/wallet/set-password', { password })
    },
    changePassword(oldPassword, newPassword) {
      return api.request('PUT', '/wallet/password', { oldPassword, newPassword })
    },
    sendRedPacket({ amount, chatId, message, password }) {
      return api.request('POST', '/wallet/redpacket/send', { amount, chatId, message, password })
    },
    claimRedPacket(packetId) {
      return api.request('POST', `/wallet/redpacket/${packetId}/claim`)
    },
    getTransactions(page = 1) {
      return api.request('GET', `/wallet/transactions?page=${page}`)
    },
    transfer({ targetUsername, amount, password }) {
      return api.request('POST', '/wallet/transfer', { targetUsername, amount, password })
    }
  }
}

export default api
