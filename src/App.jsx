import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ChatListPage from './pages/ChatListPage'
import ContactsPage from './pages/ContactsPage'
import MomentsPage from './pages/MomentsPage'
import ProfilePage from './pages/ProfilePage'
import TransactionPage from './pages/TransactionPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminPage from './pages/AdminPage'
import ErrorBoundary from './ErrorBoundary'
import { AppProvider, useApp } from './AppContext'
import { NotificationProvider, useNotification } from './pages/NotificationContext'

function MainApp() {
  const { user } = useApp()
  const { setActiveChat } = useNotification()
  const [activeTab, setActiveTab] = useState('chats')
  const [profileView, setProfileView] = useState('default')
  const [authView, setAuthView] = useState('login')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 481)
  const [isLoading, setIsLoading] = useState(true)
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  
  // 检测用户是否已登录
  const isLoggedIn = () => {
    try {
      return !!localStorage.getItem('user')
    } catch {
      return false
    }
  }

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 481)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 检测用户登录状态变化
  const prevUserRef = useRef(null)
  useEffect(() => {
    if (user && !prevUserRef.current) {
      // 刚刚登录成功
      prevUserRef.current = user
    }
    prevUserRef.current = user || null
    setIsLoading(false)
  }, [user])

  // 初始化：检查 localStorage
  useEffect(() => {
    setIsLoading(false)
  }, [])

  if (isAdmin) {
    return localStorage.getItem('adminToken') ? (
      <AdminPage onLogout={() => { localStorage.removeItem('adminToken'); window.location.href = '/' }} />
    ) : (
      <AdminLoginPage onLogin={() => { window.location.href = '/admin' }} />
    )
  }

  // 加载中显示空白
  if (isLoading) {
    return <div style={styles.loading} />
  }

  // 未登录显示登录页
  if (!user) {
    return authView === 'login' ? (
      <LoginPage onSwitch={() => setAuthView('register')} />
    ) : (
      <RegisterPage onSwitch={() => setAuthView('login')} />
    )
  }

  const tabItems = [
    { id: 'chats', label: '消息', icon: ChatIcon },
    { id: 'contacts', label: '联系人', icon: ContactsIcon },
    { id: 'moments', label: '朋友圈', icon: MomentsIcon },
    { id: 'profile', label: '我', icon: ProfileIcon }
  ]

  return (
    <AnimatePresence mode="wait">
      {!prevUserRef.current ? (
        <motion.div
          key="login-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={styles.page}
        >
          <LoginPage onSwitch={() => setAuthView('register')} />
        </motion.div>
      ) : (
        <motion.div
          key="main-app"
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          exit={{ scaleY: 0, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 120,
            damping: 20,
            duration: 0.5
          }}
          style={styles.container}
        >
          {/* 主内容区 */}
          <div style={styles.content}>
            {activeTab === 'chats' && <ChatListPage />}
            {activeTab === 'contacts' && <ContactsPage />}
            {activeTab === 'moments' && <MomentsPage />}
            {activeTab === 'profile' && profileView === 'default' && <ProfilePage />}
            {activeTab === 'profile' && profileView === 'transactions' && <TransactionPage onBack={() => setProfileView('default')} />}
          </div>

          {/* 底部 Dock 导航栏 */}
          <motion.div
            style={{
              ...styles.dock,
              display: 'flex'
            }}
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
          >
            {tabItems.map(tab => {
              const IconComp = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...styles.dockItem,
                    ...(activeTab === tab.id ? styles.dockItemActive : {})
                  }}
                >
                  <IconComp size={24} color={activeTab === tab.id ? '#e94560' : '#6c6c80'} />
                  <span style={{
                    fontSize: 11,
                    color: activeTab === tab.id ? '#e94560' : '#6c6c80',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    marginTop: 4
                  }}>
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ChatIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ContactsIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function MomentsIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.77 7.06 17.4 8 11.9 4 8l5.61-1.16L12 2z" />
    </svg>
  )
}

function ProfileIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </AppProvider>
    </ErrorBoundary>
  )
}

const styles = {
  loading: {
    minHeight: '100vh',
    background: '#0f0f1a'
  },
  page: {
    minHeight: '100vh',
    background: '#0f0f1a'
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    height: '100dvh',
    background: '#0f0f1a'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    minHeight: 0
  },
  dock: {
    display: 'flex',
    background: '#1a1a2e',
    borderTop: '1px solid #2a2a4a',
    padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
    justifyContent: 'space-around',
    position: 'sticky',
    bottom: 0,
    zIndex: 100
  },
  dockItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: '4px 0',
    gap: 4
  },
  dockItemActive: {}
}
