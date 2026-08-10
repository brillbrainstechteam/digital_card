import { useEffect, useState, Component } from 'react'
import {
  adminLogin, adminLogout, isAdminLoggedIn,
  fetchStats, fetchUsers, fetchCards, fetchQrCodes, fetchActivity,
  updateCardStatus, updateQrLifecycle, deleteAdminCard, deleteAdminUser,
  fetchSubscriptions,
} from './adminApi'
import './admin.css'

const PRICE_PER_CARD = 1   // ₹1/month (update when Razorpay is live)
const PRICE_PER_QR   = 1   // ₹1/month

/* ── helpers ── */
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function timeAgo(iso) {
  if (!iso) return ''
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
function rup(n) { return `₹${(n || 0).toLocaleString('en-IN')}` }

/* ── Login ── */
function AdminLogin({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try { await adminLogin(email, password); onSuccess() }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="admin-login-wrap">
      <form className="admin-login-box" onSubmit={handleSubmit}>
        <h1>Admin Panel</h1>
        <p>Brill Brains Digital Card Studio</p>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@brillbrainsconsultants.com" required />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        {error && <div className="admin-login-error">{error}</div>}
        <button className="admin-login-btn" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
      </form>
    </div>
  )
}

/* ── Overview ── */
function OverviewTab() {
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchStats(), fetchActivity()])
      .then(([s, a]) => { setStats(s); setActivity(a) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="admin-empty">Loading…</div>
  if (error) return <div className="admin-empty" style={{ color: '#ff6b6b' }}>Error: {error}</div>
  if (!stats) return <div className="admin-empty">No data</div>

  const mrr = (stats.publishedCards * PRICE_PER_CARD) + (stats.totalQrCodes * PRICE_PER_QR)

  return (
    <>
      <div className="admin-stats-grid">
        {[
          ['Total Users', stats.totalUsers],
          ['Digital Cards', stats.totalCards],
          ['Published', stats.publishedCards],
          ['Suspended', stats.suspendedCards],
          ['Archived', stats.archivedCards],
          ['QR Codes', stats.totalQrCodes],
          ['Est. MRR', rup(mrr)],
        ].map(([label, val]) => (
          <div className="admin-stat-card" key={label}>
            <span>{label}</span>
            <strong>{val ?? '—'}</strong>
          </div>
        ))}
      </div>
      <div className="admin-section">
        <div className="admin-section-header"><h2>Recent Activity</h2></div>
        <ul className="admin-activity-list">
          {activity.length === 0 && <li className="admin-empty">No activity yet</li>}
          {activity.map((item, i) => (
            <li className="admin-activity-item" key={i}>
              <span className={`admin-activity-dot ${item.type === 'user_signup' ? 'user' : 'card'}`} />
              <span className="admin-activity-label">
                {item.type === 'user_signup' ? '👤 New user: ' : '🃏 Card created: '}
                <strong>{item.label || '—'}</strong>
              </span>
              <span className="admin-activity-meta">{item.user_email}</span>
              <span className="admin-activity-meta">{timeAgo(item.ts)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

/* ── Revenue ── */
function RevenueTab() {
  const [stats, setStats] = useState(null)
  const [cards, setCards] = useState([])
  const [qrs, setQrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchStats(), fetchCards(), fetchQrCodes()])
      .then(([s, c, q]) => { setStats(s); setCards(c); setQrs(q) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="admin-empty">Loading…</div>
  if (error) return <div className="admin-empty" style={{ color: '#ff6b6b' }}>Error: {error}</div>
  if (!stats) return <div className="admin-empty">No data</div>

  const publishedCards = cards.filter((c) => c.status === 'published')
  const purchasedQrs = qrs.filter((q) => q.purchased === 'true')
  const mrr = publishedCards.length * PRICE_PER_CARD + purchasedQrs.length * PRICE_PER_QR
  const arr = mrr * 12

  return (
    <>
      <div className="admin-stats-grid">
        {[
          ['Monthly Revenue (MRR)', rup(mrr)],
          ['Annual Revenue (ARR)', rup(arr)],
          ['Paying Cards', publishedCards.length],
          ['Purchased QR Codes', purchasedQrs.length],
          ['Price per Card/mo', rup(PRICE_PER_CARD)],
          ['Price per QR/mo', rup(PRICE_PER_QR)],
        ].map(([label, val]) => (
          <div className="admin-stat-card" key={label}>
            <span>{label}</span>
            <strong>{val}</strong>
          </div>
        ))}
      </div>

      <div className="admin-section">
        <div className="admin-section-header"><h2>Revenue Breakdown — Published Cards</h2></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Card</th><th>User</th><th>Status</th><th>Published</th><th>Revenue/mo</th></tr>
            </thead>
            <tbody>
              {publishedCards.length === 0 && <tr><td colSpan={5} className="admin-empty">No published cards</td></tr>}
              {publishedCards.map((c) => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td><div className="muted">{c.user_email}</div></td>
                  <td><span className="status-badge status-published">Published</span></td>
                  <td className="muted">{fmtDate(c.created_at)}</td>
                  <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{rup(PRICE_PER_CARD)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-section">
        <div className="admin-section-header"><h2>Revenue Breakdown — QR Codes</h2></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Card Title</th><th>User</th><th>Status</th><th>Revenue/mo</th></tr>
            </thead>
            <tbody>
              {purchasedQrs.length === 0 && <tr><td colSpan={4} className="admin-empty">No purchased QR codes</td></tr>}
              {purchasedQrs.map((q) => (
                <tr key={q.id}>
                  <td>{q.card_title || '—'}</td>
                  <td><div className="muted">{q.user_email}</div></td>
                  <td><span className={`status-badge status-${q.lifecycle_status === 'archived' ? 'suspended' : 'published'}`}>{q.lifecycle_status === 'archived' ? 'Inactive' : 'Active'}</span></td>
                  <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{rup(PRICE_PER_QR)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

/* ── Subscriptions ── */
function SubscriptionsTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSubscriptions().then(setData).catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="admin-empty">Loading…</div>
  if (error) return <div className="admin-empty" style={{ color: '#ff6b6b' }}>Error: {error}</div>
  if (!data) return <div className="admin-empty">No data</div>

  const { stats, list } = data
  const now = new Date()

  const filtered = list.filter((c) => {
    if (filter === 'active') return c.status === 'published' && !c.subscription_cancelled
    if (filter === 'cancelling') return c.subscription_cancelled && c.subscription_expires_at && new Date(c.subscription_expires_at) > now
    if (filter === 'expired') return c.subscription_cancelled && c.subscription_expires_at && new Date(c.subscription_expires_at) < now
    if (filter === 'suspended') return c.status === 'suspended'
    return true
  })

  return (
    <>
      <div className="admin-stats-grid">
        {[
          ['Active Subscriptions', stats.active],
          ['Cancelling (still active)', stats.cancelled],
          ['Expired / Stopped', stats.expired],
          ['Manually Suspended', stats.suspended],
        ].map(([label, val]) => (
          <div className="admin-stat-card" key={label}>
            <span>{label}</span>
            <strong>{val}</strong>
          </div>
        ))}
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <h2>All Subscriptions ({list.length})</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'active', 'cancelling', 'expired', 'suspended'].map((f) => (
              <button
                key={f}
                className={`admin-btn-sm${filter === f ? ' success' : ''}`}
                onClick={() => setFilter(f)}
                type="button"
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Card</th><th>User</th><th>Status</th><th>Cancelled?</th><th>Expires / Expiry</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={5} className="admin-empty">No records</td></tr>}
              {filtered.map((c) => {
                const expired = c.subscription_cancelled && c.subscription_expires_at && new Date(c.subscription_expires_at) < now
                const cancelling = c.subscription_cancelled && c.subscription_expires_at && new Date(c.subscription_expires_at) > now
                return (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td><div>{c.user_name || '—'}</div><div className="muted">{c.user_email}</div></td>
                    <td>
                      <span className={`status-badge status-${c.status}`}>{c.status}</span>
                    </td>
                    <td>
                      {expired && <span className="status-badge status-suspended">Expired</span>}
                      {cancelling && <span className="status-badge status-draft">Cancelling</span>}
                      {!c.subscription_cancelled && <span className="status-badge status-published">Active</span>}
                    </td>
                    <td className="muted">{fmtDate(c.subscription_expires_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

/* ── Users ── */
function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { fetchUsers().then(setUsers).finally(() => setLoading(false)) }, [])

  async function handleDelete(user) {
    if (!window.confirm(`Delete user ${user.email} and ALL their cards/QR codes? This cannot be undone.`)) return
    setDeleting(user.id)
    try { await deleteAdminUser(user.id); setUsers((cur) => cur.filter((u) => u.id !== user.id)) }
    catch (err) { alert(err.message) }
    finally { setDeleting(null) }
  }

  const filtered = users.filter((u) => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="admin-empty">Loading…</div>

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>Users ({users.length})</h2>
        <input className="admin-search" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Cards</th><th>QR Codes</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} className="admin-empty">No users found</td></tr>}
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>{u.name || <span className="muted">—</span>}</td>
                <td>{u.email}</td>
                <td>{u.card_count}</td>
                <td>{u.qr_count}</td>
                <td className="muted">{fmtDate(u.created_at)}</td>
                <td>
                  <div className="admin-action-row">
                    <button className="admin-btn-sm danger" onClick={() => handleDelete(u)} disabled={deleting === u.id}>
                      {deleting === u.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Cards ── */
function CardsTab() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchCards().then(setCards).finally(() => setLoading(false)) }, [])

  async function handleStatusChange(card, status) {
    setBusy(card.id)
    setMsg('')
    try {
      const updated = await updateCardStatus(card.id, status)
      setCards((cur) => cur.map((c) => (Number(c.id) === Number(updated.id) ? { ...c, status: updated.status } : c)))
      setMsg(`✓ "${updated.title}" → ${updated.status}`)
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(card) {
    if (!window.confirm(`Permanently delete card "${card.title}"?`)) return
    setBusy(card.id)
    try { await deleteAdminCard(card.id); setCards((cur) => cur.filter((c) => c.id !== card.id)) }
    catch (err) { alert(err.message) }
    finally { setBusy(null) }
  }

  const filtered = cards.filter((c) => !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.user_email?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="admin-empty">Loading…</div>

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>Digital Cards ({cards.length})</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 12, color: 'var(--gold)' }}>{msg}</span>}
          <input className="admin-search" placeholder="Search title or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Title</th><th>User</th><th>Status</th><th>Slug</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} className="admin-empty">No cards found</td></tr>}
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td><div>{c.user_name || <span className="muted">—</span>}</div><div className="muted">{c.user_email}</div></td>
                <td>
                  <select
                    className="admin-status-select"
                    value={c.status}
                    disabled={busy === c.id}
                    onChange={(e) => handleStatusChange(c, e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="suspended">Suspended</option>
                    <option value="archived">Archived</option>
                  </select>
                </td>
                <td className="muted">{c.slug}</td>
                <td className="muted">{fmtDate(c.created_at)}</td>
                <td>
                  <div className="admin-action-row">
                    <a className="admin-btn-sm" href={`/${c.slug}`} target="_blank" rel="noreferrer">View ↗</a>
                    <button className="admin-btn-sm danger" onClick={() => handleDelete(c)} disabled={busy === c.id}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── QR Codes ── */
function QrTab() {
  const [qrs, setQrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchQrCodes().then(setQrs).finally(() => setLoading(false)) }, [])

  async function handleLifecycleChange(qr, lifecycleStatus) {
    setBusy(qr.id)
    setMsg('')
    try {
      const updated = await updateQrLifecycle(qr.id, lifecycleStatus)
      setQrs((cur) => cur.map((q) => (Number(q.id) === Number(updated.id) ? { ...q, lifecycle_status: lifecycleStatus } : q)))
      setMsg(`✓ QR updated → ${lifecycleStatus}`)
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  const filtered = qrs.filter((q) => !search || q.card_title?.toLowerCase().includes(search.toLowerCase()) || q.user_email?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="admin-empty">Loading…</div>

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>QR Codes ({qrs.length})</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 12, color: 'var(--gold)' }}>{msg}</span>}
          <input className="admin-search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Card Title</th><th>User</th><th>Status</th><th>Purchased</th><th>Slug</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="admin-empty">No QR codes found</td></tr>}
            {filtered.map((q) => {
              const isActive = q.lifecycle_status !== 'archived'
              return (
                <tr key={q.id}>
                  <td>{q.card_title || <span className="muted">—</span>}</td>
                  <td><div>{q.user_name || <span className="muted">—</span>}</div><div className="muted">{q.user_email}</div></td>
                  <td>
                    <select
                      className="admin-status-select"
                      value={q.lifecycle_status === 'archived' ? 'archived' : 'active'}
                      disabled={busy === q.id}
                      onChange={(e) => handleLifecycleChange(q, e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="archived">Inactive</option>
                    </select>
                  </td>
                  <td><span className={`status-badge ${q.purchased === 'true' ? 'status-published' : 'status-draft'}`}>{q.purchased === 'true' ? 'Yes' : 'No'}</span></td>
                  <td className="muted">{q.slug}</td>
                  <td className="muted">{fmtDate(q.updated_at)}</td>
                  <td>
                    <div className="admin-action-row">
                      <button
                        className={`admin-btn-sm ${isActive ? 'danger' : 'success'}`}
                        onClick={() => handleLifecycleChange(q, isActive ? 'archived' : 'active')}
                        disabled={busy === q.id}
                      >
                        {busy === q.id ? '…' : isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Main ── */
const TABS = [
  { id: 'overview',       label: 'Overview',       icon: '📊' },
  { id: 'revenue',        label: 'Revenue',         icon: '💰' },
  { id: 'subscriptions',  label: 'Subscriptions',   icon: '🔄' },
  { id: 'users',          label: 'Users',           icon: '👥' },
  { id: 'cards',          label: 'Digital Cards',   icon: '🃏' },
  { id: 'qr',             label: 'QR Codes',        icon: '⬛' },
]

function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState('overview')
  const current = TABS.find((t) => t.id === tab)

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <strong>Brill Brains</strong>
          <span>Admin Panel</span>
        </div>
        <nav className="admin-nav">
          {TABS.map((t) => (
            <button key={t.id} className={`admin-nav-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)} type="button">
              <span className="admin-nav-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <button className="admin-logout-btn" type="button" onClick={onLogout}>Sign Out</button>
      </aside>
      <main className="admin-main">
        <h1 className="admin-page-title">{current?.icon} {current?.label}</h1>
        {tab === 'overview'      && <OverviewTab />}
        {tab === 'revenue'       && <RevenueTab />}
        {tab === 'subscriptions' && <SubscriptionsTab />}
        {tab === 'users'         && <UsersTab />}
        {tab === 'cards'         && <CardsTab />}
        {tab === 'qr'            && <QrTab />}
      </main>
    </div>
  )
}

class AdminErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="admin-login-wrap">
          <div className="admin-login-box" style={{ textAlign: 'center' }}>
            <h1 style={{ color: '#ff6b6b' }}>Something went wrong</h1>
            <p style={{ marginBottom: 16 }}>{this.state.error.message}</p>
            <button className="admin-login-btn" onClick={() => { localStorage.removeItem('admin_token'); window.location.href = '/admin' }}>
              Reset &amp; Try Again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AdminPanelInner() {
  const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn())
  function handleLogout() { adminLogout(); setLoggedIn(false) }
  if (!loggedIn) return <AdminLogin onSuccess={() => setLoggedIn(true)} />
  return <div className="admin-shell"><AdminDashboard onLogout={handleLogout} /></div>
}

export function AdminPanel() {
  return (
    <AdminErrorBoundary>
      <AdminPanelInner />
    </AdminErrorBoundary>
  )
}
