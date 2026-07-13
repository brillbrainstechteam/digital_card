import { useEffect, useState } from 'react'
import { ArrowLeft, Download, FileDown } from 'lucide-react'
import { renderFaceThumbnail } from '../canvasHelpers'
import { getCardDimensions } from '../bcTemplates'
import '../businessCard.css'

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
      const { dataUrl } = await composeSideBySide(images.front, images.back)
      downloadDataUrl(dataUrl, `${title || 'business-card'}.png`)
    } finally {
      setExporting(false)
    }
  }

  async function handleExportPdf() {
    if (!images.front || exporting) return
    setExporting(true)
    try {
      const { dataUrl, width, height } = await composeSideBySide(images.front, images.back)
      const { jsPDF } = await import('jspdf')
      // Fixed page width in points, height scaled to match the composed
      // image's aspect ratio so the PDF page always fits the card(s) exactly.
      const ptWidth = 720
      const ptHeight = (height / width) * ptWidth
      const pdf = new jsPDF({
        unit: 'pt',
        format: [ptWidth, ptHeight],
        orientation: ptWidth >= ptHeight ? 'landscape' : 'portrait',
      })
      pdf.addImage(dataUrl, 'PNG', 0, 0, ptWidth, ptHeight)
      pdf.save(`${title || 'business-card'}.pdf`)
    } finally {
      setExporting(false)
    }
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
        <div className="bc-lightbox-cards" style={{ marginBottom: 0, maxWidth: 900, width: '100%' }}>
          <div className="bc-lightbox-card-col">
            <div className="bc-lightbox-preview">
              {loading ? (
                <div style={{ width: '100%', aspectRatio: cardAspect, background: '#f0ede8' }} />
              ) : images.front ? (
                <img src={images.front} alt={`${title} — front`} />
              ) : (
                <div style={{ width: '100%', aspectRatio: cardAspect, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                  Nothing saved on this side yet
                </div>
              )}
            </div>
            <span className="bc-lightbox-card-label">Front</span>
          </div>

          {hasBack && (
            <div className="bc-lightbox-card-col">
              <div className="bc-lightbox-preview">
                {loading ? (
                  <div style={{ width: '100%', aspectRatio: cardAspect, background: '#f0ede8' }} />
                ) : images.back ? (
                  <img src={images.back} alt={`${title} — back`} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: cardAspect, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                    Nothing saved on this side yet
                  </div>
                )}
              </div>
              <span className="bc-lightbox-card-label">Back</span>
            </div>
          )}
        </div>
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
          onClick={handleExportPdf}
          disabled={loading || exporting}
        >
          <FileDown size={14} /> {exporting ? 'Exporting…' : 'Export PDF'}
        </button>
        <button type="button" className="primary-button" onClick={onEdit}>
          Edit This Card
        </button>
      </div>
    </div>
  )
}
