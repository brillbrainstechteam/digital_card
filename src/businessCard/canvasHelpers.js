import { StaticCanvas } from 'fabric'
import { getCardDimensions } from './bcTemplates'

/**
 * The installed fabric build renders every object at exactly half its
 * intended size relative to the canvas's own backing store (reproducible
 * with a bare Canvas + full-bleed Rect, independent of devicePixelRatio,
 * retina scaling, or object caching settings). Setting zoom to 2 right
 * after construction cancels that internal factor so logical coordinates
 * (matching CARD_SIZES / getCardDimensions) fill the canvas edge-to-edge
 * again, both for live editing and for toDataURL/thumbnail export.
 */
export function applyRenderScaleFix(canvas) {
  canvas.setZoom(2)
}

/**
 * Renders a template with the user's real entered details onto an
 * off-screen Fabric StaticCanvas and returns a PNG data URL.
 * Used so gallery/preview tiles show actual data instead of generic placeholders.
 */
export async function renderTemplateThumbnail(tmpl, profile, palette, size = 'standard') {
  const orientation = tmpl.orientation === 'vertical' ? 'vertical' : 'horizontal'
  const { w, h } = getCardDimensions(size, orientation)

  const el = document.createElement('canvas')
  const canvas = new StaticCanvas(el, { width: w, height: h })
  applyRenderScaleFix(canvas)

  try {
    await tmpl.load(canvas, profile, palette, w, h)
    canvas.renderAll()
    return canvas.toDataURL({ format: 'png', multiplier: 1 })
  } finally {
    canvas.dispose()
  }
}

/**
 * Renders a saved business card's front face straight from its stored Fabric
 * JSON (businessCard.frontJson) rather than trusting a possibly-stale cached
 * `frontImg` snapshot — a card saved before applyRenderScaleFix() existed
 * would have a permanently broken frontImg baked in, even though the JSON
 * itself (and thus the real editor content) is fine. Re-rendering from JSON
 * on every list view guarantees the preview always matches current content.
 */
export async function renderSavedCardThumbnail(businessCard) {
  const { frontJson, setup } = businessCard || {}
  if (!frontJson) return null

  const orientation = setup?.orientation === 'vertical' ? 'vertical' : 'horizontal'
  const { w, h } = getCardDimensions(setup?.size || 'standard', orientation)

  const el = document.createElement('canvas')
  const canvas = new StaticCanvas(el, { width: w, height: h })
  applyRenderScaleFix(canvas)

  try {
    const json = typeof frontJson === 'string' ? JSON.parse(frontJson) : frontJson
    await canvas.loadFromJSON(json)
    canvas.renderAll()
    return canvas.toDataURL({ format: 'png', multiplier: 1 })
  } catch (_) {
    return null
  } finally {
    canvas.dispose()
  }
}
