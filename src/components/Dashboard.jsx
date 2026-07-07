import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCards, deleteCard, unarchiveCard } from '../api'
import { useToast } from '../context/ToastContext'
import { isDigitalCard } from '../cardTypeUtils'
import { SetupWizard } from './SetupWizard'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'

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

function ShareModal({ card, onClose }) {
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)
  const url = `${window.location.origin}/card/${card.slug}`

  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    inputRef.current?.select()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleCopy() {
    navigator.clipboard.writeText(url)
      .then(() => setCopied(true))
      .catch(() => {})
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Share Card</h2>
        <p>Anyone with this link can view your published card.</p>
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
        {copied && <p className="share-copied-msg">✓ Link copied to clipboard!</p>}
        <div className="share-modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Go Back</button>
          <button className="primary-button" type="button" onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  )
}

const FILTERS = ['all', 'draft', 'published', 'archived']

export function Dashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState(null)
  const [shareCard, setShareCard] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')

  async function loadCards() {
    setLoading(true)
    setError('')
    try {
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
        ? 'This action cannot be undone.'
        : 'This card will no longer be accessible through its public link.',
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

  function openInNewTab(card) {
    window.open(`/card/${card.slug}`, '_blank')
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
            {filteredCards.map((card) => (
              <div key={card.id} className="card-list-item">
                <div className="card-list-info">
                  <h3>{card.title}</h3>
                  <div className="card-list-meta">
                    <span className={`status-badge status-${card.status}`}>{card.status}</span>
                    <span>{formatDate(card.created_at)}</span>
                  </div>
                </div>
                <div className="card-list-actions">
                  {card.status === 'archived' ? (
                    <button className="secondary-button" type="button" onClick={() => handleUnarchive(card)}>
                      Unarchive
                    </button>
                  ) : (
                    <button className="secondary-button" type="button" onClick={() => navigate(`/studio/${card.id}`)}>
                      Edit
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
                  {card.status !== 'archived' && (
                    <button className="text-button card-delete-btn" type="button" onClick={() => handleDelete(card)}>
                      {card.status === 'draft' ? 'Delete' : 'Archive'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {pendingConfirm && (
          <ConfirmDialog
            title={pendingConfirm.title}
            message={pendingConfirm.message}
            actionLabel={pendingConfirm.actionLabel}
            onCancel={() => setPendingConfirm(null)}
            onConfirm={() => confirmDelete(pendingConfirm.card)}
          />
        )}

        {shareCard && (
          <ShareModal
            card={shareCard}
            onClose={() => setShareCard(null)}
          />
        )}
      </section>
    </main>
  )
}
