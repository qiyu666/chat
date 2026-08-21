import { useState, useEffect } from 'react'
import { Search, Plus, UserPlus, Bell, MessageCircle, MoreVertical } from 'lucide-react'
import ChatPage from './ChatPage'
import api from '../api'

export default function ContactsPage() {
  const [contacts, setContacts] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [adding, setAdding] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [pendingRequests, setPendingRequests] = useState([])
  const [sendingRequest, setSendingRequest] = useState(null)
  const [sendStatus, setSendStatus] = useState({})

  useEffect(() => {
    loadContacts()
    loadPendingRequests()
  }, [])

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
      setContacts(Array.isArray(data) ? data : (data.contacts || []))
    } catch (e) {
      console.error('[DEBUG] loadContacts error:', e.message || e)
    }
  }

  const loadPendingRequests = async () => {
    try {
      const data = await api.friendRequests.incoming()
      setPendingRequests(data.requests || [])
    } catch (e) {
      console.error('[DEBUG] loadPending error:', e.message || e)
    }
  }

  const filtered = contacts.filter(c =>
    (c.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSearchUser = async () => {
    console.log('[SEARCH] button clicked, input:', searchInput)
    if (!searchInput.trim()) return
    setAdding(true)
    try {
      console.log('[SEARCH] calling getByChatCode:', searchInput.trim())
      const codeData = await api.users.getByChatCode(searchInput.trim())
      console.log('[SEARCH] getByChatCode result:', codeData)
      if (codeData.user) {
        setSearchResults([codeData.user])
        return
      }
      console.log('[SEARCH] fallback to searchUser:', searchInput.trim())
      const data = await api.contacts.searchUser(searchInput.trim())
      console.log('[SEARCH] searchUser result:', data)
      setSearchResults(data.users || [])
    } catch (e) {
      console.error('[SEARCH] error:', e.message || e)
      setSearchResults([])
    } finally {
      setAdding(false)
    }
  }

  const handleAddFriend = async (user) => {
    setSendingRequest(user.chat_code || user.username)
    setSendStatus(prev => ({ ...prev, [user.chat_code || user.username]: 'sending' }))
    try {
      await api.friendRequests.send(user.username, user.chat_code)
      setSendStatus(prev => ({ ...prev, [user.chat_code || user.username]: 'sent' }))
      setTimeout(() => {
        setShowAddFriend(false)
        setSearchInput('')
        setSearchResults([])
        setSendStatus({})
      }, 1200)
    } catch (e) {
      setSendStatus(prev => ({ ...prev, [user.chat_code || user.username]: 'error' }))
      setTimeout(() => setSendStatus({}), 2000)
    } finally {
      setSendingRequest(null)
    }
  }

  const handleDeleteContact = async (contactId) => {
    if (!confirm('确定删除该好友？')) return
    setOpenMenuId(null)
    try {
      console.log('[DELETE] deleting contact:', contactId)
      await api.contacts.deleteContact(contactId)
      console.log('[DELETE] request succeeded, reloading contacts...')
      await loadContacts()
      console.log('[DELETE] current contacts:', contacts.length)
    } catch (e) {
      console.error('[DELETE] error:', e.message || e)
    }
  }

  const handleBlockContact = async (contactId) => {
    if (!confirm('确定拉黑该用户？拉黑后对方将无法给你发送消息或好友请求。')) return
    setOpenMenuId(null)
    await api.contacts.blockContact(contactId)
    loadContacts()
  }

  const handleAccept = async (reqId) => {
    try {
      await api.friendRequests.accept(reqId)
      setPendingRequests(prev => prev.filter(r => r.id !== reqId))
      await loadContacts()
    } catch (e) {
      console.error('[DEBUG] accept error:', e.message || e)
    }
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
              <div style={styles.contactItem}>
                <div style={styles.avatar}>{contact.username?.[0]?.toUpperCase()}</div>
                <span style={styles.contactName}>{contact.username}</span>
              </div>
              <button onClick={() => setActiveChat(contact)} style={styles.chatBtn} title="发送消息">
                <MessageCircle size={18} />
              </button>
              <div style={styles.menuWrapper}>
                <button style={styles.moreBtn} onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === contact.id ? null : contact.id) }}>
                  <MoreVertical size={18} />
                </button>
                {openMenuId === contact.id && (
                  <div style={styles.menuDropdown}>
                    <button style={styles.menuItem} onClick={() => handleDeleteContact(contact.id)}>删除好友</button>
                    <button style={styles.menuItem} onClick={() => handleBlockContact(contact.id)}>拉黑</button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

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

      {showAddFriend && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>添加好友</span>
              <button onClick={() => { setShowAddFriend(false); setSearchResults([]); setHasSearched(false) }} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.searchRow}>
              <input
                style={styles.modalInput}
                placeholder="输入用户名或chat号搜索..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
              />
              <button onClick={() => { console.log('[CLICK] search button clicked'); handleSearchUser() }} style={styles.searchBtn} disabled={adding}>
                {adding ? '...' : '搜索'}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div style={styles.results}>
                {searchResults.map(u => {
                  const key = u.chat_code || u.username
                  const status = sendStatus[key]
                  return (
                    <div key={u.id} style={styles.userRow}>
                      <div style={styles.avatar}>{u.username?.[0]?.toUpperCase()}</div>
                      <div style={styles.userMeta}>
                        <span style={styles.username}>{u.username}</span>
                        {u.chat_code && <span style={styles.chatCodeTag}>chat号: {u.chat_code}</span>}
                      </div>
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
            {hasSearched && searchResults.length === 0 && !adding && (
              <div style={styles.emptySmall}>未找到该用户，请确认用户名或 chat 号是否正确</div>
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
    flex: 1,
    gap: 12
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
  contactName: { fontSize: 16, fontWeight: 500, flex: 1 },
  chatBtn: {
    padding: '10px 14px',
    marginRight: 8,
    borderRadius: 10,
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    color: '#e94560',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuWrapper: { position: 'relative' },
  moreBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    background: 'transparent',
    border: 'none',
    color: '#6c6c80',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  menuDropdown: {
    position: 'absolute',
    right: 0,
    top: '100%',
    zIndex: 100,
    background: '#1e1e3a',
    border: '1px solid #2a2a4a',
    borderRadius: 10,
    minWidth: 120,
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
  },
  menuItem: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    color: '#c0c0d0',
    fontSize: 14,
    textAlign: 'left',
    cursor: 'pointer'
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
  userMeta: { flex: 1, minWidth: 0 },
  chatCodeTag: { fontSize: 12, color: '#6c6c80', display: 'block', marginTop: 2 },
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
    fontWeight: 50
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
