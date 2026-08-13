const API_BASE = '/api'

const api = {
  async request(method, path, body = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    }
    if (body) options.body = JSON.stringify(body)
    const token = localStorage.getItem('token')
    if (token) options.headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${API_BASE}${path}`, options)
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
    register(username, password) {
      return api.request('POST', '/auth/register', { username, password })
    },
    getMe() {
      return api.request('GET', '/auth/me')
    },
    logout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
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
    }
  },

  friendRequests: {
    send(targetUsername) {
      return api.request('POST', '/friend-requests/send', { targetUsername })
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
      return api.request('GET', `/messages/${chatId}`)
    },
    send(chatId, content) {
      return api.request('POST', `/messages/${chatId}/send`, { content })
    },
    delete(messageId) {
      return api.request('DELETE', `/messages/${messageId}`)
    },
    clearChat(chatId) {
      return api.request('DELETE', `/messages/chat/${chatId}`)
    }
  },

  moments: {
    list() {
      return api.request('GET', '/moments')
    },
    create(content, imageUrls = []) {
      return api.request('POST', '/moments', { content, imageUrls })
    },
    like(momentId) {
      return api.request('POST', `/moments/${momentId}/like`)
    },
    delete(momentId) {
      return api.request('DELETE', `/moments/${momentId}`)
    }
  },

  wallet: {
    getBalance() {
      return api.request('GET', '/wallet/balance')
    },
    setPassword(password) {
      return api.request('POST', '/wallet/set-password', { password })
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
