import { useState } from 'react'
import ContactsPage from './pages/ContactsPage'
import MomentsPage from './pages/MomentsPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { AppProvider, useApp } from './AppContext'

function MainApp() {
  const { user } = useApp()
  const [activeTab, setActiveTab] = useState('contacts')
  const [authView, setAuthView] = useState('login')

  if (!user) {
    return authView === 'login' ? (
      <LoginPage onSwitch={() => setAuthView('register')} />
    ) : (
      <RegisterPage onSwitch={() => setAuthView('login')} />
    )
  }

  const tabItems = [
    { id: 'contacts', label: '联系人', icon: Contacts },
    { id: 'moments', label: '朋友圈', icon: Moments },
    { id: 'profile', label: '我', icon: Profile }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {activeTab === 'contacts' && <ContactsPage />}
        {activeTab === 'moments' && <MomentsPage />}
        {activeTab === 'profile' && <ProfilePage />}
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

function Contacts({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function Moments({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function Profile({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
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
