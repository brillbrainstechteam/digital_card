import { useEffect, useRef, useState, useCallback } from 'react'
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

function WelcomeBanner({ onDismiss }) {
  return (
    <div className="welcome-banner">
      <div className="welcome-banner-content">
        <div className="welcome-banner-icon">👋</div>
        <div>
          <strong>Welcome to Digital Card Studio!</strong>
          <p>Create your first digital card in 3 easy steps: upload your logo → customize your card → publish and share.</p>
        </div>
      </div>
      <button className="welcome-banner-dismiss" type="button" onClick={onDismiss} aria-label="Dismiss">✕</button>
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
        {!editing && (
          <div className="share-modal-social">
            <p className="share-social-label">Share via</p>
            <div className="share-social-btns">
              <a
                className="share-social-btn share-social-btn--whatsapp"
                href={`https://wa.me/?text=${encodeURIComponent(`Check out my digital card: ${url}`)}`}
                target="_blank" rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 21.95l4.878-1.372A9.95 9.95 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Zm4.406 13.155c-.242-.121-1.432-.707-1.654-.788-.222-.08-.383-.12-.544.121-.16.242-.623.788-.764.95-.14.16-.282.18-.524.06-.242-.12-1.02-.376-1.943-1.198-.718-.641-1.203-1.432-1.344-1.674-.14-.242-.015-.373.106-.493.108-.108.242-.282.363-.423.12-.14.16-.242.242-.403.08-.16.04-.302-.02-.423-.06-.12-.544-1.313-.746-1.797-.196-.472-.396-.408-.544-.415l-.463-.008a.888.888 0 0 0-.644.302c-.222.242-.845.826-.845 2.014s.865 2.335.985 2.496c.12.16 1.701 2.597 4.122 3.643.576.249 1.025.397 1.375.508.578.184 1.104.158 1.52.096.463-.069 1.432-.585 1.634-1.15.2-.564.2-1.047.14-1.148-.06-.1-.222-.16-.463-.282Z"/></svg>
                WhatsApp
              </a>
              <a
                className="share-social-btn share-social-btn--email"
                href={`mailto:?subject=${encodeURIComponent(`${card.title || 'My Digital Card'}`)}&body=${encodeURIComponent(`Hi! Check out my digital card: ${url}`)}`}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M4 6.8C4 5.8 4.8 5 5.8 5h12.4c1 0 1.8.8 1.8 1.8v10.4c0 1-.8 1.8-1.8 1.8H5.8c-1 0-1.8-.8-1.8-1.8V6.8Zm1.8-.1L12 11.1l6.2-4.4H5.8Zm12.4 10.6V8.8l-5.7 4a.9.9 0 0 1-1 0l-5.7-4v8.5h12.4Z"/></svg>
                Email
              </a>
              <a
                className="share-social-btn share-social-btn--linkedin"
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
                target="_blank" rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14Zm-1 15v-5.5c0-1.38-.56-2.5-2.25-2.5C14.5 10 14 10.86 14 11.5V18h-2.5v-8H14v1.1c.42-.64 1.17-1.1 2.25-1.1C18.2 10 20 11.49 20 14.14V18h-2ZM6.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM5.25 18H7.75V10H5.25V18Z"/></svg>
                LinkedIn
              </a>
            </div>
          </div>
        )}
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
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('bb_welcomed'))

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

  const baseCards = activeFilter === 'all' ? cards : cards.filter((c) => c.status === activeFilter)
  const searchedCards = searchQuery.trim()
    ? baseCards.filter((c) => c.title?.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : baseCards
  const filteredCards = [...searchedCards].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sortBy === 'alphabetical') return (a.title || '').localeCompare(b.title || '')
    return 0
  })

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

        {showWelcome && (
          <WelcomeBanner onDismiss={() => { setShowWelcome(false); localStorage.setItem('bb_welcomed', '1') }} />
        )}

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

        <div className="dashboard-search-row">
          <input
            className="dashboard-search-input"
            type="search"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search cards"
          />
          <select
            className="dashboard-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort cards"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="alphabetical">A → Z</option>
          </select>
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
                    <div className="card-list-thumb" aria-hidden="true">
                      {card.logo_url
                        ? <img src={card.logo_url} alt="" className="card-list-thumb-img" />
                        : <span className="card-list-thumb-initials">{(card.title || '?')[0].toUpperCase()}</span>
                      }
                    </div>
                    <div className="card-list-info">
                      <h3>{card.title}</h3>
                      <div className="card-list-meta">
                        {isCancelling ? (
                          <span className="status-badge status-suspended">Cancels {expiryText}</span>
                        ) : (
                          <span className={`status-badge status-${card.status}`}>{card.status}</span>
                        )}
                        <span title="Created">Created {formatDate(card.created_at)}</span>
                        {card.updated_at && card.updated_at !== card.created_at && (
                          <span className="card-list-edited">Edited {formatDate(card.updated_at)}</span>
                        )}
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
