import { StaticCanvas } from 'fabric'
import { getCardDimensions } from './bcTemplates'

/**
 * Every template/editor helper authors `left`/`top` as a top-left anchor —
 * the convention Fabric used before v6. This installed Fabric build (7.4.0)
 * defaults new objects to originX/originY 'center', so any object created
 * without an explicit origin renders shifted by half its own width/height
 * (usually off-canvas). All current object-creation call sites now pass
 * originX/originY: 'left'/'top' explicitly, but business cards saved before
 * that fix have 'center' baked into their stored frontJson. Since the
 * left/top numbers were always authored assuming a top-left anchor, fixing
 * old data only requires flipping the origin flag back — the coordinates
 * themselves are already correct and must NOT be recalculated.
 *
 * Polygon (and Path) are the one exception: they're built from an absolute
 * points array, and Fabric always auto-computes their left/top from those
 * points to match whatever origin is set, at both construction time and on
 * every `.set({ originX, originY })` call. So a Polygon's stored
 * left/top + originX:'center' is already self-consistent — flipping the
 * origin flag here (as we must for Rect/Textbox/Circle/Image) would corrupt
 * it, since Fabric would reinterpret the unchanged center-anchored left/top
 * as a top-left anchor and shift the shape by half its bounding box.
 */
export function normalizeLegacyOrigins(canvas) {
  canvas.getObjects().forEach((obj) => {
    const type = (obj.type || '').toLowerCase()
    if (type === 'polygon' || type === 'path') return
    if (obj.originX !== 'left' || obj.originY !== 'top') {
      obj.set({ originX: 'left', originY: 'top' })
      obj.setCoords()
    }
  })
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

  try {
    await tmpl.load(canvas, profile, palette, w, h)
    canvas.renderAll()
    return canvas.toDataURL({ format: 'png', multiplier: 1 })
  } finally {
    canvas.dispose()
  }
}

/**
 * Renders a single stored Fabric JSON face (front or back) at full
 * resolution and returns a PNG data URL. Old JSON may still carry the
 * broken 'center' origin (see normalizeLegacyOrigins above), so it's
 * patched right after load.
 */
export async function renderFaceThumbnail(json, setup, multiplier = 1) {
  if (!json) return null

  const orientation = setup?.orientation === 'vertical' ? 'vertical' : 'horizontal'
  const { w, h } = getCardDimensions(setup?.size || 'standard', orientation)

  const el = document.createElement('canvas')
  const canvas = new StaticCanvas(el, { width: w, height: h })

  try {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json
    await canvas.loadFromJSON(parsed)
    normalizeLegacyOrigins(canvas)
    canvas.renderAll()
    return canvas.toDataURL({ format: 'png', multiplier })
  } catch (_) {
    return null
  } finally {
    canvas.dispose()
  }
}

/**
 * Renders a saved business card's front face straight from its stored Fabric
 * JSON (businessCard.frontJson) rather than trusting a possibly-stale cached
 * `frontImg` snapshot. Re-rendering from JSON on every list view guarantees
 * the preview always matches current content.
 */
export async function renderSavedCardThumbnail(businessCard) {
  const { frontJson, setup } = businessCard || {}
  if (!frontJson) return null
  return renderFaceThumbnail(frontJson, setup, 1)
}
