import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { fetchCards, createCard, updateCard, deleteCard } from '../api'
import { useToast } from '../context/ToastContext'
import { isBusinessCard } from '../cardTypeUtils'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'
import { renderSavedCardThumbnail, renderFaceThumbnail } from '../features/business-card/canvasHelpers'
import { CardPreviewScreen } from '../features/business-card/CardPreviewScreen'
import { getTemplate } from '../features/business-card/bcTemplates'
import '../features/business-card/features/business-card.css'

// Cards are created with a generic placeholder title ("Business Card").
// Until the user renames one, show the template's own name instead so the
// list is actually distinguishable at a glance.
const DEFAULT_TITLE = 'Business Card'

const FILTERS = ['all', 'draft', 'completed']

function templateLabel(businessCard) {
  if (businessCard?.templateId === 'blank') return 'Blank Canvas'
  return getTemplate(businessCard?.templateId)?.label || DEFAULT_TITLE
}

function displayTitle(card) {
  return card.title && card.title !== DEFAULT_TITLE
    ? card.title
    : templateLabel(card.card_data.businessCard)
}

// Business Cards aren't "published" like Digital Cards — they're designed
// and then exported for printing. A card is 'completed' once the user has
// downloaded it at least once (see BusinessCardEditor's onExport); until
// then it's a 'draft'.
function cardStatus(card) {
  return card.card_data?.businessCard?.status === 'completed' ? 'completed' : 'draft'
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
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

// Same hover Front/Back toggle as the template gallery (TemplateGallery.jsx)
// — but rendered from this specific card's own saved frontJson/backJson,
// not a template default, so edits the user made to either side show up.
function BusinessCardThumb({ businessCard }) {
  const [liveThumb, setLiveThumb] = useState(null)
  const [backThumb, setBackThumb] = useState(null)
  const [tried, setTried] = useState(false)
  const [face, setFace] = useState('front')

  useEffect(() => {
    let cancelled = false
    setLiveThumb(null)
    setBackThumb(null)
    setTried(false)
    setFace('front')
    renderSavedCardThumbnail(businessCard)
      .then((url) => { if (!cancelled) setLiveThumb(url) })
      .finally(() => { if (!cancelled) setTried(true) })
    renderFaceThumbnail(businessCard?.backJson, businessCard?.setup)
      .then((url) => { if (!cancelled) setBackThumb(url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [businessCard])

  // Prefer a freshly re-rendered thumbnail (always matches current saved
  // content); fall back to the cached snapshot only if re-render fails or
  // there's no frontJson (older saves), and finally to a placeholder icon.
  const frontSrc = liveThumb || (tried ? businessCard?.frontImg : null)
  const src = face === 'back' ? backThumb : frontSrc

  return (
    <>
      {src ? <img src={src} alt={`Business card preview — ${face}`} /> : <span style={{ fontSize: 28 }}>🪪</span>}
      {backThumb && (
        <div className="bc-tmpl-face-toggle" onClick={(e) => e.stopPropagation()}>
          <button type="button" className={face === 'front' ? 'active' : ''} onClick={() => setFace('front')}>
            Front
          </button>
          <button type="button" className={face === 'back' ? 'active' : ''} onClick={() => setFace('back')}>
            Back
          </button>
        </div>
      )}
    </>
  )
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
  const [activeFilter, setActiveFilter] = useState('all')

  async function loadCards() {
    setLoading(true)
    setError('')
    try {
      const all = await fetchCards()
      setCards(all.filter(isBusinessCard))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCards() }, [])

  // No DB record is created here — BusinessCardFlow runs the details/
  // template/editor steps entirely in local state and only calls
  // createCard() on the user's first explicit Save, so cancelling out of
  // the flow before that never leaves a blank draft behind.
  function handleCreate() {
    navigate('/business-card/new')
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

  async function handleShare(card) {
    const img = card.card_data?.businessCard?.frontImg
    if (img) {
      try {
        await navigator.clipboard.writeText(img)
        toast.success('Card image link copied to clipboard')
      } catch (err) {
        toast.error('Could not copy to clipboard')
      }
      return
    }
    toast.info('Sharing is coming soon!')
  }

  async function handleMakeCopy(card) {
    try {
      const original = card.card_data?.businessCard || {}
      const newTitle = `Copy of ${displayTitle(card)}`
      const newCard = await createCard(newTitle, { productType: 'business' })
      await updateCard(newCard.id, {
        card_data: {
          productType: 'business',
          businessCard: {
            ...original,
            status: 'draft',
            savedAt: new Date().toISOString(),
          },
        },
      })
      toast.success('Copy created — you can now edit it')
      await loadCards()
    } catch (err) {
      toast.error(err.message)
    }
  }

  function handleRenamed(cardId, newTitle) {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, title: newTitle } : c)))
  }

  const counts = {
    all: cards.length,
    draft: cards.filter((c) => cardStatus(c) === 'draft').length,
    completed: cards.filter((c) => cardStatus(c) === 'completed').length,
  }

  const filteredCards = activeFilter === 'all'
    ? cards
    : cards.filter((c) => cardStatus(c) === activeFilter)

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

        <div className="dashboard-summary-grid">
          {[
            ['Total Cards', counts.all],
            ['Draft', counts.draft],
            ['Completed', counts.completed],
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
        ) : filteredCards.length === 0 ? (
          <div className="dashboard-empty">
            <div className="empty-icon">🔍</div>
            <h2>No {activeFilter} cards</h2>
            <p>You don't have any {activeFilter} business cards yet.</p>
          </div>
        ) : (
          <div className="bc-dash-grid">
            {filteredCards.map((card) => {
              const status = cardStatus(card)
              const isCompleted = status === 'completed'
              return (
                <div key={card.id} className="bc-dash-card">
                  <div className="bc-dash-card-thumb">
                    <BusinessCardThumb businessCard={card.card_data.businessCard} />
                  </div>
                  <div className="bc-dash-card-body">
                    <div className="card-list-meta" style={{ marginBottom: 6 }}>
                      <span className={`status-badge status-${status}`}>{status}</span>
                      <span>{formatDate(card.created_at)}</span>
                    </div>
                    <CardTitle card={card} onRenamed={handleRenamed} />
                    <div className="bc-dash-card-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setPreviewCard({ id: card.id, title: displayTitle(card), businessCard: card.card_data.businessCard })}
                      >
                        Preview
                      </button>
                      {isCompleted ? (
                        <>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleShare(card)}
                          >
                            Share
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleMakeCopy(card)}
                          >
                            Make a Copy
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => navigate(`/business-card/${card.id}`)}
                        >
                          Edit
                        </button>
                      )}
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
            onConfirm={() => confirmDelete(pendingConfirm.card)}
          />
        )}
      </section>
    </main>
  )
}
