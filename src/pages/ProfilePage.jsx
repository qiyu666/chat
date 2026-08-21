import { useState, useEffect } from 'react'
import { Send, Users, Gift, Trash2, Eye, EyeOff, Key, Lock, ShieldAlert, UserX, Settings } from 'lucide-react'
import api from '../api'
import { useApp } from '../AppContext'

export default function ProfilePage({ onNavigate }) {
  const { user, logout, hasPaymentPassword, updatePaymentPasswordStatus } = useApp()
  const [balance, setBalance] = useState(0)
  const [showRedPacket, setShowRedPacket] = useState(false)
  const [amount, setAmount] = useState('')
  const [targetUser, setTargetUser] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [packetPwd, setPacketPwd] = useState('')
  const [showPacketPwd, setShowPacketPwd] = useState(false)
  const [packetPwdError, setPacketPwdError] = useState('')
  const [activeTab, setActiveTab] = useState('friends')
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

  // 改登录密码状态
  const [showChangeLoginPwd, setShowChangeLoginPwd] = useState(false)
  const [loginOldPwd, setLoginOldPwd] = useState('')
  const [loginNewPwd, setLoginNewPwd] = useState('')
  const [loginNewPwd2, setLoginNewPwd2] = useState('')
  const [showLoginOldEye, setShowLoginOldEye] = useState(false)
  const [showLoginNewEye, setShowLoginNewEye] = useState(false)
  const [showLoginNew2Eye, setShowLoginNew2Eye] = useState(false)
  const [loginPwdError, setLoginPwdError] = useState('')
  const [changingLoginPwd, setChangingLoginPwd] = useState(false)

  // 改支付密码状态
  const [showChangePayPwd, setShowChangePayPwd] = useState(false)
  const [payOldPwd, setPayOldPwd] = useState('')
  const [payNewPwd, setPayNewPwd] = useState('')
  const [payNewPwd2, setPayNewPwd2] = useState('')
  const [showPayOldEye, setShowPayOldEye] = useState(false)
  const [showPayNewEye, setShowPayNewEye] = useState(false)
  const [showPayNew2Eye, setShowPayNew2Eye] = useState(false)
  const [payPwdError, setPayPwdError] = useState('')
  const [changingPayPwd, setChangingPayPwd] = useState(false)

  // 注销账号状态
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteConfirmPwd, setDeleteConfirmPwd] = useState('')
  const [showDeleteEye, setShowDeleteEye] = useState(false)
  const [deletePwdError, setDeletePwdError] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1) // 1=确认风险 2=输入密码

  // chat号编辑状态
  const [showEditChatCode, setShowEditChatCode] = useState(false)
  const [editChatCodeVal, setEditChatCodeVal] = useState('')
  const [editChatCodeError, setEditChatCodeError] = useState('')
  const [editingChatCode, setEditingChatCode] = useState(false)

  useEffect(() => {
    loadBalance()
    loadContacts()
  }, [])

  const loadBalance = async () => {
    try {
      const data = await api.wallet.getBalance()
      setBalance(data.balance || 0)
    } catch (e) {}
  }

  const loadContacts = async () => {
    try {
      const data = await api.contacts.list()
      setContacts(Array.isArray(data) ? data : (data.contacts || []))
    } catch (e) {}
  }

  const resetLoginPwdForm = () => {
    setLoginOldPwd('')
    setLoginNewPwd('')
    setLoginNewPwd2('')
    setLoginPwdError('')
    setShowLoginOldEye(false)
    setShowLoginNewEye(false)
    setShowLoginNew2Eye(false)
    setChangingLoginPwd(false)
  }

  const resetPayPwdForm = () => {
    setPayOldPwd('')
    setPayNewPwd('')
    setPayNewPwd2('')
    setPayPwdError('')
    setShowPayOldEye(false)
    setShowPayNewEye(false)
    setShowPayNew2Eye(false)
    setChangingPayPwd(false)
  }

  const resetDeleteForm = () => {
    setDeleteConfirmPwd('')
    setDeletePwdError('')
    setShowDeleteEye(false)
    setDeletingAccount(false)
    setDeleteStep(1)
  }

  // ── 修改chat号 ──────────────────────────────────
  const handleUpdateChatCode = async () => {
    setEditChatCodeError('')
    const code = editChatCodeVal.trim()
    if (!code || !/^[a-zA-Z0-9]{6,20}$/.test(code)) { setEditChatCodeError('chat号需6-20位字母或数字'); return }
    setEditingChatCode(true)
    try {
      await api.auth.updateChatCode(code)
      setShowEditChatCode(false)
      setEditChatCodeVal('')
      // 刷新用户信息
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      stored.chat_code = code
      localStorage.setItem('user', JSON.stringify(stored))
      const fresh = await api.auth.getMe()
      if (fresh.user) {
        localStorage.setItem('user', JSON.stringify(fresh.user))
        // 通知父组件刷新（通过dispatch或直接）
      }
    } catch (e) {
      setEditChatCodeError(e.message || '修改失败')
    } finally {
      setEditingChatCode(false)
    }
  }

  // ── 改登录密码 ──────────────────────────────────
  const handleChangeLoginPwd = async () => {
    setLoginPwdError('')
    if (!loginOldPwd) { setLoginPwdError('请输入旧密码'); return }
    if (!loginNewPwd || loginNewPwd.length < 4) { setLoginPwdError('新密码至少4位'); return }
    if (loginNewPwd !== loginNewPwd2) { setLoginPwdError('两次输入的新密码不一致'); return }
    if (loginOldPwd === loginNewPwd) { setLoginPwdError('新密码不能与旧密码相同'); return }
    setChangingLoginPwd(true)
    try {
      await api.auth.changePassword(loginOldPwd, loginNewPwd)
      alert('登录密码修改成功，请重新登录')
      setShowChangeLoginPwd(false)
      resetLoginPwdForm()
      logout()
    } catch (e) {
      setLoginPwdError(e.message || '修改失败')
    } finally {
      setChangingLoginPwd(false)
    }
  }

  // ── 改支付密码 ──────────────────────────────────
  const handleChangePayPwd = async () => {
    setPayPwdError('')
    if (!payOldPwd || !/^\d{6}$/.test(payOldPwd)) { setPayPwdError('请输入6位旧支付密码'); return }
    if (!payNewPwd || !/^\d{6}$/.test(payNewPwd)) { setPayPwdError('新支付密码必须为6位数字'); return }
    if (payNewPwd !== payNewPwd2) { setPayPwdError('两次输入的新密码不一致'); return }
    if (payOldPwd === payNewPwd) { setPayPwdError('新密码不能与旧密码相同'); return }
    setChangingPayPwd(true)
    try {
      await api.wallet.changePassword(payOldPwd, payNewPwd)
      alert('支付密码修改成功')
      setShowChangePayPwd(false)
      resetPayPwdForm()
    } catch (e) {
      setPayPwdError(e.message || '修改失败')
    } finally {
      setChangingPayPwd(false)
    }
  }

  // ── 注销账号 ──────────────────────────────────
  const handleDeleteAccount = async () => {
    setDeletePwdError('')
    if (!deleteConfirmPwd) { setDeletePwdError('请输入登录密码'); return }
    setDeletingAccount(true)
    try {
      await api.auth.deleteAccount(deleteConfirmPwd)
      alert('账号已注销')
      setShowDeleteAccount(false)
      resetDeleteForm()
      logout()
    } catch (e) {
      setDeletePwdError(e.message || '注销失败')
    } finally {
      setDeletingAccount(false)
    }
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
      await api.wallet.sendRedPacket({ amount: numAmount, message: message.trim(), targetUsername: targetUser.trim(), password: packetPwd })
      setAmount('')
      setTargetUser('')
      setMessage('')
      setPacketPwd('')
      setShowPacketPwd(false)
      setPacketPwdError('')
      setShowRedPacket(false)
      await loadBalance()
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
        {user?.username === 'qiyu' && (
          <a href="/admin" style={styles.adminBtn} title="管理后台">后台</a>
        )}
      </div>

      <div style={styles.profileCard}>
        <div style={styles.avatarLarge}>
          {user?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <h2 style={styles.name}>{user?.username || '用户'}</h2>
        <div style={styles.chatCodeRow}>
          <span style={styles.userId}>chat号: {user?.chat_code || '---'}</span>
          <button onClick={() => { setEditChatCodeVal(user?.chat_code || '') ; setShowEditChatCode(true) }} style={styles.editChatCodeBtn}>修改</button>
        </div>
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
          <button
            onClick={() => onNavigate && onNavigate('transactions')}
            style={{
              position: 'absolute',
              top: 16, right: 16,
              background: 'rgba(255,255,255,0.25)',
              borderRadius: '50%',
              width: 48, height: 48,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer', padding: 0,
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              zIndex: 10
            }}
            title="余额明细"
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap' }}>余额</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap' }}>明细</div>
          </button>
          <span style={styles.balanceLabel}>钱包余额</span>
          <span style={styles.balanceAmount}>¥{balance.toFixed(2)}</span>
          <div style={styles.balanceActions}>
            <button onClick={() => setShowRedPacket(true)} style={styles.actionButton}>
              <Gift size={26} color="#fff" style={{ pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>发红包</span>
            </button>
            <button onClick={() => setShowTransfer(true)} style={styles.actionButton}>
              <Send size={26} color="#fff" style={{ pointerEvents: 'none' }} />
              <span style={{ pointerEvents: 'none' }}>转账</span>
            </button>
        </div>
      </div>
      )}

      {/* ── 账号与安全设置 ──────────────────────────────────── */}
      <div style={styles.settingsCard}>
        <div style={styles.settingsHeader}>
          <Settings size={26} color="#6c6c80" />
          <span style={styles.settingsTitle}>账号与安全</span>
        </div>
        <button
          onClick={() => { resetLoginPwdForm(); setShowChangeLoginPwd(true) }}
          style={styles.settingItem}
        >
          <div style={{ ...styles.settingIcon, background: 'rgba(233,69,96,0.15)' }}>
            <Key size={26} color="#e94560" />
          </div>
          <span style={styles.settingLabel}>修改登录密码</span>
          <span style={styles.settingArrow}>›</span>
        </button>

        {hasPaymentPassword && (
          <button
            onClick={() => { resetPayPwdForm(); setShowChangePayPwd(true) }}
            style={styles.settingItem}
          >
            <div style={{ ...styles.settingIcon, background: 'rgba(74,222,128,0.15)' }}>
              <Lock size={26} color="#4ade80" />
            </div>
            <span style={styles.settingLabel}>修改支付密码</span>
            <span style={styles.settingArrow}>›</span>
          </button>
        )}

        <button
          onClick={() => { resetDeleteForm(); setShowDeleteAccount(true) }}
          style={{ ...styles.settingItem, borderBottom: 'none' }}
        >
          <div style={{ ...styles.settingIcon, background: 'rgba(239,68,68,0.15)' }}>
            <UserX size={26} color="#ef4444" />
          </div>
          <span style={{ ...styles.settingLabel, color: '#ef4444' }}>注销账号</span>
          <span style={{ ...styles.settingArrow, color: '#ef4444' }}>›</span>
        </button>
      </div>

      <div style={styles.tabs}>
        <div style={{ ...styles.tab, ...styles.tabActive, flex: 1 }}>
          <Users size={24} />
          <span>好友列表</span>
        </div>
      </div>

      <div style={styles.content}>
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
                    {clearingChatId === contact.chatId ? '...' : <Trash2 size={24} />}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <button onClick={logout} style={styles.logoutBtn}>退出登录</button>

      {/* ── 发红包弹窗 ─────────────────────── */}
      {showRedPacket && (
        <div style={styles.modal} onClick={() => setShowRedPacket(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
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
                  {showPacketPwd ? <EyeOff size={26} color="#6c6c80" /> : <Eye size={26} color="#6c6c80" />}
                </button>
              </div>
            </div>
            {packetPwdError && <p style={styles.errorText}>{packetPwdError}</p>}
            <button
              onClick={handleSendRedPacket}
              style={{ ...styles.sendBtn, opacity: sending ? 0.5 : 1 }}
              disabled={sending}
            >
              {sending ? '发送中...' : '发送红包'}
            </button>
          </div>
        </div>
      )}

      {/* ── 转账弹窗 ─────────────────────── */}
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
                  {showTransferPwd ? <EyeOff size={26} color="#6c6c80" /> : <Eye size={26} color="#6c6c80" />}
                </button>
              </div>
            </div>
            {transferPwdError && <p style={styles.errorText}>{transferPwdError}</p>}
            <button
              onClick={handleTransfer}
              style={{ ...styles.sendBtn, opacity: transferring ? 0.5 : 1 }}
              disabled={transferring}
            >
              {transferring ? '转账中...' : '确认转账'}
            </button>
          </div>
        </div>
      )}

      {/* ── 启用钱包（设置支付密码）弹窗 ─────────────────────── */}
      {showSetPwd && (
        <div style={styles.modal} onClick={() => setShowSetPwd(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>启用钱包</span>
              <button onClick={() => setShowSetPwd(false)} style={styles.closeBtn}>✕</button>
            </div>
            <p style={{ fontSize: 16, color: '#8a8aa0', margin: 0 }}>设置6位数字支付密码后即可使用钱包功能</p>
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
                  {showSetPwdEye ? <EyeOff size={26} color="#6c6c80" /> : <Eye size={26} color="#6c6c80" />}
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
            {setPwdError && <p style={styles.errorText}>{setPwdError}</p>}
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

      {/* ── 修改登录密码弹窗 ─────────────────────── */}
      {showChangeLoginPwd && (
        <div style={styles.modal} onClick={() => { setShowChangeLoginPwd(false); resetLoginPwdForm() }}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>修改登录密码</span>
              <button onClick={() => { setShowChangeLoginPwd(false); resetLoginPwdForm() }} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>旧密码</label>
              <div style={styles.textPwdWrap}>
                <input
                  style={styles.textPwdInput}
                  type={showLoginOldEye ? 'text' : 'password'}
                  placeholder="请输入当前登录密码"
                  value={loginOldPwd}
                  onChange={e => setLoginOldPwd(e.target.value)}
                />
                <button type="button" onClick={() => setShowLoginOldEye(!showLoginOldEye)} style={styles.eyeBtn}>
                  {showLoginOldEye ? <EyeOff size={26} color="#6c6c80" /> : <Eye size={26} color="#6c6c80" />}
                </button>
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>新密码（至少4位）</label>
              <div style={styles.textPwdWrap}>
                <input
                  style={styles.textPwdInput}
                  type={showLoginNewEye ? 'text' : 'password'}
                  placeholder="请输入新密码"
                  value={loginNewPwd}
                  onChange={e => setLoginNewPwd(e.target.value)}
                />
                <button type="button" onClick={() => setShowLoginNewEye(!showLoginNewEye)} style={styles.eyeBtn}>
                  {showLoginNewEye ? <EyeOff size={26} color="#6c6c80" /> : <Eye size={26} color="#6c6c80" />}
                </button>
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>确认新密码</label>
              <div style={styles.textPwdWrap}>
                <input
                  style={styles.textPwdInput}
                  type={showLoginNew2Eye ? 'text' : 'password'}
                  placeholder="再次输入新密码"
                  value={loginNewPwd2}
                  onChange={e => setLoginNewPwd2(e.target.value)}
                />
                <button type="button" onClick={() => setShowLoginNew2Eye(!showLoginNew2Eye)} style={styles.eyeBtn}>
                  {showLoginNew2Eye ? <EyeOff size={26} color="#6c6c80" /> : <Eye size={26} color="#6c6c80" />}
                </button>
              </div>
            </div>
            {loginPwdError && <p style={styles.errorText}>{loginPwdError}</p>}
            <button
              onClick={handleChangeLoginPwd}
              style={{ ...styles.sendBtn, opacity: changingLoginPwd ? 0.5 : 1 }}
              disabled={changingLoginPwd}
            >
              {changingLoginPwd ? '修改中...' : '确认修改'}
            </button>
          </div>
        </div>
      )}

      {/* ── 修改支付密码弹窗 ─────────────────────── */}
      {showChangePayPwd && (
        <div style={styles.modal} onClick={() => { setShowChangePayPwd(false); resetPayPwdForm() }}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>修改支付密码</span>
              <button onClick={() => { setShowChangePayPwd(false); resetPayPwdForm() }} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.pwdGroup}>
              <label style={styles.label}>旧支付密码</label>
              <div style={styles.pwdWrap}>
                <span style={styles.pwdIcon}>🔒</span>
                <input
                  style={styles.pwdInput}
                  type={showPayOldEye ? 'text' : 'password'}
                  placeholder="6位数字密码"
                  maxLength={6}
                  value={payOldPwd}
                  onChange={e => setPayOldPwd(e.target.value.replace(/\D/g, ''))}
                />
                <button type="button" onClick={() => setShowPayOldEye(!showPayOldEye)} style={styles.eyeBtn}>
                  {showPayOldEye ? <EyeOff size={26} color="#6c6c80" /> : <Eye size={26} color="#6c6c80" />}
                </button>
              </div>
            </div>
            <div style={styles.pwdGroup}>
              <label style={styles.label}>新支付密码</label>
              <div style={styles.pwdWrap}>
                <span style={styles.pwdIcon}>🔒</span>
                <input
                  style={styles.pwdInput}
                  type={showPayNewEye ? 'text' : 'password'}
                  placeholder="6位数字新密码"
                  maxLength={6}
                  value={payNewPwd}
                  onChange={e => setPayNewPwd(e.target.value.replace(/\D/g, ''))}
                />
                <button type="button" onClick={() => setShowPayNewEye(!showPayNewEye)} style={styles.eyeBtn}>
                  {showPayNewEye ? <EyeOff size={26} color="#6c6c80" /> : <Eye size={26} color="#6c6c80" />}
                </button>
              </div>
            </div>
            <div style={styles.pwdGroup}>
              <label style={styles.label}>确认新支付密码</label>
              <div style={styles.pwdWrap}>
                <span style={styles.pwdIcon}>🔒</span>
                <input
                  style={styles.pwdInput}
                  type={showPayNew2Eye ? 'text' : 'password'}
                  placeholder="再次输入6位新密码"
                  maxLength={6}
                  value={payNewPwd2}
                  onChange={e => setPayNewPwd2(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
            {payPwdError && <p style={styles.errorText}>{payPwdError}</p>}
            <button
              onClick={handleChangePayPwd}
              style={{ ...styles.sendBtn, opacity: changingPayPwd ? 0.5 : 1 }}
              disabled={changingPayPwd}
            >
              {changingPayPwd ? '修改中...' : '确认修改'}
            </button>
          </div>
        </div>
      )}

      {/* ── 注销账号弹窗 ─────────────────────── */}
      {showDeleteAccount && (
        <div style={styles.modal} onClick={() => { setShowDeleteAccount(false); resetDeleteForm() }}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={{ ...styles.modalTitle, color: '#ef4444' }}>注销账号</span>
              <button onClick={() => { setShowDeleteAccount(false); resetDeleteForm() }} style={styles.closeBtn}>✕</button>
            </div>

            {deleteStep === 1 ? (
              <>
                <div style={styles.dangerBox}>
                  <ShieldAlert size={52} color="#ef4444" />
                  <div style={styles.dangerTitle}>此操作不可撤销</div>
                  <div style={styles.dangerList}>
                    <div>• 您的所有聊天记录将被永久删除</div>
                    <div>• 您的所有联系人关系将被解除</div>
                    <div>• 您的钱包余额、交易记录将被清除</div>
                    <div>• 您的账号信息将被彻底删除，无法恢复</div>
                    <div>• 好友请求、朋友圈数据将一并清除</div>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteStep(2)}
                  style={{ ...styles.sendBtn, background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}
                >
                  我已了解风险，继续注销
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 17, color: '#fff', margin: 0 }}>
                  请输入 <strong style={{ color: '#e94560' }}>登录密码</strong> 以确认注销
                </p>
                <div style={styles.textPwdWrap}>
                  <input
                    style={styles.textPwdInput}
                    type={showDeleteEye ? 'text' : 'password'}
                    placeholder="请输入当前登录密码"
                    value={deleteConfirmPwd}
                    onChange={e => setDeleteConfirmPwd(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowDeleteEye(!showDeleteEye)} style={styles.eyeBtn}>
                    {showDeleteEye ? <EyeOff size={26} color="#6c6c80" /> : <Eye size={26} color="#6c6c80" />}
                  </button>
                </div>
                {deletePwdError && <p style={styles.errorText}>{deletePwdError}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setDeleteStep(1)}
                    style={{ ...styles.cancelBtn, flex: 1 }}
                  >
                    返回
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    style={{
                      ...styles.sendBtn,
                      flex: 2,
                      background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                      opacity: deletingAccount ? 0.5 : 1
                    }}
                    disabled={deletingAccount}
                  >
                    {deletingAccount ? '注销中...' : '确认注销账号'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 修改chat号弹窗 ─────────────────────── */}
      {showEditChatCode && (
        <div style={styles.modal} onClick={() => setShowEditChatCode(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>修改chat号</span>
              <button onClick={() => setShowEditChatCode(false)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.pwdGroup}>
              <label style={styles.label}>新chat号（6-20位字母或数字）</label>
              <input
                style={styles.input}
                value={editChatCodeVal}
                onChange={e => setEditChatCodeVal(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="例如：mychat123"
                maxLength={20}
              />
              {editChatCodeError && <span style={{ color: '#e94560', fontSize: 13 }}>{editChatCodeError}</span>}
            </div>
            <button
              onClick={handleUpdateChatCode}
              disabled={editingChatCode}
              style={styles.sendBtn}
            >
              {editingChatCode ? '保存中...' : '确认修改'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#0f0f1a', paddingBottom: '120px' },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #2a2a4a',
    position: 'relative'
  },
  title: { fontSize: 28, fontWeight: 700 },
  adminBtn: {
    position: 'absolute',
    top: 20,
    right: 24,
    background: 'rgba(233, 69, 96, 0.2)',
    border: '1px solid #e94560',
    borderRadius: '50%',
    width: 56,
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#e94560',
    fontSize: 14,
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer'
  },
  profileCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 24px',
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)'
  },
  avatarLarge: {
    width: 92,
    height: 92,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 36,
    marginBottom: 16
  },
  name: { fontSize: 26, fontWeight: 700, marginBottom: 6 },
  userId: { fontSize: 16, color: '#6c6c80' },
  chatCodeRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 },
  editChatCodeBtn: {
    fontSize: 13,
    color: '#e94560',
    background: 'none',
    border: '1px solid #e94560',
    borderRadius: 6,
    padding: '3px 10px',
    cursor: 'pointer',
    fontWeight: 500
  },
  balanceCard: {
    position: 'relative',
    margin: '20px 20px',
    padding: '28px 24px',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    borderRadius: 20,
    textAlign: 'center'
  },
  txEntryBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    background: 'rgba(255,255,255,0.25)',
    borderRadius: '50%',
    width: 48,
    height: 48,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
  },
  txBtnLine: {
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1.2,
    whiteSpace: 'nowrap'
  },
  balanceLabel: { fontSize: 17, opacity: 0.9, display: 'block' },
  balanceAmount: { fontSize: 48, fontWeight: 700, display: 'block', marginTop: 8 },
  balanceActions: { display: 'flex', gap: 14, marginTop: 24, justifyContent: 'center' },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 22px',
    background: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 18
  },
  lockedWalletCard: {
    margin: '20px 20px',
    padding: '40px 24px',
    background: 'linear-gradient(135deg, #2a2a4a, #1a1a2e)',
    borderRadius: 20,
    textAlign: 'center',
    border: '1px dashed #3a3a5a'
  },
  lockIcon: { fontSize: 56, marginBottom: 16 },
  lockedTitle: { fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 },
  lockedDesc: { fontSize: 16, color: '#8a8aa0', marginBottom: 28, lineHeight: 1.7 },
  enableBtn: {
    padding: '16px 40px',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    borderRadius: 14,
    color: '#fff',
    fontSize: 18,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer'
  },
  // ── 账号安全设置 ──
  settingsCard: {
    margin: '0 20px 20px',
    background: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden'
  },
  settingsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 20px',
    borderBottom: '1px solid #2a2a4a'
  },
  settingsTitle: { fontSize: 15, color: '#8a8aa0', fontWeight: 500 },
  settingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '20px',
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    borderBottom: '1px solid #2a2a4a',
    cursor: 'pointer'
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    pointerEvents: 'none'
  },
  settingLabel: { flex: 1, fontSize: 19, color: '#fff', fontWeight: 500, pointerEvents: 'none' },
  settingArrow: { fontSize: 30, color: '#6c6c80', fontWeight: 300, pointerEvents: 'none' },

  tabs: {
    display: 'flex',
    margin: '0 20px',
    background: '#1a1a2e',
    borderRadius: 14,
    padding: 6,
    gap: 6
  },
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '16px 10px',
    borderRadius: 10,
    color: '#6c6c80',
    fontSize: 19
  },
  tabActive: { background: '#e94560', color: '#fff' },
  content: { padding: '16px 20px' },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  empty: { textAlign: 'center', color: '#6c6c80', padding: '48px 0', fontSize: 17 },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 0',
    borderBottom: '1px solid #1a1a2e'
  },
  contactAvatar: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 22,
    color: '#fff',
    flexShrink: 0
  },
  contactInfo: { flex: 1, minWidth: 0 },
  contactName: { fontSize: 19, fontWeight: 600, color: '#e0e0f0' },
  contactLastMsg: { fontSize: 15, color: '#8a8aa0', marginTop: 4 },
  lastMsgImg: { width: 80, height: 80, borderRadius: 8, objectFit: 'cover' },
  clearBtn: {
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    color: '#e94560',
    cursor: 'pointer',
    borderRadius: 8,
    flexShrink: 0
  },
  logoutBtn: {
    margin: '24px 20px',
    padding: '18px',
    background: '#1a1a2e',
    borderRadius: 14,
    color: '#e94560',
    fontWeight: 600,
    fontSize: 18,
    border: '1px solid #2a2a4a',
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
    borderRadius: '20px 20px 0 0',
    padding: '28px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 22
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: 600 },
  closeBtn: { padding: 6, color: '#6c6c80', fontSize: 24, background: 'none', border: 'none', cursor: 'pointer' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 10 },
  label: { fontSize: 16, color: '#8a8aa0' },
  input: {
    padding: '16px 18px',
    background: '#16213e',
    borderRadius: 12,
    fontSize: 18,
    color: '#fff',
    outline: 'none',
    border: '1px solid #2a2a4a'
  },
  sendBtn: {
    padding: '18px',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    borderRadius: 14,
    color: '#fff',
    fontWeight: 600,
    fontSize: 19,
    border: 'none',
    cursor: 'pointer'
  },
  cancelBtn: {
    padding: '18px',
    background: '#2a2a4a',
    borderRadius: 14,
    color: '#fff',
    fontWeight: 500,
    fontSize: 17,
    border: 'none',
    cursor: 'pointer'
  },
  pwdGroup: { display: 'flex', flexDirection: 'column', gap: 10 },
  pwdWrap: {
    position: 'relative', display: 'flex', alignItems: 'center'
  },
  pwdIcon: { position: 'absolute', left: 18, fontSize: 22 },
  pwdInput: {
    width: '100%', padding: '16px 56px 16px 52px',
    background: '#16213e', borderRadius: 12, fontSize: 20,
    color: '#fff', outline: 'none', border: '1px solid #2a2a4a',
    letterSpacing: 6, textAlign: 'center'
  },
  // 文本密码框（非6位数字，用于登录密码）
  textPwdWrap: {
    position: 'relative', display: 'flex', alignItems: 'center'
  },
  textPwdInput: {
    width: '100%',
    padding: '16px 56px 16px 18px',
    background: '#16213e',
    borderRadius: 12,
    fontSize: 18,
    color: '#fff',
    outline: 'none',
    border: '1px solid #2a2a4a'
  },
  eyeBtn: { position: 'absolute', right: 16, padding: 10, background: 'none', border: 'none', cursor: 'pointer' },
  errorText: { color: '#e94560', fontSize: 15, margin: '6px 0 0 0' },
  // 注销风险提示
  dangerBox: {
    padding: '28px 20px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 16,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16
  },
  dangerTitle: { fontSize: 19, fontWeight: 700, color: '#ef4444' },
  dangerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontSize: 16,
    color: '#fecaca',
    textAlign: 'left',
    lineHeight: 1.7
  },
}
