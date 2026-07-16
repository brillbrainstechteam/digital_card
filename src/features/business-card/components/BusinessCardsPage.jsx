import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, ShoppingCart, Archive, ArchiveRestore } from 'lucide-react'
import { fetchCards, createCard, updateCard } from '../services/api'
import { useToast } from '../../../context/ToastContext'
import { useCart } from '../../../context/CartContext'
import { isBusinessCard } from '../../../cardTypeUtils'
import { PageHeader } from '../../../components/PageHeader'
import { Sidebar } from '../../../components/Sidebar'
import { renderSavedCardThumbnail, renderFaceThumbnail, renderTemplateThumbnail } from '../canvasHelpers'
import { CardPreviewScreen } from './CardPreviewScreen'
import { getTemplate, getPalette } from '../bcTemplates'
import '../businessCard.css'

// Cards are created with a generic placeholder title ("Business Card").
// Until the user renames one, show the template's own name instead so the
// list is actually distinguishable at a glance.
const DEFAULT_TITLE = 'Business Card'

// Kept in sync with CardPreviewScreen's own Add to Cart.
const BUSINESS_CARD_PRICE = 799

// A card is a draft until it's bought, then it's owned. Both 'owned' and
// 'archived' are derived from businessCard.purchased/.archived.
const FILTERS = ['all', 'draft', 'owned', 'archived']

const FILTER_LABELS = {
  all: 'All',
  draft: 'Draft',
  owned: 'Owned',
  archived: 'Archived',
}

function templateLabel(businessCard) {
  if (businessCard?.templateId === 'blank') return 'Blank Canvas'
  return getTemplate(businessCard?.templateId)?.label || DEFAULT_TITLE
}

// Cards created from the Digital Card publish flow (PublishFlowModal.jsx)
// start out as just a template + the digital card's profile — no
// frontJson/backJson exists until the user actually opens the editor, so
// their thumbnail is blank until then (see BusinessCardThumb's template
// fallback below). They're always labeled by where they came from, rather
// than the generic auto-generated title, so the connection back to the
// source Digital Card stays visible in the list regardless of what the
// card was auto-titled at creation time.
function displayTitle(card) {
  const businessCard = card.card_data.businessCard
  if (businessCard?.personalizedFromDigitalCard) {
    const p = businessCard.profile || {}
    const sourceName = p.companyName || p.brandName || p.personName || 'Digital Card'
    return `Built from your digital card - ${sourceName}`
  }
  return card.title && card.title !== DEFAULT_TITLE
    ? card.title
    : templateLabel(businessCard)
}

// Paid for via the checkout flow (see markBusinessCardPurchased in
// CheckoutPage.jsx). An owned card is locked for editing — the design is
// considered final once it's been bought, so only preview/download remain.
// Anything not yet bought is still a draft.
function isPurchased(card) {
  return !!card.card_data?.businessCard?.purchased
}

