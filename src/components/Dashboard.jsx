import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCards, deleteCard } from '../api'
import { useToast } from '../context/ToastContext'
import { SetupWizard } from './SetupWizard'

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

export function Dashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState(null)

  async function loadCards() {
    setLoading(true)
    setError('')
    try {
      setCards(await fetchCards())
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
      const existing = cards.find((c) => c.status === 'draft')
      if (existing) {
        navigate(`/studio/${existing.id}`)
        return
      }
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

  function handleShare(card) {
    const url = `${window.location.origin}/card/${card.slug}`
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link'))
  }

  function openInNewTab(card) {
    window.open(`/card/${card.slug}`, '_blank')
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

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
    <main className="dashboard">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Your Cards</h1>
        </div>
        <button className="primary-button" type="button" onClick={handleCreate} disabled={creating}>
          {creating ? 'Creating...' : '+ Create Card'}
        </button>
      </div>

      {error && <p className="dashboard-error">{error}</p>}

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
      ) : cards.length === 0 ? (
        <div className="dashboard-empty">
          <div className="empty-icon">📇</div>
          <h2>No cards yet</h2>
          <p>Create your first digital card and start sharing your brand.</p>
          <button className="primary-button" type="button" onClick={handleCreate} disabled={creating}>
            Create your first card
          </button>
        </div>
      ) : (
        <div className="card-list">
          {cards.map((card) => (
            <div key={card.id} className="card-list-item">
              <div className="card-list-info">
                <h3>{card.title}</h3>
                <div className="card-list-meta">
                  <span className={`status-badge status-${card.status}`}>{card.status}</span>
                  <span>{formatDate(card.created_at)}</span>
                </div>
              </div>
              <div className="card-list-actions">
                {card.status !== 'archived' && (
                  <button className="secondary-button" type="button" onClick={() => navigate(`/studio/${card.id}`)}>
                    Edit
                  </button>
                )}
                <div className="share-group">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => handleShare(card)}
                    disabled={card.status !== 'published'}
                    title={card.status !== 'published' ? 'Publish the card first to share' : 'Copy public link'}
                  >
                    Copy Link
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
    </main>
  )
}
