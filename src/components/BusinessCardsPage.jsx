import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { fetchCards, createCard, updateCard, deleteCard } from '../api'
import { useToast } from '../context/ToastContext'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'
import { renderSavedCardThumbnail } from '../businessCard/canvasHelpers'
import { CardPreviewScreen } from '../businessCard/CardPreviewScreen'
import { getTemplate } from '../businessCard/bcTemplates'
import '../businessCard/businessCard.css'

// Cards are created with a generic placeholder title ("Business Card").
// Until the user renames one, show the template's own name instead so the
// list is actually distinguishable at a glance.
const DEFAULT_TITLE = 'Business Card'

function templateLabel(businessCard) {
  if (businessCard?.templateId === 'blank') return 'Blank Canvas'
  return getTemplate(businessCard?.templateId)?.label || DEFAULT_TITLE
}

function displayTitle(card) {
  return card.title && card.title !== DEFAULT_TITLE
    ? card.title
    : templateLabel(card.card_data.businessCard)
}

function CardTitle({ card, onRenamed }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  const displayName = displayTitle(card)

  function startEditing() {
    setValue(displayName)
    setEditing(true)
  }

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  async function commit() {
    const trimmed = value.trim()
    setEditing(false)
    if (!trimmed || trimmed === card.title) return
    setSaving(true)
    try {
      await updateCard(card.id, { title: trimmed })
      onRenamed(card.id, trimmed)
    } catch (_) {
      // silently keep the old title on failure — no need to disrupt the list
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="bc-dash-card-title-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <button type="button" className="bc-dash-card-title" onClick={startEditing} disabled={saving} title="Click to rename">
      <h4>{displayName}</h4>
      <Pencil size={12} />
    </button>
  )
}

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
  const [previewCard, setPreviewCard] = useState(null)

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

  function handleRenamed(cardId, newTitle) {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, title: newTitle } : c)))
  }

  if (previewCard) {
    return (
      <CardPreviewScreen
        card={previewCard}
        onClose={() => setPreviewCard(null)}
        onEdit={() => navigate(`/business-card/${previewCard.id}`)}
      />
    )
  }

  return (
    <main className="studio studio-workspace">
      <Sidebar mode="app" product="business" activeApp="business" />
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
              <div key={card.id} className="bc-dash-card">
                <div className="bc-dash-card-thumb">
                  <BusinessCardThumb businessCard={card.card_data.businessCard} />
                </div>
                <div className="bc-dash-card-body">
                  <CardTitle card={card} onRenamed={handleRenamed} />
                  <div className="bc-dash-card-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setPreviewCard({ id: card.id, title: displayTitle(card), businessCard: card.card_data.businessCard })}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => navigate(`/business-card/${card.id}`)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-button card-delete-btn"
                      onClick={() => handleDelete(card)}
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
