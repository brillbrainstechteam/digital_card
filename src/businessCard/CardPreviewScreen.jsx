import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { renderFaceThumbnail } from './canvasHelpers'
import { getCardDimensions } from './bcTemplates'
import './businessCard.css'

// Clean, read-only view of a saved card's front (and back, if present) —
// no Fabric editor handles/toolbars, just the finished design.
export function CardPreviewScreen({ card, onEdit, onClose }) {
  const { title, businessCard } = card
  const { frontJson, backJson, setup } = businessCard || {}
  const hasBack = !!backJson
  const { w: cardW, h: cardH } = getCardDimensions(setup?.size || 'standard', setup?.orientation)
  const cardAspect = `${cardW} / ${cardH}`

  const [face, setFace] = useState('front')
  const [images, setImages] = useState({ front: null, back: null })
  const [loading, setLoading] = useState(true)

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

  const activeImg = images[face]

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

        {hasBack && (
          <div className="bce-face-tabs" style={{ marginBottom: 8, display: 'inline-flex' }}>
            <button
              type="button"
              className={`bce-face-tab${face === 'front' ? ' active' : ''}`}
              onClick={() => setFace('front')}
            >
              Front
            </button>
            <button
              type="button"
              className={`bce-face-tab${face === 'back' ? ' active' : ''}`}
              onClick={() => setFace('back')}
            >
              Back
            </button>
          </div>
        )}
      </div>

      <div className="bc-preview-body">
        <span className="bc-preview-label">{hasBack ? `${face} side` : 'Front side'}</span>
        <div className="bc-preview-img">
          {loading ? (
            <div style={{ width: '100%', aspectRatio: cardAspect, background: '#f0ede8' }} />
          ) : activeImg ? (
            <img src={activeImg} alt={`${title} — ${face}`} />
          ) : (
            <div style={{ width: '100%', aspectRatio: cardAspect, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
              Nothing saved on this side yet
            </div>
          )}
        </div>
      </div>

      <div className="bc-preview-actions">
        <button type="button" className="secondary-button" onClick={onClose}>
          Close
        </button>
        <button type="button" className="primary-button" onClick={onEdit}>
          Edit This Card
        </button>
      </div>
    </div>
  )
}
