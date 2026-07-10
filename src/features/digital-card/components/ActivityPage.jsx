import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchCards, fetchAnalyticsActivity } from '../services/api'
import { PageHeader } from '../../../components/PageHeader'
import { Sidebar } from '../../../components/Sidebar'
import { formatEventLabel, timeAgo } from './AnalyticsPage'

const PAGE_SIZE = 20
const POLL_INTERVAL = 15000

const DATE_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
]

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'All Activity' },
  { value: 'views', label: 'Views' },
  { value: 'qr_scans', label: 'QR Scans' },
  { value: 'clicks', label: 'Button Clicks' },
  { value: 'leads', label: 'Leads' },
]

export function ActivityPage() {
  const [cards, setCards] = useState([])
  const [selectedCardId, setSelectedCardId] = useState('all')
  const [events, setEvents] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [eventType, setEventType] = useState('')
  const pollRef = useRef(null)

  useEffect(() => { fetchCards().then(setCards).catch(() => {}) }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const loadActivity = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetchAnalyticsActivity(selectedCardId, {
        search, page, limit: PAGE_SIZE, dateRange, dateFrom, dateTo, eventType,
      })
      setEvents(res.events || [])
      setTotal(res.total || 0)
    } catch {
      if (!silent) { setEvents([]); setTotal(0) }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [selectedCardId, search, page, dateRange, dateFrom, dateTo, eventType])

  useEffect(() => { loadActivity(false) }, [loadActivity])

  useEffect(() => {
    pollRef.current = setInterval(() => loadActivity(true), POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [loadActivity])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main className="studio studio-workspace">
      <Sidebar mode="app" activeApp="activity" />
      <section className="editor-panel editor-panel--wide">
        <PageHeader
          badge="ACTIVITY"
          title="Activity History"
          subtitle="Every interaction with your digital cards, in real time."
          actions={(
            <select className="analytics-card-filter" value={selectedCardId}
              onChange={(e) => { setSelectedCardId(e.target.value); setPage(1) }}>
              <option value="all">All Cards</option>
              {cards.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}
        />

        {/* Filters */}
        <div className="leads-filters">
          <input
            className="analytics-lead-search"
            type="text"
            placeholder="Search activity..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select className="leads-filter-select" value={eventType}
            onChange={(e) => { setEventType(e.target.value); setPage(1) }}>
            {EVENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
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
        </div>

        {loading ? (
          <p className="settings-placeholder">Loading activity...</p>
        ) : events.length === 0 ? (
          <p className="settings-placeholder">No activity found.</p>
        ) : (
          <>
            <div className="analytics-table-meta">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} events
            </div>
            <table className="analytics-leads-table activity-table">
              <thead>
                <tr>
                  <th style={{ width: '44px' }}></th>
                  <th>Activity</th>
                  <th>Description</th>
                  <th>Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, i) => {
                  const { icon, text } = formatEventLabel(event)
                  return (
                    <tr key={i}>
                      <td className="activity-icon-cell">{icon}</td>
                      <td className="activity-type-cell">
                        {event.event_type === 'view' && 'Card View'}
                        {event.event_type === 'button_click' && 'Button Click'}
                        {event.event_type === 'lead_created' && 'Lead Captured'}
                        {!['view', 'button_click', 'lead_created'].includes(event.event_type) && event.event_type}
                      </td>
                      <td>{text}</td>
                      <td className="activity-time-cell">
                        <span>{new Date(event.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="analytics-activity-time">{timeAgo(event.created_at)}</span>
                      </td>
                    </tr>
                  )
                })}
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
    </main>
  )
}