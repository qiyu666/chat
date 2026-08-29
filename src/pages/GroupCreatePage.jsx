import { useState, useEffect } from 'react'
import api from '../api'

export default function GroupCreatePage({ onBack, onCreateGroup }) {
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api.contacts.list().then(data => {
      const list = Array.isArray(data) ? data : (data.contacts || [])
      setContacts(list)
    }).catch(() => {})
  }, [])

  const toggleMember = (member) => {
    setSelectedMembers(prev =>
      prev.find(m => m.id === member.id)
        ? prev.filter(m => m.id !== member.id)
        : [...prev, member]
    )
  }

  const handleCreate = async () => {
    if (!groupName.trim()) return
    if (selectedMembers.length === 0) { alert('请至少选择1位成员'); return }
    setSending(true)
    try {
      const result = await api.groups.create({ name: groupName.trim(), memberIds: selectedMembers.map(m => m.id) })
      onCreateGroup(result.groupId)
    } catch (e) {
      alert(e.message || '创建失败')
    } finally {
      setSending(false)
    }
  }

  const filteredContacts = contacts.filter(c =>
    c.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>‹</button>
        <span style={styles.title}>创建群聊</span>
        <button onClick={handleCreate} disabled={sending || !groupName.trim() || selectedMembers.length === 0} style={styles.createBtn}>
          {sending ? '创建中...' : '创建'}
        </button>
      </div>

      <div style={styles.inputWrap}>
        <input
          style={styles.nameInput}
          placeholder="群名称（必填）"
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
          maxLength={30}
        />
      </div>

      <div style={styles.membersSection}>
        <div style={styles.sectionTitle}>
          <span>成员 ({selectedMembers.length} 已选)</span>
          <button style={styles.searchToggleBtn} onClick={() => setShowSearch(!showSearch)}>
            {showSearch ? '收起' : '搜索'}
          </button>
        </div>

        {showSearch && (
          <div style={styles.searchBar}>
            <input
              style={styles.searchInput}
              placeholder="搜索联系人..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        <div style={styles.selectedPreview}>
          {selectedMembers.map(m => (
            <div key={m.id} style={styles.selectedChip}>
              <span>{m.username}</span>
              <button onClick={() => toggleMember(m)} style={styles.removeBtn}>✕</button>
            </div>
          ))}
        </div>

        <div style={styles.contactList}>
          {(showSearch ? filteredContacts : contacts).map(contact => {
            const isSelected = selectedMembers.find(m => m.id === contact.id)
            return (
              <button
                key={contact.id}
                onClick={() => toggleMember(contact)}
                style={{
                  ...styles.contactRow,
                  background: isSelected ? 'rgba(233,69,96,0.1)' : 'transparent'
                }}
              >
                <div style={styles.avatar}>{contact.username?.[0]?.toUpperCase()}</div>
                <span style={styles.username}>{contact.username}</span>
                {isSelected && <span style={styles.checkMark}>✓</span>}
              </button>
            )
          })}
          {!showSearch && contacts.length === 0 && (
            <div style={styles.empty}>暂无联系人</div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0f0f1a' },
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', borderBottom: '1px solid #2a2a4a', background: '#1a1a2e'
  },
  backBtn: { padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#a0a0b8', fontSize: 24, lineHeight: 1 },
  title: { flex: 1, fontSize: 17, fontWeight: 600, color: '#fff', textAlign: 'center' },
  createBtn: {
    padding: '8px 18px', borderRadius: 8, background: '#e94560', color: '#fff',
    fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer'
  },
  inputWrap: { padding: '16px', borderBottom: '1px solid #1a1a2e' },
  nameInput: {
    width: '100%', padding: '12px 14px', background: '#16213e', borderRadius: 10,
    fontSize: 15, color: '#fff', outline: 'none', border: '1px solid #2a2a4a', boxSizing: 'border-box'
  },
  membersSection: { flex: 1, overflowY: 'auto' },
  sectionTitle: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: '1px solid #1a1a2e'
  },
  searchToggleBtn: {
    padding: '4px 12px', borderRadius: 6, background: '#16213e', border: '1px solid #2a2a4a',
    color: '#a0a0b8', fontSize: 13, cursor: 'pointer'
  },
  searchBar: { padding: '8px 16px', borderBottom: '1px solid #1a1a2e' },
  searchInput: {
    width: '100%', padding: '10px 12px', background: '#16213e', borderRadius: 8,
    fontSize: 14, color: '#fff', outline: 'none', border: '1px solid #2a2a4a', boxSizing: 'border-box'
  },
  selectedPreview: {
    display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 16px',
    borderBottom: '1px solid #1a1a2e'
  },
  selectedChip: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 10px', background: 'rgba(233,69,96,0.2)', borderRadius: 12, fontSize: 13, color: '#e94560'
  },
  removeBtn: { background: 'none', border: 'none', color: '#e94560', cursor: 'pointer', fontSize: 12, padding: 0 },
  contactList: { display: 'flex', flexDirection: 'column' },
  contactRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', borderBottom: '1px solid #1a1a2e',
    width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer'
  },
  avatar: {
    width: 36, height: 36, borderRadius: '50%', background: '#2a2a4a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 600, fontSize: 14, color: '#e94560', flexShrink: 0
  },
  username: { flex: 1, fontSize: 15, color: '#fff' },
  checkMark: { fontSize: 16, color: '#e94560', fontWeight: 700 },
  empty: { textAlign: 'center', color: '#6c6c80', padding: '30px 0', fontSize: 14 }
}
