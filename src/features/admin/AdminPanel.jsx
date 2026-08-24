import { Component, useCallback, useEffect, useState } from 'react'
import {
  adminLogin, adminLogout, isAdminLoggedIn,
  fetchStats, fetchInsights, fetchUsers, fetchCards, fetchQrCodes, fetchActivity,
  fetchUserDetail, updateCardStatus, updateQrLifecycle, deleteAdminCard, deleteAdminUser,
  fetchSubscriptions, resetUserPassword,
} from './adminApi'
import { AdminStoreProvider, useAdminResource, useAdminStore, useLastUpdatedLabel } from './adminStore'
import {
  AdminToastProvider, useAdminToast, ConfirmDialog, Modal,
  StatCard, TrendChart, BreakdownBars, DataTable, StatusPill,
  Skeleton, ErrorState, SectionCard,
  fmtDate, fmtDateTime, timeAgo, rup, num,
} from './adminUi'
import './admin.css'

const PRICE_PER_CARD = 1   // ₹1/month (update when Razorpay is live)
const PRICE_PER_QR   = 1   // ₹1/month

// Single definition of billable volume. The Overview used to bill every QR
// row while Revenue billed only purchased ones, so the two tabs disagreed
// about MRR — this keeps them honest.
function computeMrr({ publishedCards = 0, purchasedQrCodes = 0 }) {
  return publishedCards * PRICE_PER_CARD + purchasedQrCodes * PRICE_PER_QR
}

/* ══════════════════════════════════════════════════════
   Login
   ══════════════════════════════════════════════════════ */

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
    <div className="adm-login-wrap">
      <form className="adm-login-box" onSubmit={handleSubmit}>
        <img className="adm-login-logo" src="/bb-logo.png" alt="" />
        <h1>Admin Console</h1>
        <p className="adm-login-sub">Brill Brains Digital Card Studio</p>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@brillbrainsconsultants.com" autoComplete="username" required />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
        {error && <div className="adm-login-error">{error}</div>}
        <button className="adm-login-btn" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Overview
   ══════════════════════════════════════════════════════ */

