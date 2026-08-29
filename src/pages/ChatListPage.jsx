import { useState, useEffect, useRef } from 'react'
import { Search, Bell, Trash2, Plus } from 'lucide-react'
import ChatPage from './ChatPage'
import GroupCreatePage from './GroupCreatePage'
import api from '../api'
import { NotificationService } from '../utils/notifications'

export default function ChatListPage() {
  const [chats, setChats] = useState([])
  const [groups, setGroups] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [activeGroup, setActiveGroup] = useState(null)
  const [showGroupCreate, setShowGroupCreate] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showRequests, setShowRequests] = useState(false)
  const [pendingRequests, setPendingRequests] = useState([])
  const [clearingChatId, setClearingChatId] = useState(null)
  const prevChatsRef = useRef([])

  useEffect(() => {
    loadChats()
    loadGroups()
    loadPendingRequests()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      loadPendingRequests()
      loadChats()
      loadGroups()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadChats = async () => {
    try {
      const data = await api.contacts.list()
      const list = Array.isArray(data) ? data : (data.contacts || [])
      const prev = prevChatsRef.current
      for (const contact of list) {
        const prevContact = prev.find(p => p.id === contact.id)
        if (prevContact) {
          const curLast = contact.lastMessage || ''
          if (curLast !== (prevContact.lastMessage || '') && contact.unread > 0) {
            // 通知由全局 NotificationContext WebSocket 处理
          }
        } else {
          if (contact.unread > 0 && contact.lastMessage) {
            // 通知由全局 NotificationContext WebSocket 处理
          }
        }
      }
      prevChatsRef.current = list
      setChats(list)
    } catch (e) {
      console.error('[DEBUG] loadChats error:', e.message || e)
    }
  }

  const loadGroups = async () => {
    try {
      const data = await api.groups.list()
      setGroups(Array.isArray(data) ? data : (data.groups || []))
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
      setChats(prev => prev.map(c => c.chatId === contact.chatId ? { ...c, lastMessage: '', unread: 0 } : c))
    } catch (e) { alert('清除失败') } finally { setClearingChatId(null) }
  }

  const filtered = chats.filter(c =>
    (c.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.lastMessage || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredGroups = groups.filter(g =>
    (g.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAccept = async (reqId) => {
    try {
      await api.friendRequests.accept(reqId)
      setPendingRequests(prev => prev.filter(r => r.id !== reqId))
      await loadChats()
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

  if (showGroupCreate) {
    return <GroupCreatePage onBack={() => setShowGroupCreate(false)} onCreateGroup={async (groupId) => {
      setShowGroupCreate(false)
      await loadGroups()
      const group = groups.find(g => g.id === groupId)
      if (group) {
        setActiveGroup(group)
      } else {
        try {
          const g = await api.groups.get(groupId)
          setActiveGroup(g)
        } catch (e) {
          console.error('[DEBUG] failed to load group:', e)
          alert('创建成功但无法打开群聊，请刷新后重试')
        }
      }
    }} />
  }

  if (activeGroup) {
    return <ChatPage contact={{ id: activeGroup.id, username: activeGroup.name, lastMessage: activeGroup.lastMessage, unread: activeGroup.unread }} chatId={activeGroup.id} isGroup onBack={() => setActiveGroup(null)} />
  }

  if (activeChat) {
    return <ChatPage contact={activeChat} chatId={activeChat.chatId} onBack={() => { setActiveChat(null); onChatOpen?.(false) }} />
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>消息</h1>
        <div style={styles.headerActions}>
          {pendingRequests.length > 0 && (
            <button onClick={() => setShowRequests(true)} style={styles.bellBtn}>
              <Bell size={20} color="#e94560" />
              <span style={styles.reqBadge}>{pendingRequests.length}</span>
            </button>
          )}
          <button onClick={() => setShowGroupCreate(true)} style={styles.newChatBtn}>
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div style={styles.searchBar}>
        <Search size={18} color="#6c6c80" />
        <input
          style={styles.searchInput}
          placeholder="搜索..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={styles.list}>
        {(filtered.length === 0 && filteredGroups.length === 0) ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ color: '#6c6c80' }}>
              {searchTerm ? '没有找到相关聊天' : '暂无消息，去联系人里开始聊天吧'}
            </p>
          </div>
        ) : (
          <>
            {filteredGroups.length > 0 && (
              <div style={styles.sectionTitle}>群聊 ({filteredGroups.length})</div>
            )}
            {filteredGroups.map(group => (
              <div key={group.id} style={styles.groupItem} onClick={() => setActiveGroup(group)}>
                <div style={styles.groupAvatar}>群</div>
                <div style={styles.contactText}>
                  <span style={styles.contactName}>{group.name}</span>
                  <span style={styles.lastMsg}>{group.lastMessage || '开始群聊吧'}</span>
                </div>
                <div style={styles.rightInfo}>
                  {group.unread > 0 && <div style={styles.badge}>{group.unread}</div>}
                </div>
              </div>
            ))}
            {filtered.length > 0 && filteredGroups.length > 0 && (
              <div style={styles.sectionTitle}>消息 ({filtered.length})</div>
            )}
            {filtered.map(contact => (
              <div key={contact.id} style={styles.contactItemWrapper}>
                <button onClick={() => { setActiveChat(contact); onChatOpen?.(true) }} style={styles.contactItem}>
                  <div style={styles.avatar}>{contact.username?.[0]?.toUpperCase()}</div>
                  <div style={styles.contactText}>
                    <span style={styles.contactName}>{contact.username}</span>
                    <span style={styles.lastMsg}>
                      {contact.lastMessage || '开始对话吧'}
                    </span>
                  </div>
                  <div style={styles.rightInfo}>
                    {contact.unread > 0 && (
                      <div style={styles.badge}>{contact.unread}</div>
                    )}
                  </div>
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
            ))}
          </>
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
  newChatBtn: {
    padding: 8,
    borderRadius: 8,
    background: '#e94560',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
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
  sectionTitle: {
    padding: '8px 16px',
    fontSize: 12,
    color: '#6c6c80',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  groupItem: {
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
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
    color: '#fff'
  },
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
    cursor: 'pointer',
    flex: 1
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
  unreadDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#ff3b30',
    border: '2px solid #1a1a2e'
  },
  contactText: { flex: 1, overflow: 'hidden' },
  contactName: { display: 'block', fontSize: 16, fontWeight: 500 },
  lastMsg: { display: 'block', fontSize: 13, color: '#6c6c80', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rightInfo: { display: 'flex', alignItems: 'center', gap: 8 },
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
