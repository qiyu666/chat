import { useState } from 'react'
import { useApp } from '../AppContext'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage({ onSwitch }) {
  const { login } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码')
      return
    }
    const result = await login(username.trim(), password)
    if (!result.success) {
      setError(result.error || '登录失败')
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>💬</div>
        <h1 style={styles.title}>社交聊天</h1>
        <p style={styles.subtitle}>连接你我，畅聊无限</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <span style={styles.inputIcon}>👤</span>
          <input
            style={styles.input}
            type="text"
            placeholder="用户名"
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
            placeholder="密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            style={styles.eyeBtn}
          >
            {showPwd ? <EyeOff size={18} color="#6c6c80" /> : <Eye size={18} color="#6c6c80" />}
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" style={styles.btnPrimary}>登录</button>

        <p style={styles.switch}>
          还没有账号？<button type="button" onClick={onSwitch} style={styles.link}>立即注册</button>
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
    marginBottom: 48
  },
  logo: {
    fontSize: 56,
    marginBottom: 16
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
    background: 'linear-gradient(90deg, #e94560, #ff6b81)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    fontSize: 14,
    color: '#6c6c80'
  },
  form: {
    width: '100%',
    maxWidth: 320
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: 16
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    fontSize: 16
  },
  input: {
    width: '100%',
    padding: '14px 48px 14px 44px',
    background: '#1a1a2e',
    borderRadius: 12,
    fontSize: 15,
    color: '#fff',
    border: '1px solid #2a2a4a'
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 8
  },
  error: {
    color: '#e94560',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center'
  },
  btnPrimary: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    marginTop: 8
  },
  switch: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    color: '#6c6c80'
  },
  link: {
    color: '#e94560',
    fontWeight: 600
  }
}
