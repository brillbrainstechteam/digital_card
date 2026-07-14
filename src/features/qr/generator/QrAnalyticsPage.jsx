import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { Sidebar } from '../../../components/Sidebar'
import { fetchMyQrCodes, fetchOverallQrAnalytics, fetchQrAnalytics } from '../services/qrApi'
import { DESTINATION_TYPES } from '../utils/destinations'
import '../qr-studio.css'

function getQrLabel(qr) {
  if (qr.card_title) return qr.card_title
  const destination = DESTINATION_TYPES.find((item) => item.key === qr.settings?.destinationType)?.label || 'QR Code'
  const detail = qr.settings?.destinationFields?.url
    || qr.settings?.destinationFields?.address
    || qr.settings?.destinationFields?.number
    || qr.settings?.destinationFields?.ssid
  return detail ? `${destination} - ${detail}` : destination
}

function AnalyticsBarChart({ dailyScans }) {
  const maxDaily = useMemo(() => Math.max(1, ...(dailyScans || []).map((day) => day.count)), [dailyScans])

  return (
    <div className="qr-daily-chart qr-daily-chart--page" aria-label="Daily QR scans for the last 30 days">
      {dailyScans.map((day) => (
        <div key={day.date} className="qr-daily-column" title={`${day.date}: ${day.count} scans`}>
          <span style={{ height: `${Math.max(3, (day.count / maxDaily) * 100)}%` }} />
        </div>
      ))}
    </div>
  )
}

export function QrAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [qrs, setQrs] = useState([])
  const [selectedQrId, setSelectedQrId] = useState('')
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([fetchOverallQrAnalytics(), fetchMyQrCodes()])
      .then(([overall, qrList]) => {
        if (!active) return
        setAnalytics(overall)
        setQrs(qrList)
      })
      .catch((err) => {
        if (!active) return
        setError(err.message || 'Could not load QR analytics')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const activeQrs = qrs.filter((qr) => qr.settings?.lifecycleStatus !== 'archived').length
  const archivedQrs = qrs.filter((qr) => qr.settings?.lifecycleStatus === 'archived').length

  async function handleQrSelection(event) {
    const qrId = event.target.value
    setSelectedQrId(qrId)
    setAnalyticsLoading(true)
    setError('')
    try {
      setAnalytics(qrId ? await fetchQrAnalytics({ qrId }) : await fetchOverallQrAnalytics())
    } catch (err) {
      setError(err.message || 'Could not load QR analytics')
    } finally {
      setAnalyticsLoading(false)
    }
  }

  return (
    <main className="studio studio-workspace">
      <Sidebar mode="app" section="qr" activeApp="qranalytics" />
      <section className="editor-panel editor-panel--wide">
        <PageHeader
          badge="QR ANALYTICS"
          title="Track your QR performance"
          subtitle="See scan trends, device usage, and how your QR portfolio is performing."
        />

        {error && <p className="dashboard-error">{error}</p>}

        {loading ? (
          <div className="dashboard-summary-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="dashboard-summary-card">
                <span>Loading</span>
                <strong>-</strong>
              </div>
            ))}
          </div>
        ) : (
          <>
            <section className="editor-section qr-analytics-filter">
              <label className="field">
                <span>QR Code</span>
                <select value={selectedQrId} onChange={handleQrSelection} disabled={analyticsLoading}>
                  <option value="">All QR Codes</option>
                  {qrs.map((qr) => (
                    <option key={qr.id} value={qr.id}>{getQrLabel(qr)}</option>
                  ))}
                </select>
              </label>
              {analyticsLoading && <span className="qr-analytics-filter-status">Updating analytics...</span>}
            </section>

            <div className="dashboard-summary-grid">
              <div className="dashboard-summary-card">
                <span>Total QR Codes</span>
                <strong>{qrs.length}</strong>
              </div>
              <div className="dashboard-summary-card">
                <span>Active QRs</span>
                <strong>{activeQrs}</strong>
              </div>
              <div className="dashboard-summary-card">
                <span>Archived QRs</span>
                <strong>{archivedQrs}</strong>
              </div>
              <div className="dashboard-summary-card">
                <span>{selectedQrId ? 'Selected QR Scans' : 'Total Scans'}</span>
                <strong>{analytics?.totalScans || 0}</strong>
              </div>
            </div>

            <section className="editor-section qr-analytics-page-section">
              <div className="qr-analytics-summary">
                <div><span>Total scans</span><strong>{analytics?.totalScans || 0}</strong></div>
                <div><span>Unique scans</span><strong>{analytics?.uniqueScans || 0}</strong></div>
              </div>
            </section>

            <section className="editor-section qr-analytics-page-section">
              <h2>Daily scans</h2>
              <AnalyticsBarChart dailyScans={analytics?.dailyScans || []} />
            </section>

            <section className="editor-section qr-analytics-page-section">
              <h2>Device type</h2>
              <div className="qr-device-list qr-device-list--page">
                {analytics && Object.entries(analytics.deviceBreakdown || {}).length ? Object.entries(analytics.deviceBreakdown).map(([device, count]) => (
                  <div key={device}><span>{device}</span><strong>{count}</strong></div>
                )) : <p>No scan data yet.</p>}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  )
}
