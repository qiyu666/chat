import { useState } from 'react'
import { useApp } from '../AppContext'
import { Eye, EyeOff } from 'lucide-react'
import api from '../api'

export default function RegisterPage({ onSwitch }) {
  const { register } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [setStep, setSetStep] = useState(1) // 1=enter, 2=confirm
  const [payPwd, setPayPwd] = useState('')
  const [payPwdConfirm, setPayPwdConfirm] = useState('')
  const [showPayPwd, setShowPayPwd] = useState(false)
  const [payPwdError, setPayPwdError] = useState('')
  const [settingPwd, setSettingPwd] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim() || !confirmPwd.trim()) {
      setError('请填写所有字段')
      return
    }
    if (username.length < 2) {
      setError('用户名至少2个字符')
      return
    }
    if (password.length < 4) {
      setError('密码至少4个字符')
      return
    }
    if (password !== confirmPwd) {
      setError('两次密码不一致')
      return
    }
    const result = await register(username.trim(), password)
    if (!result.success) {
      setError(result.error || '注册失败')
    } else {
      setRegistered(true)
    }
  }

  const handleSetPassword = async () => {
    setSetError('')
    if (!payPwd || !/^\d{6}$/.test(payPwd)) {
      setSetError('支付密码必须为6位数字')
      return
    }
    if (setStep === 1) {
      setSetStep(2)
      return
    }
    if (payPwd !== payPwdConfirm) {
      setSetError('两次输入的密码不一致')
      return
    }
    setSettingPwd(true)
    try {
      await api.wallet.setPassword(payPwd)
      setShowPwdModal(false)
      updatePaymentPasswordStatus(true)
    } catch (e) {
      setSetError(e.message || '设置失败')
    } finally {
      setSettingPwd(false)
    }
  }

  if (registered) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logo}>📝</div>
          <h1 style={styles.title}>注册成功！</h1>
          <p style={styles.subtitle}>请先设置支付密码以启用钱包功能</p>
        </div>
        <button onClick={() => setShowPwdModal(true)} style={styles.btnPrimary}>设置支付密码</button>
        <p style={styles.switch}>
          已有账号？<button type="button" onClick={onSwitch} style={styles.link}>去登录</button>
        </p>

        {showPwdModal && (
          <div style={styles.modalOverlay} onClick={() => setShowPwdModal(false)}>
            <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
              <div style={styles.modalTitle}>设置支付密码</div>
              <p style={styles.modalHint}>请输入6位数字作为您的支付密码</p>
              <div style={styles.pwdInputWrap}>
                <span style={styles.pwdIcon}>🔒</span>
                <input
                  style={styles.pwdInput}
                  type={showPayPwd ? 'text' : 'password'}
                  placeholder="输入6位数字密码"
                  maxLength={6}
                  value={payPwd}
                  onChange={e => setPayPwd(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
                <button type="button" onClick={() => setShowPayPwd(!showPayPwd)} style={styles.eyeBtn}>
                  {showPayPwd ? <EyeOff size={18} color="#6c6c80" /> : <Eye size={18} color="#6c6c80" />}
                </button>
              </div>
              {setStep === 2 && (
                <>
                  <div style={styles.pwdInputWrap}>
                    <span style={styles.pwdIcon}>🔒</span>
                    <input
                      style={styles.pwdInput}
                      type={showPayPwd ? 'text' : 'password'}
                      placeholder="确认6位数字密码"
                      maxLength={6}
                      value={payPwdConfirm}
                      onChange={e => setPayPwdConfirm(e.target.value.replace(/\D/g, ''))}
                    />
                    <button type="button" onClick={() => setShowPayPwd(!showPayPwd)} style={styles.eyeBtn}>
                      {showPayPwd ? <EyeOff size={18} color="#6c6c80" /> : <Eye size={18} color="#6c6c80" />}
                    </button>
                  </div>
                  {payPwdError && <p style={styles.setError}>{payPwdError}</p>}
                  <button
                    onClick={handleSetPassword}
                    disabled={settingPwd}
                    style={{
                      ...styles.setBtn,
                      opacity: settingPwd ? 0.5 : 1
                    }}
                  >
                    {settingPwd ? '设置中...' : '确认设置'}
                  </button>
                </>
              )}
              {setStep === 1 && (
                <button onClick={handleSetPassword} style={styles.setBtn}>下一步</button>
              )}
              <button onClick={() => { setShowPwdModal(false); setSetStep(1); setPayPwd(''); setPayPwdConfirm(''); }} style={styles.cancelBtn}>取消</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>📝</div>
        <h1 style={styles.title}>注册账号</h1>
        <p style={styles.subtitle}>加入我们，开始聊天</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <span style={styles.inputIcon}>👤</span>
          <input
            style={styles.input}
            type="text"
            placeholder="用户名（2位以上）"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div style={styles.inputGroup}>
          <span style={styles.inputIcon}>🔒</span>
          <input
            style={styles.input}
            type={showPwd ? 'text' : 'password'}
            placeholder="密码（4位以上）"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button type="button" onClick={() => setShowPwd(!showPwd)} style={styles.eyeBtn}>
            {showPwd ? <EyeOff size={18} color="#6c6c80" /> : <Eye size={18} color="#6c6c80" />}
          </button>
        </div>

        <div style={styles.inputGroup}>
          <span style={styles.inputIcon}>🔒</span>
          <input
            style={styles.input}
            type={showPwd ? 'text' : 'password'}
            placeholder="确认密码"
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" style={styles.btnPrimary}>注册</button>

        <p style={styles.switch}>
          已有账号？<button type="button" onClick={onSwitch} style={styles.link}>去登录</button>
        </p>
      </form>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)'
  },
  header: {
    textAlign: 'center',
    marginBottom: 36
  },
  logo: { fontSize: 48, marginBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 6,
    background: 'linear-gradient(90deg, #e94560, #ff6b81)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: { fontSize: 14, color: '#6c6c80' },
  form: { width: '100%', maxWidth: 320 },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: 14
  },
  inputIcon: { position: 'absolute', left: 14, fontSize: 16 },
  input: {
    width: '100%',
    padding: '13px 48px 13px 44px',
    background: '#1a1a2e',
    borderRadius: 10,
    fontSize: 15,
    color: '#fff',
    border: '1px solid #2a2a4a'
  },
  eyeBtn: { position: 'absolute', right: 12, padding: 8 },
  error: { color: '#e94560', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  btnPrimary: {
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    marginTop: 6
  },
  switch: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#6c6c80'
  },
  link: { color: '#e94560', fontWeight: 600 },
  // 支付密码弹窗
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
  },
  modalBox: {
    width: '100%', maxWidth: 340, background: '#1a1a2e',
    borderRadius: 16, padding: '28px 24px', display: 'flex',
    flexDirection: 'column', gap: 14
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#fff', textAlign: 'center' },
  modalHint: { fontSize: 13, color: '#6c6c80', textAlign: 'center', margin: 0 },
  pwdInputWrap: {
    position: 'relative', display: 'flex', alignItems: 'center'
  },
  pwdIcon: { position: 'absolute', left: 14, fontSize: 16 },
  pwdInput: {
    width: '100%', padding: '13px 48px 13px 44px',
    background: '#0f0f1a', borderRadius: 10, fontSize: 16,
    color: '#fff', border: '1px solid #2a2a4a', outline: 'none', letterSpacing: 4, textAlign: 'center'
  },
  setError: { color: '#e94560', fontSize: 13, textAlign: 'center', margin: 0 },
  setBtn: {
    width: '100%', padding: '13px', background: 'linear-gradient(135deg, #e94560, #c73e54)',
    borderRadius: 10, fontSize: 16, fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer'
  },
  cancelBtn: {
    width: '100%', padding: '12px', background: 'transparent',
    borderRadius: 10, fontSize: 14, color: '#6c6c80', border: '1px solid #2a2a4a', cursor: 'pointer'
  }
}
