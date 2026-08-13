import { useState, useEffect } from 'react'
import { ArrowLeft, Search, Plus, UserPlus, Bell, Trash2 } from 'lucide-react'
import ChatPage from './ChatPage'
import api from '../api'

export default function ContactsPage() {
  const [contacts, setContacts] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [friendUsername, setFriendUsername] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [adding, setAdding] = useState(false)
  const [pendingRequests, setPendingRequests] = useState([])
  const [sendingRequest, setSendingRequest] = useState(null)
  const [sendStatus, setSendStatus] = useState({})
  const [clearingChatId, setClearingChatId] = useState(null)

  useEffect(() => {
    loadContacts()
    loadPendingRequests()
  }, [])

  // 每 3 秒轮询好友请求
  useEffect(() => {
    const interval = setInterval(() => {
      loadPendingRequests()
      loadContacts()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadContacts = async () => {
    try {
      const data = await api.contacts.list()
      setContacts(data.contacts || [])
    } catch (e) {}
  }

  const loadPendingRequests = async () => {
    try {
      const data = await api.friendRequests.incoming()
      setPendingRequests(data.requests || [])
    } catch (e) {}
  }

  const handleClearChat = async (contact) => {
    if (!contact.chatId) return
    try {
      const msgs = await api.messages.get(contact.chatId)
      const count = (msgs.messages || []).length
      if (!window.confirm(`确定要清除与 ${contact.username} 的 ${count} 条消息吗？`)) return
    } catch (e) {}
    setClearingChatId(contact.chatId)
    try {
      await api.messages.clearChat(contact.chatId)
      setContacts(prev => prev.map(c =>
        c.chatId === contact.chatId ? { ...c, lastMessage: '', unread: 0 } : c
      ))
    } catch (e) {
      alert('清除失败')
    } finally {
      setClearingChatId(null)
    }
  }

  const filtered = contacts.filter(c =>
    c.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSearchUser = async () => {
    if (!friendUsername.trim()) return
    setAdding(true)
    try {
      const data = await api.contacts.searchUser(friendUsername.trim())
      setSearchResults(data.users || [])
    } catch (e) {
      setSearchResults([])
    } finally {
      setAdding(false)
    }
  }

  const handleAddFriend = async (user) => {
    setSendingRequest(user.username)
    setSendStatus(prev => ({ ...prev, [user.username]: 'sending' }))
    try {
      const result = await api.friendRequests.send(user.username)
      setSendStatus(prev => ({ ...prev, [user.username]: 'sent' }))
      setTimeout(() => {
        setShowAddFriend(false)
        setFriendUsername('')
        setSearchResults([])
        setSendStatus({})
      }, 1200)
    } catch (e) {
      setSendStatus(prev => ({ ...prev, [user.username]: 'error' }))
      setTimeout(() => setSendStatus({}), 2000)
    } finally {
      setSendingRequest(null)
    }
  }

  const handleAccept = async (reqId) => {
    try {
      await api.friendRequests.accept(reqId)
      setPendingRequests(prev => prev.filter(r => r.id !== reqId))
      await loadContacts()
    } catch (e) {}
  }

  const handleReject = async (reqId) => {
    try {
      await api.friendRequests.reject(reqId)
      setPendingRequests(prev => prev.filter(r => r.id !== reqId))
    } catch (e) {}
  }

  if (activeChat) {
    return <ChatPage contact={activeChat} chatId={activeChat.chatId} onBack={() => setActiveChat(null)} />
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>联系人</h1>
        <div style={styles.headerActions}>
          {pendingRequests.length > 0 && (
            <button onClick={() => setShowRequests(true)} style={styles.bellBtn}>
              <Bell size={20} color="#e94560" />
              <span style={styles.reqBadge}>{pendingRequests.length}</span>
            </button>
          )}
          <button onClick={() => setShowAddFriend(true)} style={styles.addBtn}>
            <UserPlus size={20} />
          </button>
        </div>
      </div>

      <div style={styles.searchBar}>
        <Search size={18} color="#6c6c80" />
        <input
          style={styles.searchInput}
          placeholder="搜索联系人..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={styles.list}>
        {filtered.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
            <p style={{ color: '#6c6c80' }}>
              {searchTerm ? '没有找到联系人' : '暂无联系人，添加好友开始聊天'}
            </p>
          </div>
        ) : (
          filtered.map(contact => (
            <div key={contact.id} style={styles.contactItemWrapper}>
              <button onClick={() => setActiveChat(contact)} style={styles.contactItem}>
                <div style={styles.avatar}>{contact.username[0]?.toUpperCase()}</div>
                <div style={styles.contactText}>
                  <span style={styles.contactName}>{contact.username}</span>
                  {contact.lastMessage && (
                    <span style={styles.lastMsg}>{contact.lastMessage}</span>
                  )}
                </div>
                {contact.unread > 0 && (
                  <div style={styles.badge}>{contact.unread}</div>
                )}
              </button>
              {contact.chatId && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleClearChat(contact) }}
                  style={{
                    ...styles.clearBtn,
                    opacity: clearingChatId === contact.chatId ? 0.4 : 1
                  }}
                  disabled={clearingChatId === contact.chatId}
                >
                  {clearingChatId === contact.chatId ? '' : <Trash2 size={16} />}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* 好友请求列表弹窗 */}
      {showRequests && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>好友请求 ({pendingRequests.length})</span>
              <button onClick={() => setShowRequests(false)} style={styles.closeBtn}>✕</button>
            </div>
            {pendingRequests.length === 0 ? (
              <div style={styles.emptySmall}>暂无好友请求</div>
            ) : (
              pendingRequests.map(req => (
                <div key={req.id} style={styles.reqRow}>
                  <div style={styles.reqAvatar}>{req.fromUsername?.[0]?.toUpperCase()}</div>
                  <span style={styles.reqUsername}>{req.fromUsername}</span>
                  <div style={styles.reqActions}>
                    <button onClick={() => handleAccept(req.id)} style={styles.acceptBtn}>通过</button>
                    <button onClick={() => handleReject(req.id)} style={styles.rejectBtn}>删除</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 添加好友弹窗 */}
      {showAddFriend && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>添加好友</span>
              <button onClick={() => { setShowAddFriend(false); setSearchResults([]) }} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.searchRow}>
              <input
                style={styles.modalInput}
                placeholder="输入用户名搜索..."
                value={friendUsername}
                onChange={e => setFriendUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
              />
              <button onClick={handleSearchUser} style={styles.searchBtn} disabled={adding}>
                {adding ? '...' : '搜索'}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div style={styles.results}>
                {searchResults.map(u => {
                  const status = sendStatus[u.username]
                  return (
                    <div key={u.id} style={styles.userRow}>
                      <div style={styles.avatar}>{u.username[0]?.toUpperCase()}</div>
                      <span style={styles.username}>{u.username}</span>
                      {status === 'sent' ? (
                        <span style={styles.sentTag}>已发送请求</span>
                      ) : (
                        <button
                          onClick={() => handleAddFriend(u)}
                          disabled={status === 'sending'}
                          style={{
                            ...styles.addFriendBtn,
                            opacity: status === 'sending' ? 0.5 : 1
                          }}
                        >
                          {status === 'sending' ? '...' : '+ 添加'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0f0f1a' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #2a2a4a'
  },
  title: { fontSize: 22, fontWeight: 700 },
  headerActions: { display: 'flex', gap: 8 },
  bellBtn: { position: 'relative', padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer' },
  reqBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    background: '#e94560',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px'
  },
  addBtn: { padding: 8, borderRadius: 8, color: '#e94560', background: 'none', border: 'none', cursor: 'pointer' },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    background: '#1a1a2e'
  },
  searchInput: { flex: 1, fontSize: 15, padding: '8px 0' },
  list: { flex: 1, overflowY: 'auto' },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6c6c80'
  },
  emptySmall: { textAlign: 'center', color: '#6c6c80', padding: '30px 0' },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #1a1a2e',
    width: '100%',
    textAlign: 'left',
    gap: 12,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer'
  },
  contactItemWrapper: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #1a1a2e'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 18,
    flexShrink: 0
  },
  contactText: { flex: 1, overflow: 'hidden' },
  contactName: { display: 'block', fontSize: 16, fontWeight: 500 },
  lastMsg: { display: 'block', fontSize: 13, color: '#6c6c80', marginTop: 2 },
  badge: {
    background: '#e94560',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 10,
    flexShrink: 0
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'transparent',
    border: '2px solid #e94560',
    color: '#e94560',
    fontSize: 22,
    lineHeight: '32px',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  modal: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    background: '#1a1a2e',
    borderRadius: '16px 16px 0 0',
    padding: '20px',
    maxHeight: '70vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: { fontSize: 18, fontWeight: 600 },
  closeBtn: { padding: 4, color: '#6c6c80', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' },
  searchRow: { display: 'flex', gap: 8, marginBottom: 16 },
  modalInput: {
    flex: 1,
    padding: '12px 14px',
    background: '#16213e',
    borderRadius: 10,
    fontSize: 15,
    color: '#fff',
    outline: 'none'
  },
  searchBtn: {
    padding: '12px 20px',
    background: '#e94560',
    borderRadius: 10,
    color: '#fff',
    fontWeight: 600,
    fontSize: 15,
    border: 'none',
    cursor: 'pointer'
  },
  results: { display: 'flex', flexDirection: 'column', gap: 8 },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid #2a2a4a'
  },
  username: { flex: 1, fontSize: 15, color: '#fff' },
  addFriendBtn: {
    padding: '6px 16px',
    background: 'transparent',
    border: '1px solid #e94560',
    borderRadius: 8,
    color: '#e94560',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer'
  },
  sentTag: {
    padding: '6px 12px',
    background: '#16213e',
    borderRadius: 8,
    color: '#4ade80',
    fontSize: 13,
    fontWeight: 500
  },
  reqRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid #2a2a4a'
  },
  reqAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#2a2a4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 16,
    color: '#e94560'
  },
  reqUsername: { flex: 1, fontSize: 15, color: '#fff' },
  reqActions: { display: 'flex', gap: 8 },
  acceptBtn: {
    padding: '6px 16px',
    background: '#e94560',
    borderRadius: 8,
    color: '#fff',
    fontWeight: 600,
    fontSize: 13,
    border: 'none',
    cursor: 'pointer'
  },
  rejectBtn: {
    padding: '6px 16px',
    background: 'transparent',
    border: '1px solid #6c6c80',
    borderRadius: 8,
    color: '#6c6c80',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  }
}