function OverviewTab({ onOpenTab }) {
  const stats = useAdminResource('stats', fetchStats)
  const insights = useAdminResource('insights', fetchInsights)
  const activity = useAdminResource('activity', fetchActivity)
  const { refresh } = useAdminStore()

  if (stats.error) return <ErrorState message={stats.error} onRetry={refresh} />
  if (stats.loading || !stats.data) return <Skeleton rows={6} />

  const s = stats.data
  const mrr = computeMrr(s)
  const seriesFor = (key) => (insights.data?.series || []).map((d) => d[key])

  return (
    <>
      <div className="adm-stats-grid">
        <StatCard
          label="Total Users" value={num(s.users.total)} tone="accent"
          delta={{ current: s.users.last7, previous: s.users.prev7 }}
          series={seriesFor('users')}
          hint={`${num(s.users.last7)} new this week`}
        />
        <StatCard
          label="Digital Cards" value={num(s.cards.total)}
          delta={{ current: s.cards.last7, previous: s.cards.prev7 }}
          series={seriesFor('cards')}
          hint={`${num(s.publishedCards)} published · ${num(s.draftCards)} draft`}
        />
        <StatCard
          label="Card Views" value={num(s.views.total)}
          delta={{ current: s.views.last7, previous: s.views.prev7 }}
          series={seriesFor('views')}
          hint={`${num(s.views.last7)} in the last 7 days`}
        />
        <StatCard
          label="QR Scans" value={num(s.scans.total)}
          delta={{ current: s.scans.last7, previous: s.scans.prev7 }}
          series={seriesFor('scans')}
          hint={`${num(s.qrCodes.total)} codes · ${num(s.purchasedQrCodes)} paid`}
        />
        <StatCard
          label="Leads Captured" value={num(s.leads.total)}
          delta={{ current: s.leads.last7, previous: s.leads.prev7 }}
          hint="Contact forms submitted on cards"
        />
        <StatCard
          label="Estimated MRR" value={rup(mrr)} tone="gold"
          hint={`${num(s.publishedCards)} cards + ${num(s.purchasedQrCodes)} QR × ₹1`}
        />
      </div>

      {s.suspendedCards > 0 && (
        <div className="adm-banner adm-banner--warn">
          <strong>{num(s.suspendedCards)} card{s.suspendedCards === 1 ? ' is' : 's are'} suspended.</strong>
          <button className="adm-btn adm-btn--ghost" type="button" onClick={() => onOpenTab('cards')}>Review cards</button>
        </div>
      )}

      <SectionCard title="Activity over the last 30 days" padded>
        {insights.loading && <Skeleton rows={3} />}
        {insights.error && <ErrorState message={insights.error} onRetry={refresh} />}
        {insights.data && (
          <TrendChart
            series={insights.data.series}
            metrics={[
              { key: 'views', label: 'Card views' },
              { key: 'scans', label: 'QR scans' },
              { key: 'users', label: 'Signups' },
              { key: 'cards', label: 'Cards created' },
            ]}
          />
        )}
      </SectionCard>

      <div className="adm-two-col">
        <SectionCard title="Recent activity" subtitle="Newest signups and cards">
          {activity.loading && <Skeleton rows={4} />}
          {activity.error && <ErrorState message={activity.error} onRetry={refresh} />}
          {activity.data && activity.data.length === 0 && <p className="adm-muted-block">No activity yet</p>}
          {activity.data && activity.data.length > 0 && (
            <ul className="adm-feed">
              {activity.data.slice(0, 12).map((item, i) => (
                <li key={`${item.type}-${item.ts}-${i}`}>
                  <span className={`adm-feed-dot ${item.type === 'user_signup' ? 'user' : 'card'}`} />
                  <span className="adm-feed-main">
                    <strong>{item.label || '—'}</strong>
                    <span className="adm-muted">{item.type === 'user_signup' ? 'signed up' : 'created a card'}</span>
                  </span>
                  <span className="adm-feed-side">
                    <span className="adm-muted">{item.user_email}</span>
                    <time>{timeAgo(item.ts)}</time>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Top performing cards" subtitle="By total views" padded>
          {insights.loading && <Skeleton rows={4} />}
          {insights.data && insights.data.topCards.length === 0 && <p className="adm-muted-block">No card has been viewed yet</p>}
          {insights.data && insights.data.topCards.length > 0 && (
            <ol className="adm-rank">
              {insights.data.topCards.map((c, i) => (
                <li key={c.id}>
                  <span className="adm-rank-no">{i + 1}</span>
                  <span className="adm-rank-main">
                    <strong>{c.title || 'Untitled'}</strong>
                    <span className="adm-muted">{c.user_email}</span>
                  </span>
                  <span className="adm-rank-stats">
                    <span><strong>{num(c.views)}</strong> views</span>
                    <span><strong>{num(c.leads)}</strong> leads</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════
   Insights
   ══════════════════════════════════════════════════════ */

function InsightsTab() {
  const insights = useAdminResource('insights', fetchInsights)
  const stats = useAdminResource('stats', fetchStats)
  const { refresh } = useAdminStore()

  if (insights.error) return <ErrorState message={insights.error} onRetry={refresh} />
  if (insights.loading || !insights.data) return <Skeleton rows={6} />

  const s = stats.data
  const { devices, countries, topCards } = insights.data
  // Views-per-published-card is the honest engagement number; dividing by all
  // cards would drag it down with drafts nobody can reach.
  const viewsPerCard = s && s.publishedCards > 0 ? (s.views.total / s.publishedCards).toFixed(1) : '—'
  const leadRate = s && s.views.total > 0 ? `${((s.leads.total / s.views.total) * 100).toFixed(1)}%` : '—'

  return (
    <>
      <div className="adm-stats-grid">
        <StatCard label="Views per published card" value={viewsPerCard} hint="Average reach of a live card" />
        <StatCard label="Lead conversion" value={leadRate} hint="Leads captured per card view" />
        <StatCard label="Scans in last 30d" value={s ? num(s.scans.last30) : '—'} hint="QR codes scanned" />
        <StatCard label="Views in last 30d" value={s ? num(s.views.last30) : '—'} hint="Cards opened" />
      </div>

      <div className="adm-two-col">
        <SectionCard title="Scans by device" subtitle="Where your QR codes get scanned" padded>
          <BreakdownBars items={devices} empty="No scans recorded yet" />
        </SectionCard>
        <SectionCard title="Scans by country" padded>
          <BreakdownBars items={countries} empty="No scans recorded yet" />
        </SectionCard>
      </div>

      <SectionCard title="Card leaderboard" subtitle="Ranked by views, with lead capture">
        <DataTable
          rows={topCards}
          getRowKey={(r) => r.id}
          exportName="top-cards"
          defaultSort={{ key: 'views', dir: 'desc' }}
          emptyMessage="No card has been viewed yet"
          columns={[
            { key: 'title', label: 'Card', render: (r) => <strong>{r.title || 'Untitled'}</strong> },
            { key: 'user_email', label: 'Owner', render: (r) => <span className="adm-muted">{r.user_email}</span> },
            { key: 'views', label: 'Views', align: 'right', render: (r) => num(r.views) },
            { key: 'leads', label: 'Leads', align: 'right', render: (r) => num(r.leads) },
            {
              key: 'link', label: '', sortable: false, exportable: false,
              render: (r) => <a className="adm-btn adm-btn--ghost" href={`/${r.slug}`} target="_blank" rel="noreferrer">Open ↗</a>,
            },
          ]}
        />
      </SectionCard>
    </>
  )
}

/* ══════════════════════════════════════════════════════
   Revenue
   ══════════════════════════════════════════════════════ */

function RevenueTab() {
  const stats = useAdminResource('stats', fetchStats)
  const cards = useAdminResource('cards', fetchCards)
  const qrs = useAdminResource('qrcodes', fetchQrCodes)
  const { refresh } = useAdminStore()

  const err = stats.error || cards.error || qrs.error
  if (err) return <ErrorState message={err} onRetry={refresh} />
  if (stats.loading || cards.loading || qrs.loading) return <Skeleton rows={6} />

  const s = stats.data
  const publishedCards = (cards.data || []).filter((c) => c.status === 'published')
  const purchasedQrs = (qrs.data || []).filter((q) => q.purchased === 'true')
  const mrr = computeMrr(s)

  const billable = [
    ...publishedCards.map((c) => ({
      id: `card-${c.id}`, kind: 'Digital Card', name: c.title, user_email: c.user_email,
      since: c.created_at, amount: PRICE_PER_CARD,
    })),
    ...purchasedQrs.map((q) => ({
      id: `qr-${q.id}`, kind: 'QR Code', name: q.card_title || q.slug, user_email: q.user_email,
      since: q.created_at, amount: PRICE_PER_QR,
      inactive: q.lifecycle_status === 'archived',
    })),
  ]

  return (
    <>
      <div className="adm-banner adm-banner--info">
        <span>
          Figures below are <strong>modelled</strong> from active cards and paid QR codes at ₹1/month each.
          No payment has been recorded in the payments table yet, so this is not collected revenue.
        </span>
      </div>

      <div className="adm-stats-grid">
        <StatCard label="Monthly Recurring Revenue" value={rup(mrr)} tone="gold" hint="Modelled MRR" />
        <StatCard label="Annual Run Rate" value={rup(mrr * 12)} tone="gold" hint="MRR × 12" />
        <StatCard label="Billable Cards" value={num(publishedCards.length)} hint={`× ${rup(PRICE_PER_CARD)}/mo`} />
        <StatCard label="Billable QR Codes" value={num(purchasedQrs.length)} hint={`× ${rup(PRICE_PER_QR)}/mo`} />
        <StatCard
          label="Paid conversion" tone="accent"
          value={s.cards.total > 0 ? `${Math.round((publishedCards.length / s.cards.total) * 100)}%` : '—'}
          hint="Published share of all cards"
        />
        <StatCard label="Unpaid QR Codes" value={num(s.qrCodes.total - s.purchasedQrCodes)} hint="Created but never purchased" />
      </div>

      <SectionCard title="Billable line items" subtitle="Every card and QR code contributing to MRR">
        <DataTable
          rows={billable}
          getRowKey={(r) => r.id}
          searchKeys={['name', 'user_email', 'kind']}
          searchPlaceholder="Search by name, email or type…"
          exportName="revenue-line-items"
          defaultSort={{ key: 'since', dir: 'desc' }}
          emptyMessage="Nothing is billable yet"
          columns={[
            { key: 'kind', label: 'Type', render: (r) => <span className={`adm-tag adm-tag--${r.kind === 'QR Code' ? 'qr' : 'card'}`}>{r.kind}</span> },
            { key: 'name', label: 'Item', render: (r) => <strong>{r.name || '—'}</strong> },
            { key: 'user_email', label: 'Customer', render: (r) => <span className="adm-muted">{r.user_email}</span> },
            {
              key: 'inactive', label: 'State', sortValue: (r) => (r.inactive ? 'inactive' : 'active'),
              render: (r) => <StatusPill status={r.inactive ? 'inactive' : 'active'} />,
            },
            { key: 'since', label: 'Since', sortValue: (r) => new Date(r.since).getTime() || 0, render: (r) => <span className="adm-muted">{fmtDate(r.since)}</span> },
            { key: 'amount', label: 'Per month', align: 'right', render: (r) => <strong className="adm-money">{rup(r.amount)}</strong> },
          ]}
        />
      </SectionCard>
    </>
  )
}

/* ══════════════════════════════════════════════════════
   Subscriptions
   ══════════════════════════════════════════════════════ */

const SUB_FILTERS = ['all', 'active', 'cancelling', 'expired', 'suspended']

function SubscriptionsTab() {
  const subs = useAdminResource('subscriptions', fetchSubscriptions)
  const { refresh } = useAdminStore()
  const [filter, setFilter] = useState('all')

  if (subs.error) return <ErrorState message={subs.error} onRetry={refresh} />
  if (subs.loading || !subs.data) return <Skeleton rows={6} />

  const { stats, list } = subs.data
  const now = Date.now()

  const stateOf = (c) => {
    if (c.status === 'suspended') return 'suspended'
    if (!c.subscription_cancelled) return 'active'
    const exp = c.subscription_expires_at ? new Date(c.subscription_expires_at).getTime() : null
    if (exp && exp < now) return 'expired'
    return 'cancelling'
  }

  const rows = list.map((c) => ({ ...c, state: stateOf(c) }))
  const filtered = filter === 'all' ? rows : rows.filter((r) => r.state === filter)

  return (
    <>
      <div className="adm-stats-grid">
        <StatCard label="Active" value={num(stats.active)} tone="accent" hint="Published, not cancelled" />
        <StatCard label="Cancelling" value={num(stats.cancelled)} hint="Cancelled but still inside the paid period" />
        <StatCard label="Expired" value={num(stats.expired)} hint="Paid period has ended" />
        <StatCard label="Suspended" value={num(stats.suspended)} hint="Manually suspended by an admin" />
      </div>

      <SectionCard
        title="Subscriptions"
        action={(
          <div className="adm-segmented">
            {SUB_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`adm-segment${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f[0].toUpperCase() + f.slice(1)}
                <span className="adm-segment-count">
                  {f === 'all' ? rows.length : rows.filter((r) => r.state === f).length}
                </span>
              </button>
            ))}
          </div>
        )}
      >
        <DataTable
          rows={filtered}
          getRowKey={(r) => r.id}
          searchKeys={['title', 'user_email', 'user_name']}
          searchPlaceholder="Search card or customer…"
          exportName={`subscriptions-${filter}`}
          defaultSort={{ key: 'updated_at', dir: 'desc' }}
          emptyMessage={`No ${filter === 'all' ? '' : filter} subscriptions`}
          columns={[
            { key: 'title', label: 'Card', render: (r) => <strong>{r.title || 'Untitled'}</strong> },
            {
              key: 'user_email', label: 'Customer',
              render: (r) => <><div>{r.user_name || '—'}</div><div className="adm-muted">{r.user_email}</div></>,
            },
            { key: 'status', label: 'Card status', render: (r) => <StatusPill status={r.status} /> },
            { key: 'state', label: 'Subscription', render: (r) => <StatusPill status={r.state} /> },
            {
              key: 'subscription_expires_at', label: 'Expires',
              sortValue: (r) => new Date(r.subscription_expires_at).getTime() || 0,
              render: (r) => <span className="adm-muted">{fmtDate(r.subscription_expires_at)}</span>,
            },
            {
              key: 'updated_at', label: 'Last change',
              sortValue: (r) => new Date(r.updated_at).getTime() || 0,
              render: (r) => <span className="adm-muted">{timeAgo(r.updated_at)}</span>,
            },
          ]}
        />
      </SectionCard>
    </>
  )
}

/* ══════════════════════════════════════════════════════
   Users
   ══════════════════════════════════════════════════════ */

function UserDetailModal({ userId, onClose }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setError('')
    fetchUserDetail(userId)
      .then((d) => { if (!cancelled) setDetail(d) })
      .catch((e) => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [userId])

  return (
    <Modal open title={detail ? (detail.user.name || detail.user.email) : 'Loading…'} onClose={onClose} wide>
      {error && <ErrorState message={error} />}
      {!detail && !error && <Skeleton rows={4} />}
      {detail && (
        <>
          <div className="adm-detail-head">
            <div>
              <span className="adm-muted">Email</span>
              <strong>{detail.user.email}</strong>
            </div>
            <div>
              <span className="adm-muted">Joined</span>
              <strong>{fmtDateTime(detail.user.created_at)}</strong>
            </div>
            <div>
              <span className="adm-muted">Leads captured</span>
              <strong>{num(detail.totalLeads)}</strong>
            </div>
          </div>

          <h4 className="adm-detail-heading">Cards ({detail.cards.length})</h4>
          {detail.cards.length === 0 ? <p className="adm-muted-block">No cards</p> : (
            <table className="adm-table adm-table--compact">
              <thead><tr><th>Title</th><th>Status</th><th className="align-right">Views</th><th className="align-right">Leads</th><th>Created</th><th /></tr></thead>
              <tbody>
                {detail.cards.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.title || 'Untitled'}</strong></td>
                    <td><StatusPill status={c.status} /></td>
                    <td className="align-right">{num(c.views)}</td>
                    <td className="align-right">{num(c.leads)}</td>
                    <td className="adm-muted">{fmtDate(c.created_at)}</td>
                    <td><a className="adm-btn adm-btn--ghost" href={`/${c.slug}`} target="_blank" rel="noreferrer">Open ↗</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h4 className="adm-detail-heading">QR codes ({detail.qrCodes.length})</h4>
          {detail.qrCodes.length === 0 ? <p className="adm-muted-block">No QR codes</p> : (
            <table className="adm-table adm-table--compact">
              <thead><tr><th>Card</th><th>Paid</th><th>State</th><th className="align-right">Scans</th><th>Created</th></tr></thead>
              <tbody>
                {detail.qrCodes.map((q) => (
                  <tr key={q.id}>
                    <td>{q.card_title || <span className="adm-mono">{q.slug}</span>}</td>
                    <td><StatusPill status={q.purchased === 'true' ? 'paid' : 'unpaid'} /></td>
                    <td><StatusPill status={q.lifecycle_status === 'archived' ? 'inactive' : 'active'} /></td>
                    <td className="align-right">{num(q.scans)}</td>
                    <td className="adm-muted">{fmtDate(q.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </Modal>
  )
}

function UsersTab() {
  const users = useAdminResource('users', fetchUsers)
  const { refresh, patchCache } = useAdminStore()
  const toast = useAdminToast()
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [resetResult, setResetResult] = useState(null)
  const [detailUserId, setDetailUserId] = useState(null)

  const runConfirm = useCallback(async () => {
    if (!confirm) return
    setBusy(true)
    try {
      await confirm.action()
      setConfirm(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [confirm, toast])

  if (users.error) return <ErrorState message={users.error} onRetry={refresh} />
  if (users.loading || !users.data) return <Skeleton rows={6} />

  function askDelete(user) {
    setConfirm({
      title: 'Delete this user?',
      tone: 'danger',
      confirmLabel: 'Delete permanently',
      requireText: user.email,
      body: (
        <>
          <p><strong>{user.email}</strong> and everything they own will be removed:</p>
          <ul className="adm-modal-list">
            <li>{num(user.card_count)} digital card{user.card_count === 1 ? '' : 's'}</li>
            <li>{num(user.qr_count)} QR code{user.qr_count === 1 ? '' : 's'}</li>
            <li>All associated views, scans and captured leads</li>
          </ul>
          <p className="adm-warn-text">This cannot be undone.</p>
        </>
      ),
      action: async () => {
        await deleteAdminUser(user.id)
        patchCache('users', (list) => list.filter((u) => u.id !== user.id))
        toast.success(`Deleted ${user.email}`)
      },
    })
  }

  function askReset(user) {
    setConfirm({
      title: 'Reset password?',
      confirmLabel: 'Generate new password',
      body: <p>A new temporary password will be generated for <strong>{user.email}</strong>. Their current password stops working immediately.</p>,
      action: async () => {
        const result = await resetUserPassword(user.id)
        setResetResult(result)
      },
    })
  }

  return (
    <>
      <SectionCard title="Users" subtitle="Everyone with an account">
        <DataTable
          rows={users.data}
          getRowKey={(r) => r.id}
          searchKeys={['name', 'email']}
          searchPlaceholder="Search name or email…"
          exportName="users"
          defaultSort={{ key: 'created_at', dir: 'desc' }}
          emptyMessage="No users yet"
          onRowClick={(u) => setDetailUserId(u.id)}
          columns={[
            {
              key: 'name', label: 'User',
              render: (u) => (
                <>
                  <strong>{u.name || 'Unnamed'}</strong>
                  <div className="adm-muted">{u.email}</div>
                </>
              ),
              exportValue: (u) => u.name || '',
            },
            { key: 'card_count', label: 'Cards', align: 'right', render: (u) => num(u.card_count) },
            {
              key: 'published_count', label: 'Published', align: 'right',
              render: (u) => (u.published_count > 0 ? <strong className="adm-money">{num(u.published_count)}</strong> : <span className="adm-muted">0</span>),
            },
            { key: 'qr_count', label: 'QR codes', align: 'right', render: (u) => num(u.qr_count) },
            {
              key: 'created_at', label: 'Joined',
              sortValue: (u) => new Date(u.created_at).getTime() || 0,
              render: (u) => <span className="adm-muted" title={fmtDateTime(u.created_at)}>{fmtDate(u.created_at)}</span>,
            },
            {
              key: 'actions', label: '', sortable: false, exportable: false,
              render: (u) => (
                <div className="adm-row-actions">
                  <button className="adm-btn adm-btn--ghost" type="button" onClick={() => setDetailUserId(u.id)}>View</button>
                  <button className="adm-btn adm-btn--ghost" type="button" onClick={() => askReset(u)}>Reset password</button>
                  <button className="adm-btn adm-btn--danger-ghost" type="button" onClick={() => askDelete(u)}>Delete</button>
                </div>
              ),
            },
          ]}
        />
      </SectionCard>

      {detailUserId && <UserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} />}

      <ConfirmDialog
        open={Boolean(confirm)}
        busy={busy}
        title={confirm?.title}
        body={confirm?.body}
        tone={confirm?.tone}
        confirmLabel={confirm?.confirmLabel}
        requireText={confirm?.requireText}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />

      <Modal open={Boolean(resetResult)} title="Temporary password generated" onClose={() => setResetResult(null)}>
        {resetResult && (
          <>
            <p>New temporary password for <strong>{resetResult.email}</strong>:</p>
            <div className="adm-secret">
              <code>{resetResult.tempPassword}</code>
              <button
                className="adm-btn adm-btn--ghost"
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resetResult.tempPassword)
                    .then(() => toast.success('Password copied'))
                    .catch(() => toast.error('Could not copy'))
                }}
              >Copy</button>
            </div>
            <p className="adm-muted">
              Share it over a secure channel. Ask the user to change it from Settings after signing in.
              This is the only time it will be shown.
            </p>
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn--primary" type="button" onClick={() => setResetResult(null)}>Done</button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}

/* ══════════════════════════════════════════════════════
   Cards
   ══════════════════════════════════════════════════════ */

const CARD_STATUSES = ['draft', 'published', 'suspended', 'archived']

function CardsTab() {
  const cards = useAdminResource('cards', fetchCards)
  const { refresh, patchCache } = useAdminStore()
  const toast = useAdminToast()
  const [busyId, setBusyId] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  if (cards.error) return <ErrorState message={cards.error} onRetry={refresh} />
  if (cards.loading || !cards.data) return <Skeleton rows={6} />

  async function changeStatus(card, status) {
    setBusyId(card.id)
    try {
      const updated = await updateCardStatus(card.id, status)
      // Card ids are UUIDs — Number(uuid) is NaN and NaN === NaN is false, so
      // a numeric comparison here never matched and the dropdown silently
      // reverted even though the save had succeeded.
      patchCache('cards', (list) => list.map((c) => (String(c.id) === String(updated.id) ? { ...c, status: updated.status } : c)))
      toast.success(`“${updated.title}” is now ${updated.status}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  function askDelete(card) {
    setConfirm({
      title: 'Delete this card?',
      tone: 'danger',
      confirmLabel: 'Delete permanently',
      requireText: card.title || undefined,
      body: (
        <>
          <p><strong>{card.title || 'This card'}</strong> will be removed along with its QR codes, scans, views and leads.</p>
          <p className="adm-warn-text">This cannot be undone.</p>
        </>
      ),
      action: async () => {
        await deleteAdminCard(card.id)
        patchCache('cards', (list) => list.filter((c) => c.id !== card.id))
        toast.success('Card deleted')
      },
    })
  }

  const rows = statusFilter === 'all' ? cards.data : cards.data.filter((c) => c.status === statusFilter)
  const countFor = (s) => (s === 'all' ? cards.data.length : cards.data.filter((c) => c.status === s).length)

  return (
    <>
      <SectionCard
        title="Digital cards"
        action={(
          <div className="adm-segmented">
            {['all', ...CARD_STATUSES].map((s) => (
              <button key={s} type="button" className={`adm-segment${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
                {s[0].toUpperCase() + s.slice(1)}
                <span className="adm-segment-count">{countFor(s)}</span>
              </button>
            ))}
          </div>
        )}
      >
        <DataTable
          rows={rows}
          getRowKey={(r) => r.id}
          searchKeys={['title', 'user_email', 'user_name', 'slug']}
          searchPlaceholder="Search title, slug or email…"
          exportName={`cards-${statusFilter}`}
          defaultSort={{ key: 'created_at', dir: 'desc' }}
          emptyMessage={`No ${statusFilter === 'all' ? '' : statusFilter} cards`}
          columns={[
            {
              key: 'title', label: 'Card',
              render: (c) => (
                <>
                  <strong>{c.title || 'Untitled'}</strong>
                  <div className="adm-mono adm-muted">/{c.slug}</div>
                </>
              ),
            },
            {
              key: 'user_email', label: 'Owner',
              render: (c) => <><div>{c.user_name || '—'}</div><div className="adm-muted">{c.user_email}</div></>,
            },
            {
              key: 'status', label: 'Status',
              render: (c) => (
                <select
                  className="adm-select"
                  value={c.status}
                  disabled={busyId === c.id}
                  onChange={(e) => changeStatus(c, e.target.value)}
                >
                  {CARD_STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                </select>
              ),
              exportValue: (c) => c.status,
            },
            { key: 'views', label: 'Views', align: 'right', render: (c) => num(c.views) },
            { key: 'leads', label: 'Leads', align: 'right', render: (c) => num(c.leads) },
            {
              key: 'created_at', label: 'Created',
              sortValue: (c) => new Date(c.created_at).getTime() || 0,
              render: (c) => <span className="adm-muted" title={fmtDateTime(c.created_at)}>{fmtDate(c.created_at)}</span>,
            },
            {
              key: 'actions', label: '', sortable: false, exportable: false,
              render: (c) => (
                <div className="adm-row-actions">
                  <a className="adm-btn adm-btn--ghost" href={`/${c.slug}`} target="_blank" rel="noreferrer">Open ↗</a>
                  <button className="adm-btn adm-btn--danger-ghost" type="button" onClick={() => askDelete(c)} disabled={busyId === c.id}>Delete</button>
                </div>
              ),
            },
          ]}
        />
      </SectionCard>

      <ConfirmDialog
        open={Boolean(confirm)}
        busy={confirmBusy}
        title={confirm?.title}
        body={confirm?.body}
        tone={confirm?.tone}
        confirmLabel={confirm?.confirmLabel}
        requireText={confirm?.requireText}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          setConfirmBusy(true)
          try { await confirm.action(); setConfirm(null) }
          catch (err) { toast.error(err.message) }
          finally { setConfirmBusy(false) }
        }}
      />
    </>
  )
}

/* ══════════════════════════════════════════════════════
   QR codes
   ══════════════════════════════════════════════════════ */

function QrTab() {
  const qrs = useAdminResource('qrcodes', fetchQrCodes)
  const { refresh, patchCache } = useAdminStore()
  const toast = useAdminToast()
  const [busyId, setBusyId] = useState(null)
  const [filter, setFilter] = useState('all')

  if (qrs.error) return <ErrorState message={qrs.error} onRetry={refresh} />
  if (qrs.loading || !qrs.data) return <Skeleton rows={6} />

  async function setLifecycle(qr, lifecycleStatus) {
    setBusyId(qr.id)
    try {
      const updated = await updateQrLifecycle(qr.id, lifecycleStatus)
      // Same UUID/Number() pitfall as the cards table above.
      patchCache('qrcodes', (list) => list.map((q) => (String(q.id) === String(updated.id) ? { ...q, lifecycle_status: lifecycleStatus } : q)))
      toast.success(`QR code ${lifecycleStatus === 'archived' ? 'deactivated' : 'activated'}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const matches = (q) => {
    if (filter === 'paid') return q.purchased === 'true'
    if (filter === 'unpaid') return q.purchased !== 'true'
    if (filter === 'active') return q.lifecycle_status !== 'archived'
    if (filter === 'inactive') return q.lifecycle_status === 'archived'
    return true
  }
  const rows = qrs.data.filter(matches)

  return (
    <SectionCard
      title="QR codes"
      action={(
        <div className="adm-segmented">
          {['all', 'paid', 'unpaid', 'active', 'inactive'].map((f) => (
            <button key={f} type="button" className={`adm-segment${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
              <span className="adm-segment-count">{f === 'all' ? qrs.data.length : qrs.data.filter((q) => {
                if (f === 'paid') return q.purchased === 'true'
                if (f === 'unpaid') return q.purchased !== 'true'
                if (f === 'active') return q.lifecycle_status !== 'archived'
                return q.lifecycle_status === 'archived'
              }).length}</span>
            </button>
          ))}
        </div>
      )}
    >
      <DataTable
        rows={rows}
        getRowKey={(r) => r.id}
        searchKeys={['card_title', 'user_email', 'user_name', 'slug']}
        searchPlaceholder="Search card, slug or email…"
        exportName={`qr-codes-${filter}`}
        defaultSort={{ key: 'created_at', dir: 'desc' }}
        emptyMessage="No QR codes"
        columns={[
          {
            key: 'card_title', label: 'QR code',
            render: (q) => (
              <>
                <strong>{q.card_title || 'Standalone code'}</strong>
                <div className="adm-mono adm-muted">/q/{q.slug}</div>
              </>
            ),
          },
          {
            key: 'user_email', label: 'Owner',
            render: (q) => <><div>{q.user_name || '—'}</div><div className="adm-muted">{q.user_email}</div></>,
          },
          {
            key: 'purchased', label: 'Paid',
            sortValue: (q) => (q.purchased === 'true' ? 1 : 0),
            render: (q) => <StatusPill status={q.purchased === 'true' ? 'paid' : 'unpaid'} />,
          },
          {
            key: 'lifecycle_status', label: 'State',
            sortValue: (q) => (q.lifecycle_status === 'archived' ? 'inactive' : 'active'),
            render: (q) => <StatusPill status={q.lifecycle_status === 'archived' ? 'inactive' : 'active'} />,
          },
          { key: 'scans', label: 'Scans', align: 'right', render: (q) => num(q.scans) },
          {
            key: 'created_at', label: 'Created',
            sortValue: (q) => new Date(q.created_at).getTime() || 0,
            render: (q) => <span className="adm-muted" title={fmtDateTime(q.created_at)}>{fmtDate(q.created_at)}</span>,
          },
          {
            key: 'actions', label: '', sortable: false, exportable: false,
            render: (q) => {
              const isActive = q.lifecycle_status !== 'archived'
              return (
                <button
                  className={isActive ? 'adm-btn adm-btn--danger-ghost' : 'adm-btn adm-btn--ghost'}
                  type="button"
                  disabled={busyId === q.id}
                  onClick={() => setLifecycle(q, isActive ? 'archived' : 'active')}
                >
                  {busyId === q.id ? '…' : isActive ? 'Deactivate' : 'Activate'}
                </button>
              )
            },
          },
        ]}
      />
    </SectionCard>
  )
}

/* ══════════════════════════════════════════════════════
   Shell
   ══════════════════════════════════════════════════════ */

const TABS = [
  { id: 'overview',      label: 'Overview',      icon: '◈', component: OverviewTab },
  { id: 'insights',      label: 'Insights',      icon: '◉', component: InsightsTab },
  { id: 'revenue',       label: 'Revenue',       icon: '₹', component: RevenueTab },
  { id: 'subscriptions', label: 'Subscriptions', icon: '⟳', component: SubscriptionsTab },
  { id: 'users',         label: 'Users',         icon: '☰', component: UsersTab },
  { id: 'cards',         label: 'Digital Cards', icon: '▤', component: CardsTab },
  { id: 'qr',            label: 'QR Codes',      icon: '▦', component: QrTab },
]

const SUBTITLES = {
  overview: 'Health of the platform at a glance',
  insights: 'How cards and QR codes are actually performing',
  revenue: 'Modelled recurring revenue and billable items',
  subscriptions: 'Lifecycle of every paid card',
  users: 'Accounts, their content and admin actions',
  cards: 'Every digital card, with moderation controls',
  qr: 'Every QR code, paid state and scan volume',
}

function tabFromHash() {
  const id = window.location.hash.replace('#', '')
  return TABS.some((t) => t.id === id) ? id : 'overview'
}

function AdminDashboard({ onLogout }) {
  // Tab lives in the URL hash so a refresh (or a shared link) lands back on
  // the same screen instead of bouncing to Overview.
  const [tab, setTab] = useState(tabFromHash)
  const [navOpen, setNavOpen] = useState(false)
  const { refresh, inFlight } = useAdminStore()
  const lastUpdated = useLastUpdatedLabel()

  useEffect(() => {
    function onHash() { setTab(tabFromHash()) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((id) => {
    window.location.hash = id
    setTab(id)
    setNavOpen(false)
  }, [])

  // R refreshes, 1-7 jump to a tab — but never while the admin is typing into
  // a search box or the delete-confirmation field.
  useEffect(() => {
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.key.toLowerCase() === 'r') { refresh(); return }
      const n = Number(e.key)
      if (n >= 1 && n <= TABS.length) go(TABS[n - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [refresh, go])

  const current = TABS.find((t) => t.id === tab) || TABS[0]
  const Body = current.component

  return (
    <div className={`adm-layout${navOpen ? ' nav-open' : ''}`}>
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <img src="/bb-logo.png" alt="" />
          <div>
            <strong>Brill Brains</strong>
            <span>Admin Console</span>
          </div>
        </div>
        <nav className="adm-nav">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className={`adm-nav-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => go(t.id)}
            >
              <span className="adm-nav-icon" aria-hidden="true">{t.icon}</span>
              <span className="adm-nav-label">{t.label}</span>
              <kbd className="adm-nav-kbd">{i + 1}</kbd>
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-foot">
          <p className="adm-kbd-hint"><kbd>R</kbd> refresh · <kbd>1</kbd>–<kbd>{TABS.length}</kbd> switch tab</p>
          <button className="adm-logout" type="button" onClick={onLogout}>Sign out</button>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-topbar">
          <button className="adm-nav-toggle" type="button" onClick={() => setNavOpen((v) => !v)} aria-label="Toggle navigation">☰</button>
          <div className="adm-topbar-title">
            <h1>{current.label}</h1>
            <p>{SUBTITLES[current.id]}</p>
          </div>
          <div className="adm-topbar-actions">
            {lastUpdated && <span className="adm-updated">{lastUpdated}</span>}
            <button className="adm-btn adm-btn--ghost" type="button" onClick={refresh} disabled={inFlight > 0}>
              <span className={inFlight > 0 ? 'adm-spin' : undefined}>⟳</span> {inFlight > 0 ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>
        <main className="adm-content">
          <Body onOpenTab={go} />
        </main>
      </div>

      {navOpen && <button className="adm-nav-scrim" type="button" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
    </div>
  )
}

class AdminErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="adm-login-wrap">
          <div className="adm-login-box" style={{ textAlign: 'center' }}>
            <h1 style={{ color: '#ff8a8a' }}>Something went wrong</h1>
            <p className="adm-login-sub">{this.state.error.message}</p>
            <button className="adm-login-btn" onClick={() => { localStorage.removeItem('admin_token'); window.location.href = '/admin' }}>
              Reset &amp; try again
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
  if (!loggedIn) return <AdminLogin onSuccess={() => setLoggedIn(true)} />
  return (
    <div className="adm-shell">
      <AdminStoreProvider>
        <AdminToastProvider>
          <AdminDashboard onLogout={() => { adminLogout(); setLoggedIn(false) }} />
        </AdminToastProvider>
      </AdminStoreProvider>
    </div>
  )
}

export function AdminPanel() {
  return (
    <AdminErrorBoundary>
      <AdminPanelInner />
    </AdminErrorBoundary>
  )
}
