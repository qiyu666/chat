import { useState } from 'react'

export default function AdminLoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return setError('请输入用户名和密码')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '登录失败')
      localStorage.setItem('adminToken', 'yes')
      onLogin()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>⚙️</div>
        <h1 style={styles.title}>管理员后台</h1>
        <p style={styles.sub}>Chat Application Management</p>
        <input
          style={styles.input}
          placeholder="用户名"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        <input
          style={styles.input}
          placeholder="密码"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button onClick={handleLogin} style={styles.btn} disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#0f0f1a'
  },
  card: {
    background: '#1a1a2e',
    borderRadius: 20,
    padding: '48px 40px',
    width: 360,
    textAlign: 'center',
    border: '1px solid #2a2a4a'
  },
  logo: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 6px' },
  sub: { fontSize: 13, color: '#6c6c80', margin: '0 0 32px' },
  input: {
    width: '100%',
    padding: '14px 16px',
    background: '#0f0f1a',
    border: '1px solid #2a2a4a',
    borderRadius: 12,
    color: '#fff',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 12
  },
  error: { color: '#e94560', fontSize: 13, marginBottom: 12 },
  btn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8
  }
}
