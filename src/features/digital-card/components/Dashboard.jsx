import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCards, createCard, updateCard, deleteCard, unarchiveCard, cancelCardSubscription, resubscribeCard } from '../services/api'
import { useToast } from '../../../context/ToastContext'
import { isDigitalCard } from '../../../cardTypeUtils'

import { SetupWizard } from './SetupWizard'
import { PageHeader } from '../../../components/PageHeader'
import { Sidebar } from '../../../components/Sidebar'
import { clearDraft, loadDraft } from '../utils/draft'

function ConfirmDialog({ title, message, actionLabel, onCancel, onConfirm }) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary-button danger-button" type="button" onClick={onConfirm}>{actionLabel}</button>
        </div>
      </div>
    </div>
  )
}

function ShareModal({ card, onClose, onSlugUpdated }) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [slugInput, setSlugInput] = useState(card.slug)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const toast = useToast()
  const url = `${window.location.origin}/${card.slug}`

  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    if (!editing) inputRef.current?.select()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, editing])

  function handleCopy() {
    navigator.clipboard.writeText(url)
      .then(() => setCopied(true))
      .catch(() => {})
  }

  async function handleSaveSlug() {
    const nextSlug = slugInput.trim().toLowerCase()
    if (nextSlug === card.slug) { setEditing(false); return }
    setSaving(true)
    setError('')
    try {
      const updated = await updateCard(card.id, { slug: nextSlug })
      onSlugUpdated(updated)
      setEditing(false)
      toast.success('Link updated')
    } catch (err) {
      setError(err.message || 'Could not update link')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Share Card</h2>
        <p>Anyone with this link can view your published card.</p>
        {editing ? (
          <div className="share-modal-link">
            <span className="share-link-prefix">{window.location.origin}/</span>
            <input
              type="text"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value.toLowerCase())}
              className="share-link-input"
              placeholder="your-name"
              autoFocus
            />
          </div>
        ) : (
          <div className="share-modal-link">
            <input
              ref={inputRef}
              type="text"
              readOnly
              value={url}
              className="share-link-input"
              onFocus={(e) => e.target.select()}
            />
          </div>
        )}
        {error && <p className="share-error-msg">{error}</p>}
        {copied && !editing && <p className="share-copied-msg">✓ Link copied to clipboard!</p>}
        <div className="share-modal-actions">
          {editing ? (
            <>
              <button className="secondary-button" type="button" onClick={() => { setEditing(false); setSlugInput(card.slug); setError('') }} disabled={saving}>Cancel</button>
              <button className="primary-button" type="button" onClick={handleSaveSlug} disabled={saving}>
                {saving ? 'Saving...' : 'Save Link'}
              </button>
            </>
          ) : (
            <>
              <button className="secondary-button" type="button" onClick={() => setEditing(true)}>Edit Link</button>
              <button className="primary-button" type="button" onClick={handleCopy}>
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const FILTERS = ['all', 'draft', 'published', 'suspended', 'archived']

export function Dashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const guestDraftImportedRef = useRef(false)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState(null)
  const [shareCard, setShareCard] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')

  async function importGuestDraftIfNeeded() {
    if (guestDraftImportedRef.current) return false
    guestDraftImportedRef.current = true

    const draft = loadDraft()
    if (!draft) return false

    const title = draft.personName || draft.companyName || draft.brandName || 'My Card'
    const created = await createCard(title)
    await updateCard(created.id, {
      title,
      logo_url: draft.logo,
      card_data: draft,
      status: 'draft',
    })
    clearDraft()
    toast.success('Your saved card draft has been restored.')
    return true
  }

  async function loadCards() {
    setLoading(true)
    setError('')
    try {
      await importGuestDraftIfNeeded()
      setCards((await fetchCards()).filter(isDigitalCard))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCards() }, [])

  async function handleCreate() {
    setCreating(true)
    setError('')
    try {
      setShowWizard(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function confirmDelete(card) {
    const action = card.status === 'draft' ? 'Delete' : 'Archive'
    try {
      await deleteCard(card.id)
      toast.success(`Card ${action.toLowerCase()}d`)
      await loadCards()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPendingConfirm(null)
    }
  }

  function handleDelete(card) {
    setPendingConfirm({
      card,
      title: card.status === 'draft' ? 'Delete Draft Card?' : 'Archive Card?',
      message: card.status === 'draft'
        ? 'This action cannot be undone. The card and all of its analytics will be permanently removed.'
        : 'This card will no longer be accessible through its public link and will be removed from total and individual analytics while archived.',
      actionLabel: card.status === 'draft' ? 'Delete' : 'Archive',
    })
  }

  async function handleUnarchive(card) {
    try {
      await unarchiveCard(card.id)
      toast.success('Card restored to draft')
      await loadCards()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleCancelSubscription(card) {
    try {
      await cancelCardSubscription(card.id)
      toast.success('Subscription cancelled — card stays live until expiry date')
      await loadCards()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPendingConfirm(null)
    }
  }

  function confirmCancelSubscription(card) {
    const expiryDate = card.subscription_expires_at
      ? new Date(card.subscription_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '30 days from now'
    setPendingConfirm({
      card,
      title: 'Cancel Subscription?',
      message: `Your card will keep working until ${expiryDate}. After that it will stop automatically. No future payments will be charged. You can re-subscribe anytime.`,
      actionLabel: 'Cancel Subscription',
      onConfirm: () => handleCancelSubscription(card),
    })
  }

  async function handleResubscribe(card) {
    try {
      await resubscribeCard(card.id)
      toast.success('Re-subscribed — card is live again for 30 days!')
      await loadCards()
    } catch (err) {
      toast.error(err.message)
    }
  }

  function openInNewTab(card) {
    window.open(`/${card.slug}`, '_blank')
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  const counts = {
    all: cards.length,
    draft: cards.filter((c) => c.status === 'draft').length,
    published: cards.filter((c) => c.status === 'published').length,
    suspended: cards.filter((c) => c.status === 'suspended').length,
    archived: cards.filter((c) => c.status === 'archived').length,
  }

  const filteredCards = activeFilter === 'all'
    ? cards
    : cards.filter((c) => c.status === activeFilter)

  if (showWizard) {
    return (
      <SetupWizard
        toast={toast}
        onCancel={() => setShowWizard(false)}
        onComplete={(cardId) => {
          toast.success('Card created!')
          navigate(`/studio/${cardId}`)
        }}
      />
    )
  }

  return (
    <main className="studio studio-workspace">
      <Sidebar mode="app" activeApp="cards" />
      <section className="editor-panel editor-panel--wide">
        <PageHeader
          badge="YOUR CARDS"
          title="Manage your digital cards"
          subtitle="Create, edit, publish and organize all your digital cards from one place."
          actions={(
            <button className="primary-button" type="button" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : '+ Create Card'}
            </button>
          )}
        />

        {error && <p className="dashboard-error">{error}</p>}

        <div className="dashboard-summary-grid">
          {[
            ['Total Cards', counts.all],
            ['Published', counts.published],
            ['Draft', counts.draft],
            ['Suspended', counts.suspended],
            ['Archived', counts.archived],
          ].map(([label, value]) => (
            <div className="dashboard-summary-card" key={label}>
              <span>{label}</span>
              <strong>{loading ? '-' : value}</strong>
            </div>
          ))}
        </div>

        <div className="dashboard-filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`dashboard-filter-chip${activeFilter === f ? ' dashboard-filter-chip--active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="chip-count">{loading ? '–' : counts[f]}</span>
            </button>
          ))}
        </div>

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
                  <div className="skeleton-btn shimmer" style={{ width: '60px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCards.length === 0 && cards.length === 0 ? (
          <div className="dashboard-empty">
            <div className="empty-icon">📇</div>
            <h2>No cards yet</h2>
            <p>Create your first digital card and start sharing your brand.</p>
            <button className="primary-button" type="button" onClick={handleCreate} disabled={creating}>
              Create your first card
            </button>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="dashboard-empty">
            <div className="empty-icon">🔍</div>
            <h2>No {activeFilter} cards</h2>
            <p>You don't have any {activeFilter} cards yet.</p>
          </div>
        ) : (
          <div className="card-list">
            {filteredCards.map((card) => {
              const isCancelling = card.status === 'published' && card.subscription_cancelled
              const isSuspended = card.status === 'suspended'
              const expiryText = card.subscription_expires_at
                ? new Date(card.subscription_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : null
              return (
                  <div key={card.id} className="card-list-item">
                    <div className="card-list-info">
                      <h3>{card.title}</h3>
                      <div className="card-list-meta">
                        {isCancelling ? (
                          <span className="status-badge status-suspended">Cancels {expiryText}</span>
                        ) : (
                          <span className={`status-badge status-${card.status}`}>{card.status}</span>
                        )}
                        <span>{formatDate(card.created_at)}</span>
                        {isCancelling && expiryText && (
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Active until {expiryText}</span>
                        )}
                      </div>
                    </div>
                    <div className="card-list-actions">
                      {card.status === 'archived' ? (
                        <button className="secondary-button" type="button" onClick={() => handleUnarchive(card)}>
                          Restore
                        </button>
                      ) : (isCancelling || isSuspended) ? (
                        <button className="primary-button" type="button" onClick={() => handleResubscribe(card)}>
                          Re-subscribe
                        </button>
                      ) : (
                        <button className="secondary-button" type="button" onClick={() => navigate(`/studio/${card.id}`)}>
                          Edit
                        </button>
                      )}
                      {card.status === 'published' && !isCancelling && (
                        <button className="secondary-button" type="button" onClick={() => confirmCancelSubscription(card)}>
                          Cancel Subscription
                        </button>
                      )}
                      <div className="share-group">
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => setShareCard(card)}
                          disabled={card.status !== 'published'}
                          title={card.status !== 'published' ? 'Publish the card first to share' : 'Share public link'}
                        >
                          Share
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => openInNewTab(card)}
                          disabled={card.status !== 'published'}
                          title={card.status !== 'published' ? 'Publish the card first' : 'Open public card'}
                        >
                          Open ↗
                        </button>
                      </div>
                      {card.status !== 'archived' && card.status !== 'suspended' && !isCancelling && (
                        <button className="text-button card-delete-btn" type="button" onClick={() => handleDelete(card)}>
                          {card.status === 'draft' ? 'Delete' : 'Archive'}
                        </button>
                      )}
                    </div>
                  </div>
                )
            })}
          </div>
        )}

        {pendingConfirm && (
          <ConfirmDialog
            title={pendingConfirm.title}
            message={pendingConfirm.message}
            actionLabel={pendingConfirm.actionLabel}
            onCancel={() => setPendingConfirm(null)}
            onConfirm={pendingConfirm.onConfirm ?? (() => confirmDelete(pendingConfirm.card))}
          />
        )}

        {shareCard && (
          <ShareModal
            card={shareCard}
            onClose={() => setShareCard(null)}
            onSlugUpdated={(updated) => {
              setShareCard(updated)
              setCards((cur) => cur.map((c) => (c.id === updated.id ? updated : c)))
            }}
          />
        )}
      </section>
    </main>
  )
}
