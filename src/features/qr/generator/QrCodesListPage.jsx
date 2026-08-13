import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../../components/PageHeader'
import { Sidebar } from '../../../components/Sidebar'
import { useToast } from '../../../context/ToastContext'
import { QRCode } from '../components/QRCode'
import { QrManagementPanel } from '../components/QrManagementPanel'
import { deleteQr, fetchMyQrCodes, updateQrLifecycle, updateQrSlug, withDynamicQrData } from '../services/qrApi'
import { createDefaultQrSettings, downloadQrCode } from '../services/qrEngine'
import { getDynamicQrUrl } from '../utils/publicQrUrl'
import '../qr-studio.css'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ConfirmDialog({ title, message, actionLabel, onCancel, onConfirm, busy = false, destructive = false }) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={destructive ? 'primary-button danger-button' : 'primary-button'} type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Please wait...' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function QrCodesListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusedQrId = searchParams.get('qrId')
  const toast = useToast()
  const [qrs, setQrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)
  const [downloadMenuId, setDownloadMenuId] = useState(null)
  const [openPanel, setOpenPanel] = useState(null)
  const [pendingConfirm, setPendingConfirm] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [editingSlugId, setEditingSlugId] = useState(null)
  const [slugDraft, setSlugDraft] = useState('')
  const [slugSaving, setSlugSaving] = useState(false)
  const [slugError, setSlugError] = useState('')

  useEffect(() => {
    fetchMyQrCodes()
      .then(setQrs)
      .catch((err) => toast.error(err.message || 'Could not load your QR codes'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (loading || !focusedQrId) return
    document.getElementById(`qr-${focusedQrId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusedQrId, loading])

  useEffect(() => {
    function closeDownloadMenu(event) {
      if (event.key === 'Escape' || (event.type === 'click' && !event.target.closest('.qr-download-menu'))) {
        setDownloadMenuId(null)
      }
    }
    document.addEventListener('click', closeDownloadMenu)
    document.addEventListener('keydown', closeDownloadMenu)
    return () => {
      document.removeEventListener('click', closeDownloadMenu)
      document.removeEventListener('keydown', closeDownloadMenu)
    }
  }, [])

  async function handleDownload(qr, extension) {
    setDownloadMenuId(null)
    setDownloadingId(qr.id)
    try {
      await downloadQrCode(withDynamicQrData(qr) || createDefaultQrSettings(), {
        extension,
        fileName: qr.card_title || 'qr-code',
        lockable: true,
      })
    } catch (err) {
      toast.error(err.message || 'Could not download this QR code')
    } finally {
      setDownloadingId(null)
    }
  }

  function startEditSlug(qr) {
    setEditingSlugId(qr.id)
    setSlugDraft(qr.slug || '')
    setSlugError('')
  }

  async function handleSaveSlug(qr) {
    const nextSlug = slugDraft.trim().toLowerCase()
    if (nextSlug === qr.slug) { setEditingSlugId(null); return }
    setSlugSaving(true)
    setSlugError('')
    try {
      const updated = await updateQrSlug(qr.id, nextSlug)
      setQrs((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
      setEditingSlugId(null)
      toast.success('QR link updated')
    } catch (err) {
      setSlugError(err.message || 'Could not update link')
    } finally {
      setSlugSaving(false)
    }
  }

  async function handleLifecycleChange() {
    if (!pendingConfirm) return
    setActionBusy(true)
    try {
      if (pendingConfirm.kind === 'delete') {
        await deleteQr(pendingConfirm.qr.id)
        setQrs((current) => current.filter((item) => item.id !== pendingConfirm.qr.id))
        if (openPanel === pendingConfirm.qr.id) setOpenPanel(null)
        toast.success('QR code deleted.')
      } else if (pendingConfirm.kind === 'cancel') {
        const updated = await updateQrLifecycle(pendingConfirm.qr.id, 'archived')
        setQrs((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
        toast.success('Subscription cancelled — QR code is now inactive.')
      } else {
        const nextStatus = pendingConfirm.qr.settings?.lifecycleStatus === 'archived' ? 'active' : 'archived'
        const updated = await updateQrLifecycle(pendingConfirm.qr.id, nextStatus)
        setQrs((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
        toast.success(nextStatus === 'archived' ? 'QR code deactivated.' : 'QR code reactivated.')
      }
    } catch (err) {
      toast.error(err.message || 'Could not update this QR code')
    } finally {
      setActionBusy(false)
      setPendingConfirm(null)
    }
  }

  return (
    <main className="studio studio-workspace">
      {pendingConfirm && (
        <ConfirmDialog
          title={
            pendingConfirm.kind === 'delete' ? 'Delete QR Code?' :
            pendingConfirm.kind === 'cancel' ? 'Cancel Subscription?' :
            pendingConfirm.qr.settings?.lifecycleStatus === 'archived' ? 'Re-subscribe QR Code?' : 'Deactivate QR Code?'
          }
          message={
            pendingConfirm.kind === 'delete'
              ? 'This QR code and its saved settings will be permanently removed.'
              : pendingConfirm.kind === 'cancel'
                ? 'This QR code will stop working immediately. No future payments will be charged. You can re-subscribe anytime to reactivate it.'
                : pendingConfirm.qr.settings?.lifecycleStatus === 'archived'
                  ? 'This QR code will become active again and its dynamic link will start working immediately.'
                  : 'This QR code will stop working for public scans immediately. You can reactivate it anytime.'
          }
          actionLabel={
            pendingConfirm.kind === 'delete' ? 'Delete' :
            pendingConfirm.kind === 'cancel' ? 'Cancel Subscription' :
            pendingConfirm.qr.settings?.lifecycleStatus === 'archived' ? 'Re-subscribe' : 'Deactivate'
          }
          destructive={pendingConfirm.kind === 'delete'}
          busy={actionBusy}
          onCancel={() => !actionBusy && setPendingConfirm(null)}
          onConfirm={handleLifecycleChange}
        />
      )}

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
            <div className="empty-icon">QR</div>
            <h2>No QR codes yet</h2>
            <p>Add a QR code from any digital card's studio and it will show up here.</p>
            <button className="primary-button" type="button" onClick={() => navigate('/dashboard')}>
              Go to your cards
            </button>
          </div>
        ) : (
          <div className="card-list qr-codes-list">
            {qrs.map((qr) => {
              const unlocked = Boolean(qr.settings?.purchased) && (!qr.card_id || qr.card_status === 'published')
              const archived = qr.settings?.lifecycleStatus === 'archived'
              return (
                <div
                  id={`qr-${qr.id}`}
                  key={qr.id}
                  className={`card-list-item qr-codes-list-item${String(qr.id) === focusedQrId ? ' qr-codes-list-item--focused' : ''}`}
                >
                  <div className="qr-codes-list-thumb">
                    <QRCode settings={withDynamicQrData(qr) || createDefaultQrSettings()} size={64} lockable />
                  </div>
                  <div className="card-list-info">
                    <h3>{qr.card_title || 'Untitled card'}</h3>
                    <div className="card-list-meta">
                      {unlocked && !archived && <span className="status-badge status-published">Published</span>}
                      {qr.card_status && qr.card_status !== 'published' && <span className={`status-badge status-${qr.card_status}`}>{qr.card_status}</span>}
                      {archived && <span className="status-badge status-archived">archived</span>}
                      <span>Updated {formatDate(qr.updated_at)}</span>
                      {!unlocked && !archived && <span className="status-badge status-draft">Payment pending</span>}
                    </div>
                    {editingSlugId === qr.id ? (
                      <div className="qr-slug-editor">
                        <span className="share-link-prefix">{window.location.origin}/q/</span>
                        <input
                          type="text"
                          value={slugDraft}
                          onChange={(e) => setSlugDraft(e.target.value.toLowerCase())}
                          className="share-link-input"
                          placeholder="your-name"
                          autoFocus
                        />
                        <button className="secondary-button" type="button" onClick={() => setEditingSlugId(null)} disabled={slugSaving}>Cancel</button>
                        <button className="primary-button" type="button" onClick={() => handleSaveSlug(qr)} disabled={slugSaving}>
                          {slugSaving ? 'Saving...' : 'Save'}
                        </button>
                        {slugError && <p className="share-error-msg">{slugError}</p>}
                      </div>
                    ) : (
                      <div className="qr-slug-display">
                        <span className="qr-slug-link">{getDynamicQrUrl(qr.slug)}</span>
                        <button
                          className="link-button"
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(getDynamicQrUrl(qr.slug))
                              .then(() => toast.success('Link copied'))
                              .catch(() => toast.error('Could not copy link'))
                          }}
                        >
                          Copy
                        </button>
                        <button className="link-button" type="button" onClick={() => startEditSlug(qr)}>Edit Link</button>
                      </div>
                    )}
                  </div>
                  <div className="card-list-actions">
                    <button className="secondary-button" type="button" onClick={() => setOpenPanel((current) => current === qr.id ? null : qr.id)}>
                      Edit QR
                    </button>
                    {archived ? (
                      <button className="primary-button" type="button" onClick={() => setPendingConfirm({ kind: 'archive', qr })}>
                        Re-subscribe
                      </button>
                    ) : (
                      <button className="secondary-button" type="button" onClick={() => setPendingConfirm({ kind: 'cancel', qr })}>
                        Cancel Subscription
                      </button>
                    )}
                    <button className="secondary-button" type="button" onClick={() => setPendingConfirm({ kind: 'delete', qr })}>
                      Delete
                    </button>
                    <div className="qr-download-menu">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setDownloadMenuId((current) => current === qr.id ? null : qr.id)
                        }}
                        disabled={!unlocked || archived || downloadingId === qr.id}
                        title={archived ? 'Restore this QR to enable downloads again' : unlocked ? undefined : 'Purchase the QR add-on to unlock downloads'}
                      >
                        {downloadingId === qr.id ? 'Preparing...' : 'Download'}
                      </button>
                      {downloadMenuId === qr.id && (
                        <div className="qr-download-options" role="menu">
                          {['png', 'svg', 'pdf'].map((extension) => (
                            <button key={extension} type="button" role="menuitem" onClick={() => handleDownload(qr, extension)}>
                              {extension.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {qr.card_id && (
                      <button className="secondary-button" type="button" onClick={() => navigate(`/studio/${qr.card_id}?from=qr-studio`)}>
                        View Card
                      </button>
                    )}
                  </div>
                  {openPanel === qr.id && (
                    <QrManagementPanel
                      qr={qr}
                      toast={toast}
                      onClose={() => setOpenPanel(null)}
                      onUpdated={(updated) => setQrs((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
