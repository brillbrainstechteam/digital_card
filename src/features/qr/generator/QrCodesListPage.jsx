import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../../components/PageHeader'
import { Sidebar } from '../../../components/Sidebar'
import { useToast } from '../../../context/ToastContext'
import { QRCode } from '../components/QRCode'
import { QrDevModeBadge } from '../components/QrLockStatus'
import { fetchMyQrCodes } from '../services/qrApi'
import { createDefaultQrSettings, downloadQrCode } from '../services/qrEngine'
import { useQrDevModeEnabled } from '../services/qrAccess'
import '../qr-studio.css'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Every QR code the user has saved lives here, one per digital card (a card
// can have at most one QR). Reuses the Dashboard's card-list visual
// language so it reads as the same product, just scoped to QR codes.
export function QrCodesListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [qrs, setQrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)
  // Read once here (not per row inside the .map below — hooks can't be
  // called in a loop) so every row's lock state updates together the
  // instant the Developer Mode badge's toggle flips.
  const devModeEnabled = useQrDevModeEnabled()

  useEffect(() => {
    fetchMyQrCodes()
      .then(setQrs)
      .catch((err) => toast.error(err.message || 'Could not load your QR codes'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDownload(qr, extension) {
    setDownloadingId(qr.id)
    try {
      await downloadQrCode(qr.settings || createDefaultQrSettings(), { extension, fileName: qr.card_title || 'qr-code', lockable: true })
    } catch (err) {
      toast.error(err.message || 'Could not download this QR code')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <main className="studio studio-workspace">
      <Sidebar mode="app" section="qr" activeApp="qrcodes" />
      <section className="editor-panel editor-panel--wide">
        <PageHeader
          badge="MY QR CODES"
          title="Manage your QR codes"
          subtitle="Every branded QR code you've saved, across all of your digital cards."
          actions={(
            <button className="primary-button" type="button" onClick={() => navigate('/qr-studio')}>
              + New QR Code
            </button>
          )}
        />

        <QrDevModeBadge />

        {loading ? (
          <div className="card-list">
            {[1, 2].map((i) => (
              <div key={i} className="card-list-item skeleton-row">
                <div className="card-list-info">
                  <div className="skeleton-line skeleton-line--title shimmer" style={{ width: '160px', height: '18px' }} />
                  <div className="skeleton-line shimmer" style={{ width: '120px', height: '14px', marginTop: '8px' }} />
                </div>
                <div className="card-list-actions">
                  <div className="skeleton-btn shimmer" style={{ width: '60px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : qrs.length === 0 ? (
          <div className="dashboard-empty">
            <div className="empty-icon">🔗</div>
            <h2>No QR codes yet</h2>
            <p>Add a QR code from any digital card's studio and it'll show up here.</p>
            <button className="primary-button" type="button" onClick={() => navigate('/dashboard')}>
              Go to your cards
            </button>
          </div>
        ) : (
          <div className="card-list qr-codes-list">
            {qrs.map((qr) => {
              const unlocked = devModeEnabled || Boolean(qr.settings?.purchased)
              return (
                <div key={qr.id} className="card-list-item qr-codes-list-item">
                  <div className="qr-codes-list-thumb">
                    <QRCode settings={qr.settings || createDefaultQrSettings()} size={64} lockable />
                  </div>
                  <div className="card-list-info">
                    <h3>{qr.card_title || 'Untitled card'}</h3>
                    <div className="card-list-meta">
                      {qr.card_status && <span className={`status-badge status-${qr.card_status}`}>{qr.card_status}</span>}
                      <span>Updated {formatDate(qr.updated_at)}</span>
                      {!unlocked && <span className="status-badge status-draft">Locked · preview only</span>}
                    </div>
                  </div>
                  <div className="card-list-actions">
                    {['png', 'svg', 'pdf'].map((extension) => (
                      <button
                        key={extension}
                        className="secondary-button"
                        type="button"
                        onClick={() => handleDownload(qr, extension)}
                        disabled={!unlocked || downloadingId === qr.id}
                        title={unlocked ? undefined : 'Purchase the QR add-on to unlock downloads'}
                      >
                        {downloadingId === qr.id ? 'Preparing...' : `Download ${extension.toUpperCase()}`}
                      </button>
                    ))}
                    {qr.card_id && (
                      <button className="secondary-button" type="button" onClick={() => navigate(`/studio/${qr.card_id}?from=qr-studio`)}>
                        View Card
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
