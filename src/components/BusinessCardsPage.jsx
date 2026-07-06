import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCards, createCard, deleteCard } from '../api'
import { useToast } from '../context/ToastContext'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'
import { renderSavedCardThumbnail } from '../businessCard/canvasHelpers'
import '../businessCard/businessCard.css'

function BusinessCardThumb({ businessCard }) {
  const [liveThumb, setLiveThumb] = useState(null)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLiveThumb(null)
    setTried(false)
    renderSavedCardThumbnail(businessCard)
      .then((url) => { if (!cancelled) setLiveThumb(url) })
      .finally(() => { if (!cancelled) setTried(true) })
    return () => { cancelled = true }
  }, [businessCard])

  // Prefer a freshly re-rendered thumbnail (always matches current saved
  // content); fall back to the cached snapshot only if re-render fails or
  // there's no frontJson (older saves), and finally to a placeholder icon.
  const src = liveThumb || (tried ? businessCard.frontImg : null)

  if (src) return <img src={src} alt="Business card preview" />
  return <span style={{ fontSize: 28 }}>🪪</span>
}

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

export function BusinessCardsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState(null)

  async function loadCards() {
    setLoading(true)
    setError('')
    try {
      const all = await fetchCards()
      setCards(all.filter((c) => c.card_data?.businessCard))
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
      const card = await createCard('Business Card')
      navigate(`/business-card/${card.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function confirmDelete(card) {
    try {
      await deleteCard(card.id)
      toast.success('Business card deleted')
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
      title: 'Delete Business Card?',
      message: 'This action cannot be undone.',
      actionLabel: 'Delete',
    })
  }

  return (
    <main className="studio studio-workspace">
      <Sidebar mode="app" activeApp="business" />
      <section className="editor-panel editor-panel--wide">
        <PageHeader
          badge="YOUR BUSINESS CARDS"
          title="Manage your business cards"
          subtitle="Design print-ready business cards from your details — pick a template or start blank."
          actions={(
            <button className="primary-button" type="button" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : '+ Create New Card'}
            </button>
          )}
        />

        {error && <p className="dashboard-error">{error}</p>}

        {loading ? (
          <div className="bc-dash-grid">
            {[1, 2].map((i) => (
              <div key={i} className="bc-dash-card">
                <div className="bc-dash-card-thumb shimmer" />
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="dashboard-empty">
            <div className="empty-icon">🪪</div>
            <h2>No business cards yet</h2>
            <p>Create your first business card — enter your details once and pick a template.</p>
            <button className="primary-button" type="button" onClick={handleCreate} disabled={creating}>
              Create your first business card
            </button>
          </div>
        ) : (
          <div className="bc-dash-grid">
            {cards.map((card) => (
              <div key={card.id} className="bc-dash-card" onClick={() => navigate(`/business-card/${card.id}`)}>
                <div className="bc-dash-card-thumb">
                  <BusinessCardThumb businessCard={card.card_data.businessCard} />
                </div>
                <div className="bc-dash-card-body">
                  <h4>{card.title}</h4>
                  <p>Saved · Click to edit</p>
                  <div className="bc-dash-card-actions">
                    <button
                      type="button"
                      className="text-button card-delete-btn"
                      onClick={(e) => { e.stopPropagation(); handleDelete(card) }}
                    >
                      Delete
                    </button>
                  </div>
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
      </section>
    </main>
  )
}
