import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCards, fetchAnalytics, fetchAnalyticsLeads, fetchAnalyticsActivity } from '../services/api'
import { PageHeader } from '../../../components/PageHeader'
import { Sidebar } from '../../../components/Sidebar'
import { fetchQrAnalytics, fetchOverallQrAnalytics } from '../../qr'

const POLL_INTERVAL = 15000

const BUTTON_LABELS = {
  call: 'Call', email: 'Email', whatsapp: 'WhatsApp',
  website: 'Website', save_contact: 'Save Contact', google_maps: 'Google Maps',
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
  website: '\u{1F310}', save_contact: '\u{1F4BE}', google_maps: '\u{1F4CD}',
}

export function formatEventLabel(event) {
  if (event.event_type === 'view') return { icon: '\u{1F440}', text: 'Card Viewed' }
  if (event.event_type === 'qr_scan') return { icon: '\u{1F4F1}', text: 'QR Code Scanned' }
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

const LEADS_COLUMNS = [
  { key: 'visitor_name', label: 'Visitor Name' },
  { key: 'business_name', label: 'Business Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'created_at', label: 'Submitted on' },
]

const LEADS_COLUMNS_STORAGE_KEY = 'bb_leads_visible_columns'

function loadVisibleColumns() {
  try {
    const stored = JSON.parse(localStorage.getItem(LEADS_COLUMNS_STORAGE_KEY))
    if (Array.isArray(stored) && stored.length > 0) {
      const valid = stored.filter((key) => LEADS_COLUMNS.some((c) => c.key === key))
      if (valid.length > 0) return valid
    }
  } catch { /* ignore malformed storage */ }
  return LEADS_COLUMNS.map((c) => c.key)
}

function ColumnsFilter({ visibleColumns, onToggle }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="apply-to-trigger-wrap" ref={wrapRef}>
      <button
        type="button"
        className="secondary-button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Columns
      </button>
      {open && (
        <div className="apply-to-popover">
          <div className="apply-to-groups">
            <div className="apply-to-group">
              {LEADS_COLUMNS.map((col) => {
                const checked = visibleColumns.includes(col.key)
                const isLastChecked = checked && visibleColumns.length === 1
                return (
                  <label key={col.key} className="apply-to-checkbox">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isLastChecked}
                      onChange={() => onToggle(col.key)}
                    />
                    {col.label}
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AnalyticsPage() {
  const navigate = useNavigate()
  const [cards, setCards] = useState([])
  const [selectedCardId, setSelectedCardId] = useState('all')
  const [summary, setSummary] = useState(null)
  const [activity, setActivity] = useState([])
  const [qrAnalytics, setQrAnalytics] = useState(null)
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
  const [visibleColumns, setVisibleColumns] = useState(loadVisibleColumns)
  const selectedCard = cards.find((card) => String(card.id) === String(selectedCardId))
  const leadCaptureEnabled = selectedCardId === 'all' || selectedCard?.card_data?.saveContactRequireForm !== false

  useEffect(() => {
    try { localStorage.setItem(LEADS_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns)) } catch { /* ignore */ }
  }, [visibleColumns])

  function toggleColumn(key) {
    setVisibleColumns((cur) => {
      if (cur.includes(key)) {
        if (cur.length === 1) return cur
        return cur.filter((k) => k !== key)
      }
      return [...cur, key]
    })
  }

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    fetchCards()
      .then((items) => setCards(items.filter((card) => card.status !== 'archived')))
      .catch(() => {})
  }, [])

  // Keep a ref of current leads params so the poll never uses stale values
  const leadsParamsRef = useRef({})
  leadsParamsRef.current = { search, page, limit, dateRange, dateFrom, dateTo, sortBy }

  const fetchLeads = useCallback(async () => {
    if (!leadCaptureEnabled) {
      setLeads([]); setLeadsTotal(0)
      return
    }
    try {
      const res = await fetchAnalyticsLeads(selectedCardId, leadsParamsRef.current)
      setLeads(res.leads)
      setLeadsTotal(res.total)
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardId, search, page, limit, dateRange, dateFrom, dateTo, sortBy, leadCaptureEnabled])

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [summaryData, leadsData, activityData, qrData] = await Promise.all([
        fetchAnalytics(selectedCardId, leadsParamsRef.current),
        fetchAnalyticsLeads(selectedCardId, leadsParamsRef.current),
        fetchAnalyticsActivity(selectedCardId, { limit: 5 }),
        (selectedCardId === 'all'
          ? fetchOverallQrAnalytics({ activeCardsOnly: true })
          : fetchQrAnalytics({ cardId: selectedCardId })).catch(() => null),
      ])
      setSummary(leadCaptureEnabled ? summaryData : { ...summaryData, totalLeads: 0 })
      setLeads(leadCaptureEnabled ? leadsData.leads : [])
      setLeadsTotal(leadCaptureEnabled ? leadsData.total : 0)
      setActivity(activityData.events || [])
      setQrAnalytics(qrData)
    } catch {
      if (!silent) { setSummary(null); setLeads([]); setLeadsTotal(0); setActivity([]); setQrAnalytics(null) }
    } finally {
      if (!silent) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardId, leadCaptureEnabled])

  // Full reload on card change only
  useEffect(() => {
    loadAll(false)
  }, [selectedCardId]) // eslint-disable-line

  // Silent leads refresh on filter change
  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Refresh the summary stats (views/scans/clicks/etc.) whenever the date
  // filter changes — the leads table and the summary cards should agree on
  // the same time window.
  useEffect(() => {
    fetchAnalytics(selectedCardId, { dateRange, dateFrom, dateTo })
      .then((data) => setSummary(leadCaptureEnabled ? data : { ...data, totalLeads: 0 }))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardId, dateRange, dateFrom, dateTo, leadCaptureEnabled])

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
            <div className="analytics-header-actions">
              <select className="analytics-card-filter" value={selectedCardId}
                onChange={(e) => { setSelectedCardId(e.target.value); setPage(1) }}>
                <option value="all">All Cards</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <select className="analytics-card-filter" value={dateRange}
                onChange={(e) => { setDateRange(e.target.value); setDateFrom(''); setDateTo(''); setPage(1) }}>
                {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}
        />

        {dateRange === 'custom' && (
          <div className="leads-filters" style={{ marginBottom: 20 }}>
            <input type="date" className="leads-filter-select" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
            <input type="date" className="leads-filter-select" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
          </div>
        )}

        {loading || !summary ? (
          <p className="settings-placeholder">Loading analytics...</p>
        ) : summary.totalViews === 0 ? (
          <div className="analytics-empty-state">
            <div className="analytics-empty-icon">📊</div>
            <h2>No data yet</h2>
            <p>Your analytics will appear here once people start viewing your card.</p>
            <div className="analytics-empty-steps">
              <div className="analytics-empty-step">
                <span className="analytics-empty-step-num">1</span>
                <div>
                  <strong>Publish your card</strong>
                  <p>Go to your card in the Studio and hit Publish.</p>
                </div>
              </div>
              <div className="analytics-empty-step">
                <span className="analytics-empty-step-num">2</span>
                <div>
                  <strong>Share your link</strong>
                  <p>Send your card link via WhatsApp, email, or print a QR code.</p>
                </div>
              </div>
              <div className="analytics-empty-step">
                <span className="analytics-empty-step-num">3</span>
                <div>
                  <strong>Watch the data roll in</strong>
                  <p>Views, button clicks, leads and more appear here in real time.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
        <>
          {/* Overview */}
          <div className="analytics-overview-grid">
            {[
              ['Total Views', summary.totalViews],
              ['QR Scans', summary.totalQrScans ?? 0],
              ...(leadCaptureEnabled ? [['Total Leads', summary.totalLeads]] : []),
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

          {/* QR Code Performance */}
          {qrAnalytics && qrAnalytics.totalScans > 0 && (
            <section className="editor-section">
              <h2>QR Code Performance</h2>
              <div className="analytics-overview-grid">
                <div className="analytics-overview-card"><span>Total Scans</span><strong>{qrAnalytics.totalScans}</strong></div>
                <div className="analytics-overview-card"><span>Unique Scans</span><strong>{qrAnalytics.uniqueScans}</strong></div>
              </div>
              <div className="analytics-traffic-grid">
                {Object.entries(qrAnalytics.deviceBreakdown).map(([device, count]) => (
                  <div key={`device-${device}`}><span>{device}</span><strong>{count}</strong></div>
                ))}
                {Object.entries(qrAnalytics.browserBreakdown).map(([browser, count]) => (
                  <div key={`browser-${browser}`}><span>{browser}</span><strong>{count}</strong></div>
                ))}
                {Object.entries(qrAnalytics.osBreakdown).map(([os, count]) => (
                  <div key={`os-${os}`}><span>{os}</span><strong>{count}</strong></div>
                ))}
                {Object.entries(qrAnalytics.countryBreakdown).map(([country, count]) => (
                  <div key={`country-${country}`}><span>{country}</span><strong>{count}</strong></div>
                ))}
              </div>
              {qrAnalytics.recentScans.length > 0 && (
                <table className="analytics-leads-table">
                  <thead><tr><th>Scanned</th><th>Device</th><th>Browser</th><th>OS</th><th>Location</th><th>Referrer</th></tr></thead>
                  <tbody>
                    {qrAnalytics.recentScans.map((scan, i) => (
                      <tr key={i}>
                        <td>{timeAgo(scan.created_at)}</td>
                        <td>{scan.device_type || '—'}</td>
                        <td>{scan.browser || '—'}</td>
                        <td>{scan.os || '—'}</td>
                        <td>{[scan.city, scan.country].filter(Boolean).join(', ') || '—'}</td>
                        <td>{scan.referrer || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

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
          {leadCaptureEnabled && <section className="editor-section">
            <div className="editor-title">
              <h2>Leads</h2>
              <div className="leads-header-actions">
                <ColumnsFilter visibleColumns={visibleColumns} onToggle={toggleColumn} />
                <button className="secondary-button" type="button"
                  onClick={() => downloadCsv(leads)} disabled={leads.length === 0}>
                  Export CSV
                </button>
              </div>
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
                      {LEADS_COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((c) => (
                        <th key={c.key}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        {visibleColumns.includes('visitor_name') && <td>{lead.visitor_name}</td>}
                        {visibleColumns.includes('business_name') && <td>{lead.business_name || '—'}</td>}
                        {visibleColumns.includes('email') && <td>{lead.email || '—'}</td>}
                        {visibleColumns.includes('phone') && <td>{lead.phone}</td>}
                        {visibleColumns.includes('created_at') && (
                          <td>{new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        )}
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
          </section>}
        </>
        )}
      </section>
    </main>
  )
}
