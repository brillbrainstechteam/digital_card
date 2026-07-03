import { useEffect, useMemo, useState } from 'react'
import { fetchCards, fetchAnalyticsSummary, fetchAnalyticsLeads } from '../api'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'

const PAGE_SIZE = 10

const SOCIAL_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  youtube: 'YouTube',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  threads: 'Threads',
  soundcloud: 'SoundCloud',
  pinterest: 'Pinterest',
  patreon: 'Patreon',
  twitch: 'Twitch',
  applemusic: 'Apple Music',
  reddit: 'Reddit',
}

function downloadCsv(rows) {
  const header = ['Name', 'Business', 'Email', 'Phone', 'Company', 'Submitted On']
  const lines = [header.join(',')]
  for (const lead of rows) {
    const submitted = new Date(lead.created_at).toLocaleString()
    const cells = [lead.full_name, lead.business_name, lead.email, lead.phone, lead.company, submitted]
      .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
    lines.push(cells.join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'leads.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function AnalyticsPage() {
  const [cards, setCards] = useState([])
  const [selectedCardId, setSelectedCardId] = useState('all')
  const [summary, setSummary] = useState(null)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchCards().then(setCards).catch(() => setCards([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchAnalyticsSummary(selectedCardId),
      fetchAnalyticsLeads(selectedCardId, ''),
    ])
      .then(([summaryData, leadsData]) => {
        setSummary(summaryData)
        setLeads(leadsData)
        setPage(1)
      })
      .catch(() => {
        setSummary(null)
        setLeads([])
      })
      .finally(() => setLoading(false))
  }, [selectedCardId])

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads
    const term = search.trim().toLowerCase()
    return leads.filter((lead) =>
      [lead.full_name, lead.business_name, lead.email, lead.company]
        .some((field) => field?.toLowerCase().includes(term))
    )
  }, [leads, search])

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE))
  const pagedLeads = filteredLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const buttons = summary?.buttons || { call: 0, email: 0, whatsapp: 0, website: 0, saveContact: 0, socials: {} }
  const socialEntries = Object.entries(buttons.socials || {})

  return (
    <main className="studio studio-workspace">
      <Sidebar mode="app" activeApp="analytics" />
      <section className="editor-panel editor-panel--wide">
        <PageHeader
          badge="ANALYTICS"
          title="Track your card performance"
          subtitle="Views, contact saves, button clicks and leads across your digital cards."
          actions={(
            <select
              className="analytics-card-filter"
              value={selectedCardId}
              onChange={(event) => setSelectedCardId(event.target.value)}
            >
              <option value="all">All Cards</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>{card.title}</option>
              ))}
            </select>
          )}
        />

        {loading || !summary ? (
          <p className="settings-placeholder">Loading analytics...</p>
        ) : (
        <>
          <div className="analytics-overview-grid">
            <div className="analytics-overview-card">
              <span>Total Views</span>
              <strong>{summary.totals.views}</strong>
            </div>
            <div className="analytics-overview-card">
              <span>Total Contact Saves</span>
              <strong>{summary.totals.contactSaves}</strong>
            </div>
            <div className="analytics-overview-card">
              <span>Total Button Clicks</span>
              <strong>{summary.totals.buttonClicks}</strong>
            </div>
            <div className="analytics-overview-card">
              <span>Conversion Rate</span>
              <strong>{summary.totals.conversionRate}%</strong>
            </div>
            <div className="analytics-overview-card analytics-overview-card--future">
              <span>QR Scans</span>
              <strong>{summary.totals.qrScans}</strong>
              <small>Coming soon</small>
            </div>
          </div>

          <section className="editor-section">
            <h2>Traffic</h2>
            <div className="analytics-traffic-grid">
              <div><span>Card Views</span><strong>{summary.traffic.views}</strong></div>
              <div><span>Contact Saves</span><strong>{summary.traffic.contactSaves}</strong></div>
              <div><span>CTR</span><strong>{summary.traffic.ctr}%</strong></div>
              <div>
                <span>Last Viewed</span>
                <strong>{summary.traffic.lastViewed ? new Date(summary.traffic.lastViewed).toLocaleString() : '—'}</strong>
              </div>
            </div>
          </section>

          <section className="editor-section">
            <h2>Button Analytics</h2>
            <div className="analytics-button-grid">
              <div><span>Call</span><strong>{buttons.call}</strong></div>
              <div><span>Email</span><strong>{buttons.email}</strong></div>
              <div><span>WhatsApp</span><strong>{buttons.whatsapp}</strong></div>
              <div><span>Website</span><strong>{buttons.website}</strong></div>
              <div><span>Save Contact</span><strong>{buttons.saveContact}</strong></div>
              {socialEntries.map(([platform, count]) => (
                <div key={platform}><span>{SOCIAL_LABELS[platform] || platform}</span><strong>{count}</strong></div>
              ))}
            </div>
          </section>

          <section className="editor-section">
            <div className="editor-title">
              <h2>Recent Leads</h2>
              <button
                className="secondary-button"
                type="button"
                onClick={() => downloadCsv(filteredLeads)}
                disabled={filteredLeads.length === 0}
              >
                Export CSV
              </button>
            </div>
            <input
              className="analytics-lead-search"
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            {filteredLeads.length === 0 ? (
              <p className="settings-placeholder">No leads yet.</p>
            ) : (
              <>
                <table className="analytics-leads-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Business</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Company</th>
                      <th>Submitted On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedLeads.map((lead) => (
                      <tr key={lead.id}>
                        <td>{lead.full_name}</td>
                        <td>{lead.business_name || '-'}</td>
                        <td>{lead.email || '-'}</td>
                        <td>{lead.phone}</td>
                        <td>{lead.company || '-'}</td>
                        <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="analytics-pagination">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <span>Page {page} of {totalPages}</span>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
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
