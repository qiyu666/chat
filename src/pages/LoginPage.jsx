import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../AppContext'
import { Eye, EyeOff, Loader } from 'lucide-react'

export default function LoginPage({ onSwitch, onLoginSuccess }) {
  const { login } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码')
      return
    }
    setLoading(true)
    const result = await login(username.trim(), password)
    if (result.success) {
      onLoginSuccess?.()
    }
    setLoading(false)
    if (!result.success) {
      setError(result.error || '登录失败')
    }
  }

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={styles.header}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          style={styles.logo}
        >
          💬
        </motion.div>
        <h1 style={styles.title}>社交聊天</h1>
        <p style={styles.subtitle}>连接你我，畅聊无限</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        onSubmit={handleSubmit}
        style={styles.form}
      >
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

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={styles.error}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          style={styles.btnPrimary}
          disabled={loading}
          whileTap={{ scale: 0.98 }}
          whileHover={{ opacity: loading ? 0.8 : 1 }}
        >
          {loading ? (
            <span style={styles.btnContent}>
              <Loader size={18} className="spin" />
              <span>登录中...</span>
            </span>
          ) : (
            '登录'
          )}
        </motion.button>

        <p style={styles.switch}>
          还没有账号？<button type="button" onClick={onSwitch} style={styles.link}>立即注册</button>
        </p>
      </motion.form>
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
    marginBottom: 16,
    display: 'inline-block'
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
    marginTop: 8,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  btnContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  switch: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    color: '#6c6c80'
  },
  link: {
    color: '#e94560',
    fontWeight: 600,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14
  }
}
