import { useState, useEffect } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronLeft } from 'lucide-react'
import api from '../api'

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function TransactionPage({ onBack }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const data = await api.wallet.getTransactions()
      setTransactions(data.transactions || [])
    } catch (e) {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const totalIn = transactions
    .filter(tx => tx.type === 'receive' || tx.type === 'redpacket_in')
    .reduce((s, tx) => s + tx.amount, 0)
  const totalOut = transactions
    .filter(tx => tx.type === 'send' || tx.type === 'redpacket_out' || tx.type === 'transfer')
    .reduce((s, tx) => s + tx.amount, 0)

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <ChevronLeft size={24} color="#fff" />
          <span style={styles.headerTitle}>余额明细</span>
        </button>
      </div>

      {/* Summary */}
      <div style={styles.summaryCard}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>总收入</span>
          <span style={{ ...styles.summaryValue, color: '#4ade80' }}>+¥{totalIn.toFixed(2)}</span>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>总支出</span>
          <span style={{ ...styles.summaryValue, color: '#e94560' }}>-¥{totalOut.toFixed(2)}</span>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>交易笔数</span>
          <span style={{ ...styles.summaryValue, color: '#fff' }}>{transactions.length}</span>
        </div>
      </div>

      {/* List */}
      <div style={styles.listContainer}>
        {loading ? (
          <div style={styles.loading}>加载中...</div>
        ) : transactions.length === 0 ? (
          <div style={styles.empty}>暂无余额明细</div>
        ) : (
          transactions.map(tx => (
            <div key={tx.id} style={styles.txItem}>
              <div style={{
                ...styles.txIcon,
                background: tx.type === 'receive' || tx.type === 'redpacket_in' ? '#1a3a2a' : '#3a1a1a'
              }}>
                {(tx.type === 'receive' || tx.type === 'redpacket_in')
                  ? <ArrowDownLeft size={22} color="#4ade80" />
                  : <ArrowUpRight size={22} color="#e94560" />
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
                {(tx.type === 'receive' || tx.type === 'redpacket_in' ? '+' : '-')}¥{Math.abs(tx.amount).toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0f0f1a'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #2a2a4a',
    background: '#1a1a2e'
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    color: '#fff'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 600
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    background: '#1a1a2e',
    margin: '16px',
    borderRadius: 16,
    padding: '20px 16px',
    gap: 0
  },
  summaryItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6c6c80'
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 700
  },
  summaryDivider: {
    width: 1,
    height: 36,
    background: '#2a2a4a'
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px'
  },
  loading: {
    textAlign: 'center',
    color: '#6c6c80',
    padding: '48px 0',
    fontSize: 16
  },
  empty: {
    textAlign: 'center',
    color: '#6c6c80',
    padding: '48px 0',
    fontSize: 17
  },
  txItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 0',
    borderBottom: '1px solid #1a1a2e'
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  txInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  txDesc: {
    fontSize: 15,
    color: '#e0e0f0'
  },
  txTime: {
    fontSize: 13,
    color: '#6c6c80'
  },
  txAmount: {
    fontSize: 17,
    fontWeight: 600,
    flexShrink: 0
  }
}
