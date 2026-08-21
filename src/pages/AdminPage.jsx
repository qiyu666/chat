import { useState, useEffect } from 'react'

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AdminPage({ onLogout }) {
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [chats, setChats] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [balInputs, setBalInputs] = useState({})

  const loadAll = async () => {
    const [s, u, tx, c] = await Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/transactions').then(r => r.json()),
      fetch('/api/admin/chats').then(r => r.json())
    ])
    setStats(s)
    setUsers(u.users || [])
    setTransactions(tx.transactions || [])
    setChats(c.chats || [])
  }

  useEffect(() => { loadAll() }, [])

  const handleBalanceChange = async (userId, val) => {
    setBalInputs(p => ({ ...p, [userId]: val }))
    const num = parseFloat(val)
    if (isNaN(num)) return
    try {
      await fetch(`/api/admin/users/${userId}/balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: num })
      })
      loadAll()
    } catch (e) {}
  }

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`确定删除用户 "${username}" 吗？所有相关数据将被清除。`)) return
    try {
      await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      loadAll()
    } catch (e) {}
  }

  const handleClearChat = async (chatId) => {
    try {
      await fetch(`/api/admin/messages/${chatId}`, { method: 'DELETE' })
      loadAll()
    } catch (e) {}
  }

  const filteredUsers = users.filter(u =>
    u.username.includes(userSearch) || u.chat_code.includes(userSearch)
  )

  const tabs = [
    { id: 'stats', label: '概览' },
    { id: 'users', label: '用户' },
    { id: 'transactions', label: '交易' },
    { id: 'chats', label: '聊天' }
  ]

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.topbar}>
        <span style={styles.topbarTitle}>⚙️ 管理后台</span>
        <button onClick={onLogout} style={styles.logoutBtn}>退出</button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...styles.tab,
            ...(tab === t.id ? styles.tabActive : {})
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {tab === 'stats' && stats && (
          <div style={styles.statsGrid}>
            <StatCard label="用户总数" value={stats.totalUsers} color="#e94560" />
            <StatCard label="消息总数" value={stats.totalMessages} color="#4ade80" />
            <StatCard label="交易笔数" value={stats.totalTransactions} color="#60a5fa" />
            <StatCard label="总余额" value={`¥${stats.totalBalance}`} color="#fbbf24" />
          </div>
        )}

        {tab === 'users' && (
          <>
            <input style={styles.searchInput} placeholder="搜索用户名或chat号..." value={userSearch}
              onChange={e => setUserSearch(e.target.value)} />
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>用户名</th><th style={styles.th}>Chat号</th>
                    <th style={styles.th}>余额</th><th style={styles.th}>支付密码</th>
                    <th style={styles.th}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td style={styles.td}>{u.username}</td>
                      <td style={styles.td}>{u.chat_code}</td>
                      <td style={styles.td}>
                        <input style={styles.balInput} type="number" step="0.01"
                          value={balInputs[u.id] ?? u.balance}
                          onChange={e => setBalInputs(p => ({ ...p, [u.id]: e.target.value }))}
                          onBlur={e => handleBalanceChange(u.id, e.target.value)}
                        />
                      </td>
                      <td style={styles.td}>{u.hasPaymentPassword ? '✅' : '❌'}</td>
                      <td style={styles.td}>
                        <button style={styles.delBtn} onClick={() => handleDeleteUser(u.id, u.username)}>删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'transactions' && (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>时间</th><th style={styles.th}>用户</th>
                  <th style={styles.th}>类型</th><th style={styles.th}>金额</th>
                  <th style={styles.th}>描述</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td style={styles.td}>{formatTime(tx.created_at)}</td>
                    <td style={styles.td}>{tx.username}</td>
                    <td style={{...styles.td, color: tx.type.startsWith('receive') ? '#4ade80' : '#e94560'}}>{tx.type}</td>
                    <td style={{...styles.td, fontWeight: 600, color: tx.type.startsWith('receive') ? '#4ade80' : '#e94560'}}>
                      {tx.type.startsWith('receive') ? '+' : '-'}¥{tx.amount.toFixed(2)}
                    </td>
                    <td style={styles.td}>{tx.description || '-'}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={5} style={{...styles.td, textAlign: 'center', color: '#6c6c80'}}>暂无交易记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'chats' && (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr><th style={styles.th}>用户1</th><th style={styles.th}>用户2</th><th style={styles.th}>消息数</th><th style={styles.th}>操作</th></tr>
              </thead>
              <tbody>
                {chats.map(c => (
                  <tr key={c.chatId}>
                    <td style={styles.td}>{c.user1}</td>
                    <td style={styles.td}>{c.user2}</td>
                    <td style={styles.td}>{c.messageCount}</td>
                    <td style={styles.td}>
                      <button style={styles.delBtn} onClick={() => handleClearChat(c.chatId)}>清空消息</button>
                    </td>
                  </tr>
                ))}
                {chats.length === 0 && (
                  <tr><td colSpan={4} style={{...styles.td, textAlign: 'center', color: '#6c6c80'}}>暂无聊天记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{...styles.statCard, borderTop: `3px solid ${color}`}}>
      <div style={{fontSize: 28, fontWeight: 700, color}}>{value}</div>
      <div style={{fontSize: 13, color: '#6c6c80', marginTop: 4}}>{label}</div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f1a', color: '#fff' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #2a2a4a', background: '#1a1a2e' },
  topbarTitle: { fontSize: 18, fontWeight: 700 },
  logoutBtn: { background: '#2a2a4a', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 20px', cursor: 'pointer', fontSize: 14 },
  tabs: { display: 'flex', gap: 0, borderBottom: '1px solid #2a2a4a', background: '#1a1a2e' },
  tab: { flex: 1, padding: '14px 0', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#6c6c80', fontSize: 14, cursor: 'pointer', fontWeight: 500 },
  tabActive: { color: '#e94560', borderBottomColor: '#e94560' },
  content: { flex: 1, overflow: 'auto', padding: '24px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  statCard: { background: '#1a1a2e', borderRadius: 16, padding: '24px 20px', textAlign: 'center' },
  searchInput: { width: '100%', padding: '12px 16px', background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' },
  tableWrap: { background: '#1a1a2e', borderRadius: 16, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '14px 16px', textAlign: 'left', fontSize: 12, color: '#6c6c80', textTransform: 'uppercase', borderBottom: '1px solid #2a2a4a', fontWeight: 600 },
  td: { padding: '12px 16px', fontSize: 14, borderBottom: '1px solid #1a1a2e' },
  balInput: { width: 100, padding: '6px 10px', background: '#0f0f1a', border: '1px solid #2a2a4a', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none' },
  delBtn: { background: '#3a1a1a', border: 'none', borderRadius: 8, color: '#e94560', padding: '6px 14px', cursor: 'pointer', fontSize: 13 }
}
