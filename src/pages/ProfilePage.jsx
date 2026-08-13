import { useState, useEffect } from 'react'
import { Wallet, Send, ArrowDownLeft, ArrowUpRight, Users, Gift, Trash2, Eye, EyeOff } from 'lucide-react'
import api from '../api'
import { useApp } from '../AppContext'

export default function ProfilePage() {
  const { user, logout, hasPaymentPassword, updatePaymentPasswordStatus } = useApp()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [showRedPacket, setShowRedPacket] = useState(false)
  const [amount, setAmount] = useState('')
  const [targetUser, setTargetUser] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [packetPwd, setPacketPwd] = useState('')
  const [showPacketPwd, setShowPacketPwd] = useState(false)
  const [packetPwdError, setPacketPwdError] = useState('')
  const [activeTab, setActiveTab] = useState('wallet')
  const [contacts, setContacts] = useState([])
  const [clearingChatId, setClearingChatId] = useState(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferTarget, setTransferTarget] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferPwd, setTransferPwd] = useState('')
  const [showTransferPwd, setShowTransferPwd] = useState(false)
  const [transferPwdError, setTransferPwdError] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [showSetPwd, setShowSetPwd] = useState(false)
  const [setPwdVal, setSetPwdVal] = useState('')
  const [setPwdConfirm, setSetPwdConfirm] = useState('')
  const [showSetPwdEye, setShowSetPwdEye] = useState(false)
  const [setPwdError, setSetPwdError] = useState('')
  const [settingPwd, setSettingPwd] = useState(false)

  useEffect(() => {
    loadBalance()
    loadTransactions()
    loadContacts()
  }, [])

  const loadBalance = async () => {
    try {
      const data = await api.wallet.getBalance()
      setBalance(data.balance || 0)
    } catch (e) {}
  }

  const loadTransactions = async () => {
    try {
      const data = await api.wallet.getTransactions()
      setTransactions(data.transactions || [])
    } catch (e) {}
  }

  const loadContacts = async () => {
    try {
      const data = await api.contacts.list()
      setContacts(Array.isArray(data) ? data : (data.contacts || []))
    } catch (e) {}
  }

  const handleSendRedPacket = async () => {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) return
    if (!targetUser.trim()) return
    if (!packetPwd || !/^\d{6}$/.test(packetPwd)) {
      setPacketPwdError('请输入6位支付密码')
      return
    }
    setPacketPwdError('')
    setSending(true)
    try {
      await api.wallet.sendRedPacket({ amount: numAmount, message: message.trim(), targetUsername, password: packetPwd })
      setAmount('')
      setTargetUser('')
      setMessage('')
      setPacketPwd('')
      setShowPacketPwd(false)
      setPacketPwdError('')
      setShowRedPacket(false)
      await loadBalance()
      await loadTransactions()
    } catch (e) {
      setPacketPwdError(e.message || '发送失败')
    } finally {
      setSending(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferTarget.trim()) return
    const numAmount = parseFloat(transferAmount)
    if (!numAmount || numAmount <= 0) return
    if (!transferPwd || !/^\d{6}$/.test(transferPwd)) {
      setTransferPwdError('请输入6位支付密码')
      return
    }
    setTransferPwdError('')
    setTransferring(true)
    try {
      await api.wallet.transfer({ targetUsername: transferTarget.trim(), amount: numAmount, password: transferPwd })
      setTransferTarget('')
      setTransferAmount('')
      setTransferPwd('')
      setShowTransferPwd(false)
      setTransferPwdError('')
      setShowTransfer(false)
      await loadBalance()
      await loadTransactions()
    } catch (e) {
      setTransferPwdError(e.message || '转账失败')
    } finally {
      setTransferring(false)
    }
  }

  const handleSetPassword = async () => {
    setSetPwdError('')
    if (!setPwdVal || !/^\d{6}$/.test(setPwdVal)) {
      setSetPwdError('支付密码必须为6位数字')
      return
    }
    if (setPwdVal !== setPwdConfirm) {
      setSetPwdError('两次输入的密码不一致')
      return
    }
    setSettingPwd(true)
    try {
      await api.wallet.setPassword(setPwdVal)
      setShowSetPwd(false)
      setSetPwdVal('')
      setSetPwdConfirm('')
      updatePaymentPasswordStatus(true)
      await loadBalance()
      await loadTransactions()
    } catch (e) {
      setSetPwdError(e.message || '设置失败')
    } finally {
      setSettingPwd(false)
    }
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
      alert('清除失败: ' + e.message)
    } finally {
      setClearingChatId(null)
    }
  }

  const formatTime = (t) => {
    if (!t) return ''
    const d = new Date(t)
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const isImageUrl = (text) => /\.(jpg|jpeg|png|webp|gif|bmp)/i.test(text) && (text.startsWith('http') || text.startsWith('data:image'))

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>我</h1>
      </div>

      <div style={styles.profileCard}>
        <div style={styles.avatarLarge}>
          {user?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <h2 style={styles.name}>{user?.username || '用户'}</h2>
        <p style={styles.userId}>ID: {user?.id || '---'}</p>
      </div>

      {!hasPaymentPassword ? (
        <div style={styles.lockedWalletCard}>
          <div style={styles.lockIcon}>🔒</div>
          <div style={styles.lockedTitle}>钱包尚未启用</div>
          <div style={styles.lockedDesc}>设置6位数字支付密码后，即可使用发红包、转账等钱包功能</div>
          <button onClick={() => setShowSetPwd(true)} style={styles.enableBtn}>立即启用钱包</button>
        </div>
      ) : (
        <div style={styles.balanceCard}>
          <span style={styles.balanceLabel}>钱包余额</span>
          <span style={styles.balanceAmount}>¥{balance.toFixed(2)}</span>
          <div style={styles.balanceActions}>
            <button onClick={() => setShowRedPacket(true)} style={styles.actionButton}>
              <Gift size={18} color="#fff" />
              <span>发红包</span>
            </button>
            <button onClick={() => setShowTransfer(true)} style={styles.actionButton}>
              <Send size={18} color="#fff" />
              <span>转账</span>
            </button>
        </div>
      </div>
      )}

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('wallet')}
          style={{ ...styles.tab, ...(activeTab === 'wallet' ? styles.tabActive : {}) }}
        >
          <Wallet size={16} />
          <span>交易记录</span>
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          style={{ ...styles.tab, ...(activeTab === 'friends' ? styles.tabActive : {}) }}
        >
          <Users size={16} />
          <span>好友列表</span>
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'wallet' && (
          <div style={styles.list}>
            {transactions.length === 0 ? (
              <div style={styles.empty}>暂无交易记录</div>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} style={styles.txItem}>
                  <div style={{
                    ...styles.txIcon,
                    background: tx.type === 'receive' || tx.type === 'redpacket_in' ? '#1a3a2a' : '#3a1a1a'
                  }}>
                    {tx.type === 'receive' || tx.type === 'redpacket_in'
                      ? <ArrowDownLeft size={18} color="#4ade80" />
                      : <ArrowUpRight size={18} color="#e94560" />
                    }
                  </div>
                  <div style={styles.txInfo}>
                    <span style={styles.txDesc}>{tx.description || tx.type}</span>
                    <span style={styles.txTime}>{formatTime(tx.createdAt)}</span>
                  </div>
                  <span style={{
                    ...styles.txAmount,
                    color: tx.type === 'receive' || tx.type === 'redpacket_in' ? '#4ade80' : '#e94560'
                  }}>
                    {tx.type === 'receive' || tx.type === 'redpacket_in' ? '+' : '-'}¥{Math.abs(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div style={styles.list}>
            {contacts.length === 0 ? (
              <div style={styles.empty}>暂无联系人</div>
            ) : (
              contacts.map(contact => (
                <div key={contact.id} style={styles.contactItem}>
                  <div style={{
                    ...styles.contactAvatar,
                    background: '#3b3b6d'
                  }}>
                    {(contact.username || '?')[0].toUpperCase()}
                  </div>
                  <div style={styles.contactInfo}>
                    <div style={styles.contactName}>{contact.username}</div>
                    {contact.lastMessage && (
                      <div style={styles.contactLastMsg}>
                        {isImageUrl(contact.lastMessage)
                          ? <img src={contact.lastMessage} alt="" style={styles.lastMsgImg} />
                          : <span>{contact.lastMessage.substring(0, 30)}{contact.lastMessage.length > 30 ? '...' : ''}</span>
                        }
                      </div>
                    )}
                  </div>
                  {contact.chatId && (
                    <button
                      onClick={() => handleClearChat(contact)}
                      style={{
                        ...styles.clearBtn,
                        opacity: clearingChatId === contact.chatId ? 0.4 : 1
                      }}
                      disabled={clearingChatId === contact.chatId}
                    >
                      {clearingChatId === contact.chatId ? '...' : <Trash2 size={16} />}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <button onClick={logout} style={styles.logoutBtn}>退出登录</button>

      {showRedPacket && (
        <div style={styles.modal} onClick={() => setShowRedPacket(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            {/* 发红包弹窗 */}
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>发红包</span>
              <button onClick={() => setShowRedPacket(false)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>接收人用户名</label>
              <input
                style={styles.input}
                placeholder="输入好友用户名"
                value={targetUser}
                onChange={e => setTargetUser(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>金额 (¥)</label>
              <input
                style={styles.input}
                type="number"
                placeholder="输入金额"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>祝福语（可选）</label>
              <input
                style={styles.input}
                placeholder="新年快乐！"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>
            <div style={styles.pwdGroup}>
              <label style={styles.label}>支付密码</label>
              <div style={styles.pwdWrap}>
                <span style={styles.pwdIcon}>🔒</span>
                <input
                  style={styles.pwdInput}
                  type={showPacketPwd ? 'text' : 'password'}
                  placeholder="6位数字密码"
                  maxLength={6}
                  value={packetPwd}
                  onChange={e => setPacketPwd(e.target.value.replace(/\D/g, ''))}
                />
                <button type="button" onClick={() => setShowPacketPwd(!showPacketPwd)} style={styles.eyeBtn}>
                  {showPacketPwd ? <EyeOff size={18} color="#6c6c80" /> : <Eye size={18} color="#6c6c80" />}
                </button>
              </div>
            </div>
            <button
              onClick={handleSendRedPacket}
              style={{
                ...styles.sendBtn,
                opacity: sending ? 0.5 : 1
              }}
              disabled={sending}
            >
              {sending ? '发送中...' : '发送红包'}
            </button>
          </div>
        </div>
      )}

      {/* 转账弹窗 */}
      {showTransfer && (
        <div style={styles.modal} onClick={() => setShowTransfer(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>转账</span>
              <button onClick={() => setShowTransfer(false)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>收款人用户名</label>
              <input
                style={styles.input}
                placeholder="输入好友用户名"
                value={transferTarget}
                onChange={e => setTransferTarget(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>金额 (¥)</label>
              <input
                style={styles.input}
                type="number"
                placeholder="输入金额"
                value={transferAmount}
                onChange={e => setTransferAmount(e.target.value)}
                min="0.01"
                step="0.01"
              />
            </div>
            <div style={styles.pwdGroup}>
              <label style={styles.label}>支付密码</label>
              <div style={styles.pwdWrap}>
                <span style={styles.pwdIcon}>🔒</span>
                <input
                  style={styles.pwdInput}
                  type={showTransferPwd ? 'text' : 'password'}
                  placeholder="6位数字密码"
                  maxLength={6}
                  value={transferPwd}
                  onChange={e => setTransferPwd(e.target.value.replace(/\D/g, ''))}
                />
                <button type="button" onClick={() => setShowTransferPwd(!showTransferPwd)} style={styles.eyeBtn}>
                  {showTransferPwd ? <EyeOff size={18} color="#6c6c80" /> : <Eye size={18} color="#6c6c80" />}
                </button>
              </div>
            </div>
            {transferPwdError && <p style={{ color: '#e94560', fontSize: 13, margin: '4px 0 0 0' }}>{transferPwdError}</p>}
            <button
              onClick={handleTransfer}
              style={{
                ...styles.sendBtn,
                opacity: transferring ? 0.5 : 1
              }}
              disabled={transferring}
            >
              {transferring ? '转账中...' : '确认转账'}
            </button>
          </div>
        </div>
      )}

      {/* 启用钱包弹窗 */}
      {showSetPwd && (
        <div style={styles.modal} onClick={() => setShowSetPwd(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>启用钱包</span>
              <button onClick={() => setShowSetPwd(false)} style={styles.closeBtn}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#6c6c80', margin: 0 }}>设置6位数字支付密码后即可使用钱包功能</p>
            <div style={styles.pwdGroup}>
              <label style={styles.label}>支付密码</label>
              <div style={styles.pwdWrap}>
                <span style={styles.pwdIcon}>🔒</span>
                <input
                  style={styles.pwdInput}
                  type={showSetPwdEye ? 'text' : 'password'}
                  placeholder="6位数字密码"
                  maxLength={6}
                  value={setPwdVal}
                  onChange={e => setSetPwdVal(e.target.value.replace(/\D/g, ''))}
                />
                <button type="button" onClick={() => setShowSetPwdEye(!showSetPwdEye)} style={styles.eyeBtn}>
                  {showSetPwdEye ? <EyeOff size={18} color="#6c6c80" /> : <Eye size={18} color="#6c6c80" />}
                </button>
              </div>
            </div>
            <div style={styles.pwdGroup}>
              <label style={styles.label}>确认支付密码</label>
              <div style={styles.pwdWrap}>
                <span style={styles.pwdIcon}>🔒</span>
                <input
                  style={styles.pwdInput}
                  type={showSetPwdEye ? 'text' : 'password'}
                  placeholder="再次输入6位密码"
                  maxLength={6}
                  value={setPwdConfirm}
                  onChange={e => setSetPwdConfirm(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
            {setPwdError && <p style={{ color: '#e94560', fontSize: 13, margin: 0 }}>{setPwdError}</p>}
            <button
              onClick={handleSetPassword}
              style={{ ...styles.sendBtn, opacity: settingPwd ? 0.5 : 1 }}
              disabled={settingPwd}
            >
              {settingPwd ? '设置中...' : '确认启用'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0f0f1a' },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #2a2a4a'
  },
  title: { fontSize: 22, fontWeight: 700 },
  profileCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 20px',
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)'
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 28,
    marginBottom: 12
  },
  name: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  userId: { fontSize: 13, color: '#6c6c80' },
  balanceCard: {
    margin: '16px 20px',
    padding: '20px',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    borderRadius: 16,
    textAlign: 'center'
  },
  balanceLabel: { fontSize: 14, opacity: 0.9, display: 'block' },
  balanceAmount: { fontSize: 36, fontWeight: 700, display: 'block', marginTop: 4 },
  balanceActions: { display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14
  },
  lockedWalletCard: {
    margin: '16px 20px',
    padding: '32px 20px',
    background: 'linear-gradient(135deg, #2a2a4a, #1a1a2e)',
    borderRadius: 16,
    textAlign: 'center',
    border: '1px dashed #3a3a5a'
  },
  lockIcon: { fontSize: 40, marginBottom: 12 },
  lockedTitle: { fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 },
  lockedDesc: { fontSize: 13, color: '#6c6c80', marginBottom: 20, lineHeight: 1.6 },
  enableBtn: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer'
  },
  tabs: {
    display: 'flex',
    margin: '0 20px',
    background: '#1a1a2e',
    borderRadius: 10,
    padding: 4,
    gap: 4
  },
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px',
    borderRadius: 8,
    color: '#6c6c80',
    fontSize: 14,
    transition: 'all 0.2s'
  },
  tabActive: { background: '#e94560', color: '#fff' },
  content: { flex: 1, overflowY: 'auto', padding: '12px 20px' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  empty: { textAlign: 'center', color: '#6c6c80', padding: '40px 0' },
  txItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid #1a1a2e'
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  txInfo: { flex: 1 },
  txDesc: { display: 'block', fontSize: 14 },
  txTime: { display: 'block', fontSize: 12, color: '#6c6c80', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: 600 },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid #1a1a2e'
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 16,
    color: '#fff',
    flexShrink: 0
  },
  contactInfo: { flex: 1, minWidth: 0 },
  contactName: { fontSize: 15, fontWeight: 600, color: '#e0e0f0' },
  contactLastMsg: { fontSize: 13, color: '#6c6c80', marginTop: 2 },
  lastMsgImg: { width: 60, height: 60, borderRadius: 6, objectFit: 'cover' },
  clearBtn: {
    padding: '6px 8px',
    background: 'transparent',
    border: 'none',
    color: '#e94560',
    cursor: 'pointer',
    borderRadius: 6,
    flexShrink: 0
  },
  logoutBtn: {
    margin: '20px',
    padding: '14px',
    background: '#1a1a2e',
    borderRadius: 10,
    color: '#e94560',
    fontWeight: 600,
    fontSize: 15,
    border: '1px solid #2a2a4a'
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
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 600 },
  closeBtn: { padding: 4, color: '#6c6c80', fontSize: 18 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, color: '#6c6c80' },
  input: {
    padding: '12px 14px',
    background: '#16213e',
    borderRadius: 10,
    fontSize: 15
  },
  sendBtn: {
    padding: '14px',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    borderRadius: 10,
    color: '#fff',
    fontWeight: 600,
    fontSize: 16
  },
  pwdGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  pwdWrap: {
    position: 'relative', display: 'flex', alignItems: 'center'
  },
  pwdIcon: { position: 'absolute', left: 14, fontSize: 16 },
  pwdInput: {
    width: '100%', padding: '12px 48px 12px 44px',
    background: '#16213e', borderRadius: 10, fontSize: 15,
    color: '#fff', outline: 'none', border: '1px solid #2a2a4a',
    letterSpacing: 4, textAlign: 'center'
  },
  eyeBtn: { position: 'absolute', right: 12, padding: 8, background: 'none', border: 'none', cursor: 'pointer' }
}
