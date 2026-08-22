import { useState } from 'react'
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

function MainApp() {
  const { user } = useApp()
  const [activeTab, setActiveTab] = useState('chats')
  const [profileView, setProfileView] = useState('default')
  const [authView, setAuthView] = useState('login')
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')

  if (isAdmin) {
    return localStorage.getItem('adminToken') ? (
      <AdminPage onLogout={() => { localStorage.removeItem('adminToken'); window.location.href = '/' }} />
    ) : (
      <AdminLoginPage onLogin={() => { window.location.href = '/admin' }} />
    )
  }

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
    <div style={styles.container}>
      <div style={styles.content}>
        {activeTab === 'chats' && <ChatListPage />}
        {activeTab === 'contacts' && <ContactsPage />}
        {activeTab === 'moments' && <MomentsPage />}
        {activeTab === 'profile' && profileView === 'default' && <ProfilePage onNavigate={setProfileView} />}
        {activeTab === 'profile' && profileView === 'transactions' && <TransactionPage onBack={() => setProfileView('default')} />}
      </div>

      <div style={styles.tabBar}>
        {tabItems.map(tab => {
          const IconComp = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabItem,
                ...(activeTab === tab.id ? styles.tabItemActive : {})
              }}
            >
              <IconComp size={24} color={activeTab === tab.id ? '#e94560' : '#6c6c80'} />
              <span style={{
                fontSize: 11,
                color: activeTab === tab.id ? '#e94560' : '#6c6c80',
                fontWeight: activeTab === tab.id ? 600 : 400
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
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
        <MainApp />
      </AppProvider>
    </ErrorBoundary>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0f0f1a'
  },
  content: {
    flex: 1,
    overflow: 'auto'
  },
  tabBar: {
    display: 'flex',
    background: '#1a1a2e',
    borderTop: '1px solid #2a2a4a',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)'
  },
  tabItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 0 8px',
    gap: 4
  },
  tabItemActive: {}
}