function isArchived(card) {
  return !!card.card_data?.businessCard?.archived
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
    } catch {
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

// Front by default, back shown on hover — same behavior as the template
// gallery (TemplateGallery.jsx) — but rendered from this specific card's
// own saved frontJson/backJson, not a template default, so edits the user
// made to either side show up.
function BusinessCardThumb({ businessCard }) {
  const [liveThumb, setLiveThumb] = useState(null)
  const [templateThumb, setTemplateThumb] = useState(null)
  const [backThumb, setBackThumb] = useState(null)
  const [tried, setTried] = useState(false)
  const [face, setFace] = useState('front')

  useEffect(() => {
    let cancelled = false
    setLiveThumb(null)
    setTemplateThumb(null)
    setBackThumb(null)
    setTried(false)
    setFace('front')
    renderSavedCardThumbnail(businessCard)
      .then((url) => { if (!cancelled) setLiveThumb(url) })
      .finally(() => { if (!cancelled) setTried(true) })
    renderFaceThumbnail(businessCard?.backJson, businessCard?.setup)
      .then((url) => { if (!cancelled) setBackThumb(url) })
      .catch(() => {})
    // Cards created via the Digital Card publish flow (or any card never
    // opened in the editor yet) have a template + profile chosen but no
    // frontJson/frontImg rendered yet — render the template directly with
    // that profile instead of falling straight through to the placeholder
    // icon, so the list shows what the card will actually look like.
    if (!businessCard?.frontJson && !businessCard?.frontImg && businessCard?.templateId && businessCard.templateId !== 'blank') {
      const tmpl = getTemplate(businessCard.templateId)
      const profile = businessCard.profile || {}
      renderTemplateThumbnail(tmpl, profile, getPalette(profile), businessCard.setup?.size)
        .then((url) => { if (!cancelled) setTemplateThumb(url) })
        .catch(() => {})
    }
    return () => { cancelled = true }
  }, [businessCard])

  // Prefer a freshly re-rendered thumbnail (always matches current saved
  // content); fall back to the cached snapshot if re-render fails or
  // there's no frontJson (older saves); then the template-with-profile
  // render for never-opened cards; and finally a placeholder icon.
  const frontSrc = liveThumb || (tried ? businessCard?.frontImg : null) || templateThumb
  const src = face === 'back' ? backThumb : frontSrc

  return (
    <div
      className="bc-dash-card-thumb-inner"
      onMouseEnter={() => { if (backThumb) setFace('back') }}
      onMouseLeave={() => setFace('front')}
    >
      {src ? <img src={src} alt={`Business card preview — ${face}`} /> : <span style={{ fontSize: 28 }}>🪪</span>}
    </div>
  )
}

export function BusinessCardsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const cart = useCart()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // handleCreate below just navigates — card creation is lazy (only happens
  // on first Save inside the editor), so this never actually flips true;
  // kept read-only for the button's disabled/label state below.
  const [creating] = useState(false)
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

  async function handleShare(card) {
    const img = card.card_data?.businessCard?.frontImg
    if (img) {
      try {
        await navigator.clipboard.writeText(img)
        toast.success('Card image link copied to clipboard')
      } catch {
        toast.error('Could not copy to clipboard')
      }
      return
    }
    toast.info('Sharing is coming soon!')
  }

  async function handleMakeCopy(card) {
    try {
      // Copy the design only. Ownership and archived state must NOT carry
      // over — a copy is a brand-new draft that has to be bought on its own,
      // and inheriting `purchased` would hand out a free (and uneditable)
      // card. This is the escape hatch for editing an owned design.
      const { purchased, purchasedAt, archived, ...design } = card.card_data?.businessCard || {}
      void purchased; void purchasedAt; void archived
      const newTitle = `Copy of ${displayTitle(card)}`
      const newCard = await createCard(newTitle, { productType: 'business' })
      await updateCard(newCard.id, {
        card_data: {
          productType: 'business',
          businessCard: {
            ...design,
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

  // card_data is a JSON blob PUT shallowly, so the existing contents have to
  // be merged rather than replaced — otherwise archiving would wipe the
  // card's design.
  async function handleToggleArchive(card) {
    const businessCard = card.card_data?.businessCard || {}
    const nextArchived = !businessCard.archived
    try {
      await updateCard(card.id, {
        card_data: {
          ...card.card_data,
          businessCard: { ...businessCard, archived: nextArchived },
        },
      })
      toast.success(nextArchived ? 'Card archived' : 'Card restored')
      await loadCards()
    } catch (err) {
      toast.error(err.message)
    }
  }

  function handleAddToCart(card) {
    const cartItemId = `${card.id}-businessCard`
    if (cart.hasItem(cartItemId)) {
      navigate('/cart')
      return
    }
    cart.addItem({
      id: cartItemId,
      type: 'business-card',
      path: `/business-card/${card.id}`,
      name: displayTitle(card),
      description: 'Personalized print-ready Business Card',
      amount: BUSINESS_CARD_PRICE,
      publishCardId: card.id,
    })
    toast.success('Added to cart')
  }

  function handleRenamed(cardId, newTitle) {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, title: newTitle } : c)))
  }

  // Archiving is a way to get a card out of the way, so archived cards are
  // excluded from every other view and only surface under their own filter.
  const active = cards.filter((c) => !isArchived(c))

  const counts = {
    all: active.length,
    draft: active.filter((c) => !isPurchased(c)).length,
    owned: active.filter(isPurchased).length,
    archived: cards.filter(isArchived).length,
  }

  const filteredCards =
    activeFilter === 'all' ? active
    : activeFilter === 'archived' ? cards.filter(isArchived)
    : activeFilter === 'owned' ? active.filter(isPurchased)
    : active.filter((c) => !isPurchased(c))

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
            ['Owned', counts.owned],
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
              {FILTER_LABELS[f]}
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
              const owned = isPurchased(card)
              const archived = isArchived(card)
              const inCart = cart.hasItem(`${card.id}-businessCard`)
              return (
                <div key={card.id} className="bc-dash-card">
                  <div className="bc-dash-card-thumb">
                    <BusinessCardThumb businessCard={card.card_data.businessCard} />
                    <button
                      type="button"
                      className="bc-thumb-archive-btn"
                      title={archived ? 'Restore card' : 'Archive card'}
                      aria-label={archived ? 'Restore card' : 'Archive card'}
                      onClick={() => handleToggleArchive(card)}
                    >
                      {archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                    </button>
                  </div>
                  <div className="bc-dash-card-body">
                    <div className="card-list-meta" style={{ marginBottom: 6 }}>
                      {owned
                        ? <span className="status-badge status-owned">owned</span>
                        : <span className="status-badge status-draft">draft</span>}
                      {archived && <span className="status-badge status-archived">archived</span>}
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

                      {/* A purchased card's design is final — editing and
                          re-buying are both gone, leaving preview/download
                          (in the preview screen) plus Share/Copy. Making a
                          copy is the escape hatch: it produces a fresh,
                          unpurchased draft that can be edited. */}
                      {!owned && !archived && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => navigate(`/business-card/${card.id}`)}
                        >
                          Edit
                        </button>
                      )}

                      {owned && (
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
                      )}

                      {/* Pushed to the far right of the action row by its
                          own auto margin, so it stays bottom-right of the
                          card regardless of how many buttons precede it. */}
                      {!owned && (
                        <button
                          type="button"
                          className="bc-cart-button"
                          title={inCart ? 'View cart' : 'Add to cart'}
                          aria-label={inCart ? 'View cart' : 'Add to cart'}
                          onClick={() => handleAddToCart(card)}
                        >
                          <ShoppingCart size={15} fill="currentColor" />
                        </button>
                      )}
                    </div>
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
