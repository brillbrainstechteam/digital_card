import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCards, fetchAnalytics, fetchAnalyticsLeads, fetchAnalyticsActivity } from '../api'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'

const POLL_INTERVAL = 15000

const BUTTON_LABELS = {
  call: 'Call', email: 'Email', whatsapp: 'WhatsApp',
  website: 'Website', save_contact: 'Save Contact',
}

const SOCIAL_LABELS = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  twitter: 'X (Twitter)', youtube: 'YouTube', telegram: 'Telegram',
  tiktok: 'TikTok', threads: 'Threads', soundcloud: 'SoundCloud',
  pinterest: 'Pinterest', patreon: 'Patreon', twitch: 'Twitch',
  apple_music: 'Apple Music', reddit: 'Reddit', github: 'GitHub',
}

const ALL_BUTTON_LABELS = { ...BUTTON_LABELS, ...SOCIAL_LABELS }

const BUTTON_EVENT_ICONS = {
  call: '\u{1F4DE}', email: '✉️', whatsapp: '\u{1F4AC}',
  website: '\u{1F310}', save_contact: '\u{1F4BE}',
}

export function formatEventLabel(event) {
  if (event.event_type === 'view') return { icon: '\u{1F440}', text: 'Card Viewed' }
  if (event.event_type === 'lead_created') {
    const name = event.metadata?.visitor_name
    return { icon: '\u{1F4BE}', text: name ? `Contact Saved by ${name}` : 'Contact Saved' }
  }
  if (event.event_type === 'button_click') {
    const btn = event.metadata?.button
    const label = ALL_BUTTON_LABELS[btn] || btn
    const icon = BUTTON_EVENT_ICONS[btn] || '\u{1F517}'
    return { icon, text: `${label} Clicked` }
  }
  return { icon: 'ℹ️', text: event.event_type }
}

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function downloadCsv(rows) {
  const header = ['Visitor Name', 'Business Name', 'Email', 'Phone', 'Submitted On']
  const lines = [header.join(',')]
  for (const lead of rows) {
    const submitted = new Date(lead.created_at).toLocaleString()
    const cells = [lead.visitor_name, lead.business_name, lead.email, lead.phone, submitted]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
    lines.push(cells.join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'leads.csv'; a.click()
  URL.revokeObjectURL(url)
}

const DATE_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'nameAsc', label: 'Name (A–Z)' },
  { value: 'nameDesc', label: 'Name (Z–A)' },
]

const LIMIT_OPTIONS = [10, 25, 50, 100]

