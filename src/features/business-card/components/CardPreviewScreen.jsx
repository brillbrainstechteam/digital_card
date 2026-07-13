import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, ShoppingCart } from 'lucide-react'
import { renderFaceThumbnail } from '../canvasHelpers'
import { getCardDimensions } from '../bcTemplates'
import { useCart } from '../../../context/CartContext'
import { useToast } from '../../../context/ToastContext'
import '../businessCard.css'

const BUSINESS_CARD_PRICE = 799

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load card image.'))
    img.src = src
  })
}

// Draws front (and back, if present) side by side on one canvas at their
// native resolution — both preview images already render at a high
// multiplier (see renderFaceThumbnail below), so the export stays crisp
// regardless of the card's on-screen preview size.
async function composeSideBySide(frontSrc, backSrc) {
  const gap = 40
  const frontImg = await loadImage(frontSrc)
  const backImg = backSrc ? await loadImage(backSrc) : null
  const h = Math.max(frontImg.height, backImg?.height || 0)
  const w = frontImg.width + (backImg ? gap + backImg.width : 0)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(frontImg, 0, (h - frontImg.height) / 2)
  if (backImg) ctx.drawImage(backImg, frontImg.width + gap, (h - backImg.height) / 2)

  return { dataUrl: canvas.toDataURL('image/png'), width: w, height: h }
}

// Clean, read-only view of a saved card's front and back — no Fabric
// editor handles/toolbars, just the finished design, shown side by side
// with an option to export the pair as a PNG or PDF.
export function CardPreviewScreen({ card, onEdit, onClose }) {
  const { title, businessCard } = card
  const { frontJson, backJson, setup } = businessCard || {}
  const hasBack = !!backJson
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
  const [flipped, setFlipped] = useState(false)

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
      const { dataUrl } = await composeSideBySide(images.front, images.back)
      downloadDataUrl(dataUrl, `${title || 'business-card'}.png`)
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
        <p>Read-only preview of your saved card design</p>
      </div>

      <div className="bc-preview-body">
        <div
          className={`bc-flip-zone ${hasBack ? 'bc-flip-zone--flippable' : ''}`}
          onClick={() => hasBack && setFlipped((current) => !current)}
        >
          <div className={`bc-flip-card ${flipped ? 'is-flipped' : ''}`} style={{ aspectRatio: cardAspect }}>
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
          <p className="bc-flip-hint">Click the card to flip to the {flipped ? 'front' : 'back'}</p>
        )}
      </div>

      <div className="bc-preview-actions">
        <button type="button" className="secondary-button" onClick={onClose}>
          Close
        </button>
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
          onClick={handleAddToCart}
          disabled={loading || !cardId}
          title={!cardId ? 'Save this card first to add it to your cart' : undefined}
        >
          <ShoppingCart size={14} /> {inCart ? 'View Cart' : 'Add to Cart'}
        </button>
        <button type="button" className="primary-button" onClick={onEdit}>
          Edit This Card
        </button>
      </div>
    </div>
  )
}
