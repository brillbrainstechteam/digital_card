import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, ShoppingCart, FileDown } from 'lucide-react'
import { renderFaceThumbnail, composeCardSheet, savePdfFromSheet, downloadDataUrl } from '../canvasHelpers'
import { getCardDimensions } from '../bcTemplates'
import { useCart } from '../../../context/CartContext'
import { useToast } from '../../../context/ToastContext'
import '../businessCard.css'

const BUSINESS_CARD_PRICE = 799

// Clean, read-only view of a saved card's front and back — no Fabric
// editor handles/toolbars, just the finished design, shown side by side
// with an option to export the pair as a PNG or PDF.
export function CardPreviewScreen({ card, onEdit, onClose }) {
  const { title, businessCard } = card
  const { frontJson, backJson, setup } = businessCard || {}
  const hasBack = !!backJson
  // Once bought, the design is final: no re-buying, no editing — just
  // preview and download. See markBusinessCardPurchased in CheckoutPage.jsx.
  const owned = !!businessCard?.purchased
  const { w: cardW, h: cardH } = getCardDimensions(setup?.size || 'standard', setup?.orientation)
  const cardAspect = `${cardW} / ${cardH}`

  const navigate = useNavigate()
  const cart = useCart()
  const toast = useToast()
  // Only a saved card has a real DB id — the editor's live "Preview"
  // (before the first Save) passes a card object with no id, so Add to
  // Cart is disabled there rather than adding a line item with nothing
  // to actually link to at checkout.
  const cardId = card.id || null
  const cartItemId = cardId ? `${cardId}-businessCard` : null
  const inCart = cartItemId ? cart.hasItem(cartItemId) : false

  const [images, setImages] = useState({ front: null, back: null })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      renderFaceThumbnail(frontJson, setup, 3),
      hasBack ? renderFaceThumbnail(backJson, setup, 3) : Promise.resolve(null),
    ]).then(([front, back]) => {
      if (cancelled) return
      setImages({ front, back })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [frontJson, backJson, setup, hasBack])

  async function handleExportImage() {
    if (!images.front || exporting) return
    setExporting(true)
    try {
      const { dataUrl } = await composeCardSheet(images.front, images.back)
      downloadDataUrl(dataUrl, `${title || 'business-card'}.png`)
    } finally {
      setExporting(false)
    }
  }

  async function handleExportPdf() {
    if (!images.front || exporting) return
    setExporting(true)
    try {
      const sheet = await composeCardSheet(images.front, images.back)
      await savePdfFromSheet(sheet, title || 'business-card')
    } finally {
      setExporting(false)
    }
  }

  function handleAddToCart() {
    if (!cardId) {
      toast.error('Save this card first, then add it to your cart')
      return
    }
    if (inCart) {
      navigate('/cart')
      return
    }
    cart.addItem({
      id: cartItemId,
      type: 'business-card',
      path: `/business-card/${cardId}`,
      name: title || 'Business Card',
      description: 'Personalized print-ready Business Card',
      price: `INR ${BUSINESS_CARD_PRICE}`,
      amount: BUSINESS_CARD_PRICE,
      publishCardId: cardId,
    })
    toast.success('Added to cart')
  }

  return (
    <div className="bc-preview-page">
      <div className="bc-preview-header">
        <button
          type="button"
          className="secondary-button"
          style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={onClose}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <h2>{title}</h2>
        <p>
          {owned
            ? 'You own this card — the design is final. Download it as an image or PDF.'
            : 'Read-only preview of your saved card design'}
        </p>
      </div>

      <div className="bc-preview-body">
        <div className={`bc-flip-zone ${hasBack ? 'bc-flip-zone--flippable' : ''}`}>
          <div className="bc-flip-card" style={{ aspectRatio: cardAspect }}>
            <div className="bc-flip-face bc-flip-face--front" style={{ aspectRatio: cardAspect }}>
              {loading ? (
                <div style={{ width: '100%', height: '100%' }} />
              ) : images.front ? (
                <img src={images.front} alt={`${title} — front`} />
              ) : (
                <div className="bc-flip-face--empty" style={{ width: '100%', height: '100%' }}>
                  Nothing saved on this side yet
                </div>
              )}
            </div>

            {hasBack && (
              <div className="bc-flip-face bc-flip-face--back" style={{ aspectRatio: cardAspect }}>
                {loading ? (
                  <div style={{ width: '100%', height: '100%' }} />
                ) : images.back ? (
                  <img src={images.back} alt={`${title} — back`} />
                ) : (
                  <div className="bc-flip-face--empty" style={{ width: '100%', height: '100%' }}>
                    Nothing saved on this side yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {hasBack && (
          <p className="bc-flip-hint">Hover the card to see the back</p>
        )}
      </div>

      <div className="bc-preview-actions">
        <button type="button" className="secondary-button" onClick={onClose}>
          Close
        </button>
        {/* Downloads are a paid feature — an unpaid card can only be
            previewed on screen, so both export buttons appear only once
            the card is owned. */}
        {owned ? (
          <>
            <button
              type="button"
              className="secondary-button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={handleExportImage}
              disabled={loading || exporting}
            >
              <Download size={14} /> {exporting ? 'Exporting…' : 'Export Image'}
            </button>
            <button
              type="button"
              className="secondary-button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={handleExportPdf}
              disabled={loading || exporting}
            >
              <FileDown size={14} /> {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="secondary-button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={handleAddToCart}
              disabled={loading || !cardId}
              title={!cardId ? 'Save this card first to add it to your cart' : undefined}
            >
              <ShoppingCart size={14} /> {inCart ? 'View Cart' : 'Add to Cart'}
            </button>
            <button type="button" className="primary-button" onClick={onEdit}>
              Edit This Card
            </button>
          </>
        )}
      </div>
    </div>
  )
}