export function AnalyticsPage() {
  const navigate = useNavigate()
  const [cards, setCards] = useState([])
  const [selectedCardId, setSelectedCardId] = useState('all')
  const [summary, setSummary] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const pollRef = useRef(null)

  // Leads filter state
  const [leads, setLeads] = useState([])
  const [leadsTotal, setLeadsTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [dateRange, setDateRange] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => { fetchCards().then(setCards).catch(() => {}) }, [])

  // Keep a ref of current leads params so the poll never uses stale values
  const leadsParamsRef = useRef({})
  leadsParamsRef.current = { search, page, limit, dateRange, dateFrom, dateTo, sortBy }

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetchAnalyticsLeads(selectedCardId, leadsParamsRef.current)
      setLeads(res.leads)
      setLeadsTotal(res.total)
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardId, search, page, limit, dateRange, dateFrom, dateTo, sortBy])

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [summaryData, leadsData, activityData] = await Promise.all([
        fetchAnalytics(selectedCardId),
        fetchAnalyticsLeads(selectedCardId, leadsParamsRef.current),
        fetchAnalyticsActivity(selectedCardId, { limit: 5 }),
      ])
      setSummary(summaryData)
      setLeads(leadsData.leads)
      setLeadsTotal(leadsData.total)
      setActivity(activityData.events || [])
    } catch {
      if (!silent) { setSummary(null); setLeads([]); setLeadsTotal(0); setActivity([]) }
    } finally {
      if (!silent) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardId])

  // Full reload on card change only
  useEffect(() => { loadAll(false) }, [selectedCardId]) // eslint-disable-line

  // Silent leads refresh on filter change
  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Polling
  useEffect(() => {
    pollRef.current = setInterval(() => loadAll(true), POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [loadAll])

  const totalPages = Math.max(1, Math.ceil(leadsTotal / limit))

  const coreButtons = summary
    ? Object.entries(BUTTON_LABELS).map(([k, l]) => ({ key: k, label: l, clicks: summary.buttonClicks[k] || 0 })).sort((a, b) => b.clicks - a.clicks)
    : []

  const socialButtons = summary
    ? Object.entries(SOCIAL_LABELS).map(([k, l]) => ({ key: k, label: l, clicks: summary.buttonClicks[k] || 0 })).filter((s) => s.clicks > 0).sort((a, b) => b.clicks - a.clicks)
    : []

  const totalClicks = summary?.totalButtonClicks || 0

  return (
    <main className="studio studio-workspace">
      <Sidebar mode="app" activeApp="analytics" />
      <section className="editor-panel editor-panel--wide">
        <PageHeader
          badge="ANALYTICS"
          title="Track your card performance"
          subtitle="Views, leads, button clicks and activity across your digital cards."
          actions={(
            <select className="analytics-card-filter" value={selectedCardId}
              onChange={(e) => { setSelectedCardId(e.target.value); setPage(1) }}>
              <option value="all">All Cards</option>
              {cards.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}
        />

        {loading || !summary ? (
          <p className="settings-placeholder">Loading analytics...</p>
        ) : (
        <>
          {/* Overview */}
          <div className="analytics-overview-grid">
            {[
              ['Total Views', summary.totalViews],
              ['Total Leads', summary.totalLeads],
              ['Button Clicks', summary.totalButtonClicks],
              ['Conversion %', `${summary.conversionRate}%`],
              ['Top Action', summary.topPerformingAction ? (ALL_BUTTON_LABELS[summary.topPerformingAction] || summary.topPerformingAction) : '—'],
              ['Last Activity', summary.lastActivity ? timeAgo(summary.lastActivity) : '—'],
            ].map(([label, value]) => (
              <div key={label} className="analytics-overview-card">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          {/* Button Performance */}
          <section className="editor-section">
            <h2>Button Performance</h2>
            <table className="analytics-leads-table">
              <thead><tr><th>Button</th><th>Clicks</th><th>% of Total</th></tr></thead>
              <tbody>
                {coreButtons.map((b) => (
                  <tr key={b.key}>
                    <td>{b.label}</td><td>{b.clicks}</td>
                    <td>{totalClicks > 0 ? ((b.clicks / totalClicks) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Social Performance */}
          {socialButtons.length > 0 && (
            <section className="editor-section">
              <h2>Social Performance</h2>
              <table className="analytics-leads-table">
                <thead><tr><th>Platform</th><th>Clicks</th></tr></thead>
                <tbody>
                  {socialButtons.map((s) => (
                    <tr key={s.key}><td>{s.label}</td><td>{s.clicks}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Recent Activity — 5 items only */}
          <section className="editor-section">
            <h2>Recent Activity</h2>
            {activity.length === 0 ? (
              <p className="settings-placeholder">No activity yet.</p>
            ) : (
              <div className="analytics-activity-list">
                {activity.map((event, i) => {
                  const { icon, text } = formatEventLabel(event)
                  return (
                    <div key={i} className="analytics-activity-item">
                      <span className="analytics-activity-label">
                        <span className="analytics-activity-icon">{icon}</span> {text}
                      </span>
                      <span className="analytics-activity-time">{timeAgo(event.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            )}
            <button className="analytics-view-all-btn" type="button" onClick={() => navigate('/activity')}>
              View All Activity →
            </button>
          </section>

          {/* Leads */}
          <section className="editor-section">
            <div className="editor-title">
              <h2>Leads</h2>
              <button className="secondary-button" type="button"
                onClick={() => downloadCsv(leads)} disabled={leads.length === 0}>
                Export CSV
              </button>
            </div>

            {/* Filters */}
            <div className="leads-filters">
              <input
                className="analytics-lead-search"
                type="text"
                placeholder="Search by name, email, phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <select className="leads-filter-select" value={dateRange}
                onChange={(e) => { setDateRange(e.target.value); setDateFrom(''); setDateTo(''); setPage(1) }}>
                {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {dateRange === 'custom' && (
                <>
                  <input type="date" className="leads-filter-select" value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
                  <input type="date" className="leads-filter-select" value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
                </>
              )}
              <select className="leads-filter-select" value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1) }}>
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select className="leads-filter-select leads-filter-select--narrow" value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}>
                {LIMIT_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
            </div>

            {leads.length === 0 ? (
              <p className="settings-placeholder">No leads found.</p>
            ) : (
              <>
                <div className="analytics-table-meta">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, leadsTotal)} of {leadsTotal} leads
                </div>
                <table className="analytics-leads-table">
                  <thead>
                    <tr>
                      <th>Visitor Name</th><th>Business Name</th>
                      <th>Email</th><th>Phone</th><th>Submitted On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td>{lead.visitor_name}</td>
                        <td>{lead.business_name || '—'}</td>
                        <td>{lead.email || '—'}</td>
                        <td>{lead.phone}</td>
                        <td>{new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="analytics-pagination">
                  <button className="secondary-button" type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    Previous
                  </button>
                  <span>Page {page} of {totalPages}</span>
                  <button className="secondary-button" type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Next
                  </button>
                </div>
              </>
            )}
          </section>
        </>
        )}
      </section>
    </main>
  )
}