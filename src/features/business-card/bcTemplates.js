/**
 * Business Card Template Definitions
 *
 * Each template has:
 *  - metadata (id, label, category, orientation)
 *  - svgPreview(palette): returns an SVG string for the gallery thumbnail
 *  - load(canvas, profile, palette, w, h): populates a Fabric.js canvas
 *
 * Fabric.js v7 API is used throughout.
 */
import {
  Textbox, Rect, Circle, Line, FabricImage, Gradient, Polygon, Group,
} from 'fabric'
import { buildDestinationValue, createDefaultQrSettings, renderQrToDataUrl } from '../qr'

// ── Card dimensions ──────────────────────────────────────────────
export const CARD_SIZES = {
  standard:  { w: 504, h: 288 },
  european:  { w: 482, h: 312 },
  square:    { w: 360, h: 360 },
  mini:      { w: 396, h: 216 },
}

export function getCardDimensions(size, orientation) {
  const base = CARD_SIZES[size] || CARD_SIZES.standard
  if (orientation === 'vertical') return { w: base.h, h: base.w }
  return { w: base.w, h: base.h }
}

// ── Smart placeholder helpers ────────────────────────────────────
// Exported so the editor can recognize untagged legacy objects by their
// rendered text (cards saved before elementType tagging existed).
export const PLACEHOLDER_TEXT = {
  personName:  'Your Name',
  designation: 'Your Title',
  companyName: 'Company Name',
  phone:       '+91 XXXXX XXXXX',
  email:       'email@example.com',
  website:     'www.example.com',
  location:    'Your City',
  address:     '123 Business Street, Your City',
  tagline:     'Professional tagline here',
}
const PH = PLACEHOLDER_TEXT

function usesProvidedDigitalCardData(profile) {
  return !!profile?.fromDigitalCardOnly
}

export function f(profile, key) {
  if (usesProvidedDigitalCardData(profile)) return profile?.[key] || ''
  return profile[key] || PH[key] || ''
}

export function isPlaceholder(profile, key) {
  if (usesProvidedDigitalCardData(profile)) return false
  return !profile[key]
}

// ── Palette helpers ──────────────────────────────────────────────
// Every template's load()/svgPreview() already resolves its colors through
// this single function, so preferring a logo-extracted palette here (see
// DetailsForm.jsx, which mirrors SetupWizard.jsx's extractPaletteFromLogo
// flow) automatically applies it everywhere — the gallery thumbnails, the
// preview lightbox, and the Fabric canvas editor — with no other file
// needing to know about it. When no palette was extracted (e.g. the
// Templates browse page, entered without a logo), this falls back to
// profile.themeColors / the same hardcoded defaults as before.
export function getPalette(profile) {
  const extracted = profile.palette
  if (extracted?.primary) {
    return {
      primary: extracted.primary,
      accent:  extracted.accent || '#c9a24b',
      text:    '#ffffff',
      textDark:'#1a1a1a',
    }
  }
  const tc = profile.themeColors || []
  return {
    primary: tc[0] || '#1f2d3d',
    accent:  tc[1] || '#c9a24b',
    text:    '#ffffff',
    textDark:'#1a1a1a',
  }
}

// ── Element identification ────────────────────────────────────────
// Every text/logo object created below is tagged with a plain `elementType`
// property (e.g. 'personName', 'designationCompany', 'logo'). This is a
// custom Fabric property, not one of the built-in ones, so it only survives
// canvas.toObject()/loadFromJSON() round-trips if the caller explicitly asks
// for it via canvas.toObject(CUSTOM_FABRIC_PROPS) instead of the bare
// canvas.toJSON() — see BusinessCardEditor.jsx, which does this everywhere
// it serializes. It's what lets the Elements panel show a real "Name" /
// "Company Name" / "Logo" toggle instead of just "Textbox 3".
export const CUSTOM_FABRIC_PROPS = ['elementType']

export const ELEMENT_LABELS = {
  personName: 'Name',
  designation: 'Designation',
  companyName: 'Company Name',
  designationCompany: 'Designation & Company',
  phone: 'Phone',
  email: 'Email',
  phoneEmail: 'Phone & Email',
  website: 'Website',
  location: 'Location',
  address: 'Address',
  logo: 'Logo',
  tagline: 'Tagline',
  qr: 'QR Code',
  accentShape: 'Accent Shape',
  motifIcon: 'Motif Icon',
}

// ── Fabric helpers ───────────────────────────────────────────────
// All templates author `left`/`top` as a top-left anchor (the convention
// Fabric used before v6). Fabric 7's default origin is 'center', so every
// object must explicitly opt back into 'left'/'top' or it renders shifted
// by half its own width/height — usually off-canvas.
export function addText(canvas, text, opts = {}) {
  const { elementType, ...rest } = opts
  const t = new Textbox(text, {
    selectable: true,
    editable: true,
    originX: 'left',
    originY: 'top',
    ...rest,
  })
  if (elementType) t.elementType = elementType
  canvas.add(t)
  return t
}

function addRect(canvas, opts = {}) {
  const { elementType, ...rest } = opts
  const r = new Rect({ selectable: true, originX: 'left', originY: 'top', ...rest })
  if (elementType) r.elementType = elementType
  canvas.add(r)
  return r
}

function addLine(canvas, points, opts = {}) {
  const l = new Line(points, { selectable: true, originX: 'left', originY: 'top', ...opts })
  canvas.add(l)
  return l
}

function addCircle(canvas, opts = {}) {
  const c = new Circle({ selectable: true, originX: 'left', originY: 'top', ...opts })
  canvas.add(c)
  return c
}

function linearGrad(canvas, x1, y1, x2, y2, c1, c2) {
  return new Gradient({
    type: 'linear',
    gradientUnits: 'pixels',
    coords: { x1, y1, x2, y2 },
    colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }],
  })
}

// Logo renders as just the raw uploaded image by default — no white box or
// border behind it. The bordered box only ever appears as a placeholder
// when there's genuinely no logo image to show yet (so the layout isn't
// just blank space) — pass `{ bordered: true }` to force the boxed
// treatment even when an image exists, if a template wants it. The
// placeholder box's footprint always equals `size`×`size`, so every
// template's surrounding layout math (company name position, etc.) is
// unaffected regardless of whether a real logo or the placeholder renders.
export async function addLogo(canvas, profile, x, y, size, opts = {}) {
  const { bordered = false } = opts
  const src = profile.logo || profile.logoSource

  if (!bordered && src) {
    try {
      const img = await FabricImage.fromURL(src, { crossOrigin: 'anonymous' })
      img.scaleToWidth(size)
      if (img.getScaledHeight() > size) img.scaleToHeight(size)
      img.set({
        left: x + (size - img.getScaledWidth()) / 2,
        top: y,
        originX: 'left', originY: 'top',
      })
      img.elementType = 'logo'
      canvas.add(img)
    } catch {
      // Logo failed to load (broken URL, CORS, etc.) — leave nothing behind.
    }
    return
  }

  const box = new Rect({
    width: size, height: size, rx: 6, ry: 6,
    fill: '#ffffff', stroke: '#9a968d', strokeWidth: 1.5,
    originX: 'left', originY: 'top',
  })

  if (!src) {
    const label = new Textbox('LOGO', {
      width: size, top: size / 2 - 7,
      fontSize: 10, fontWeight: '700', fill: '#9a968d',
      textAlign: 'center', fontFamily: 'Inter, sans-serif',
      originX: 'left', originY: 'top',
    })
    const group = new Group([box, label], { left: x, top: y, originX: 'left', originY: 'top' })
    group.elementType = 'logo'
    canvas.add(group)
    return
  }

  try {
    const img = await FabricImage.fromURL(src, { crossOrigin: 'anonymous' })
    // Small inset so the box's border stays visible all the way around.
    const inset = 6
    const innerSize = size - inset * 2
    img.scaleToWidth(innerSize)
    if (img.getScaledHeight() > innerSize) img.scaleToHeight(innerSize)
    img.set({
      left: (size - img.getScaledWidth()) / 2,
      top: (size - img.getScaledHeight()) / 2,
      originX: 'left', originY: 'top',
    })
    const group = new Group([box, img], { left: x, top: y, originX: 'left', originY: 'top' })
    group.elementType = 'logo'
    canvas.add(group)
  } catch {
    // Logo failed to load (broken URL, CORS, etc.) — leave the box empty.
  }
}

// ── Motif icon (corner watermark) ─────────────────────────────────
// A small procedural star stands in for a real per-industry icon library
// (none exists in this codebase — no industry field on the profile, no
// icon set) while still satisfying "every template gets a subtle branded
// corner decoration". Built as a Polygon (already imported for the
// diagonal/triangle templates) rather than an SVG-sourced Fabric object,
// so it needs no async loading and no new dependency.
function starPoints(outerR, innerR, spikes = 5) {
  const points = []
  const step = Math.PI / spikes
  let rot = -Math.PI / 2
  for (let i = 0; i < spikes; i++) {
    points.push({ x: Math.cos(rot) * outerR, y: Math.sin(rot) * outerR })
    rot += step
    points.push({ x: Math.cos(rot) * innerR, y: Math.sin(rot) * innerR })
    rot += step
  }
  return points
}

export function addMotifIcon(canvas, palette, w, h, corner = 'br', size = 36) {
  const isLeft = corner === 'bl' || corner === 'tl'
  const isTop  = corner === 'tl' || corner === 'tr'
  const cx = isLeft ? size / 2 + 16 : w - size / 2 - 16
  const cy = isTop  ? size / 2 + 16 : h - size / 2 - 16
  const poly = new Polygon(starPoints(size / 2, size / 4), {
    left: cx, top: cy,
    fill: palette.accent,
    opacity: 0.22,
    selectable: true, evented: true,
    originX: 'center', originY: 'center',
  })
  poly.elementType = 'motifIcon'
  canvas.add(poly)
  return poly
}

// ── Address footer (front) ────────────────────────────────────────
// Every template pins the address the same way now: a pin icon + text,
// bundled into one Group (same pattern as the QR placeholder) so they
// move/select as a single unit, centered at the bottom of the card and
// sized to actually be readable rather than a barely-visible footnote.
export function addAddressFooter(canvas, profile, w, h, opts = {}) {
  if (usesProvidedDigitalCardData(profile) && !profile?.address && !profile?.location) return null
  const { ink = '#333333', fontSize = 12 } = opts
  const iconSize = fontSize + 4
  const gap = 6
  const textW = w * 0.62
  const icon = new Textbox('📍', {
    left: 0, top: 1, width: iconSize + 2,
    fontSize: iconSize, fill: ink,
    fontFamily: 'Inter, sans-serif', textAlign: 'center',
    originX: 'left', originY: 'top',
  })
  const label = new Textbox(f(profile, 'address'), {
    left: iconSize + gap, top: 0, width: textW,
    fontSize, fontWeight: '600', fill: ink,
    fontFamily: 'Inter, sans-serif', textAlign: 'left',
    opacity: isPlaceholder(profile, 'address') ? 0.5 : 0.92,
    originX: 'left', originY: 'top',
  })
  const group = new Group([icon, label], {
    left: 0, top: h - fontSize - 24,
    originX: 'left', originY: 'top',
  })
  group.elementType = 'address'
  canvas.add(group)
  canvas.centerObjectH(group)
  return group
}

// ── Shared BACK side layout ────────────────────────────────────────
// Every template's back follows the same content structure (personal
// contact block + QR, grouped on opposite sides) — templates differ only
// in background/ink/accent color and which side the QR sits on, not in
// which fields appear, so one parameterized layout covers all 10 rather
// than 10 bespoke ones.
// Small round icon badge + label, used for phone/email/website rows so
// they read as attractive contact "chips" rather than bare bullet text.
// `center: true` centers the badge+text pair as a unit (used by the
// centered/stacked qrPosition layouts) instead of the default left-aligned
// row starting at `left`.
function addContactRow(canvas, glyph, text, opts) {
  if (opts?.hideWhenEmpty && !text) return null
  const { left, top, width, ink, accentColor, elementType, fontSize = 13, center = false } = opts
  const badgeR = 13
  const badge = new Circle({
    left: 0, top: 0, radius: badgeR, fill: accentColor, opacity: 0.16,
    originX: 'left', originY: 'top', selectable: false, evented: false,
  })
  const icon = new Textbox(glyph, {
    left: 0, top: badgeR - 9, width: badgeR * 2,
    fontSize: 13, fill: accentColor, textAlign: 'center',
    fontFamily: 'Inter, sans-serif', originX: 'left', originY: 'top',
    selectable: false, evented: false,
  })
  const badgeGroup = new Group([badge, icon], { left, top: top - badgeR + 7, originX: 'left', originY: 'top' })
  badgeGroup.selectable = false
  badgeGroup.evented = false
  canvas.add(badgeGroup)
  const textLeft = left + badgeR * 2 + 10
  const textObj = addText(canvas, text, {
    left: textLeft, top,
    fontSize, fill: ink, opacity: 0.92,
    fontFamily: 'Inter, sans-serif', width: width - (badgeR * 2 + 10),
    elementType,
  })
  if (center) {
    // Center the badge+text pair together as a visual unit: shift both by
    // half the leftover space in `width` once the text's actual rendered
    // width is known (Textbox doesn't auto-shrink, so measure via its
    // internal line width instead of assuming it fills the given width).
    const textActualWidth = Math.min(textObj.calcTextWidth(), textObj.width)
    const pairWidth = (textLeft - left) + textActualWidth
    const shift = (width - pairWidth) / 2
    if (shift > 0) {
      badgeGroup.set({ left: left + shift })
      badgeGroup.setCoords()
      textObj.set({ left: textLeft + shift })
      textObj.setCoords()
    }
  }
}

// Places phone/email/website in one horizontal row (three evenly-spaced
// chips) instead of stacked — the "horizontal alignment" option some
// templates opt into via opts.align === 'horizontal'.
function addContactRowsHorizontal(canvas, profile, opts) {
  const { left, top, width, ink, accentColor, fontSize } = opts
  const items = [
    { glyph: '☎', key: 'phone' },
    { glyph: '✉', key: 'email' },
    { glyph: '🌐', key: 'website' },
  ].filter((item) => !usesProvidedDigitalCardData(profile) || !!profile?.[item.key])
  if (!items.length) return
  const colW = width / items.length
  items.forEach((item, i) => {
    addContactRow(canvas, item.glyph, f(profile, item.key), {
      left: left + i * colW, top, width: colW - 14, ink, accentColor, fontSize,
      elementType: item.key,
      hideWhenEmpty: usesProvidedDigitalCardData(profile),
    })
  })
}

// Shared back-side layout: personal contact block + QR. Sized generously —
// large name, large QR, roomy contact rows — so the back never reads as
// the "blank" or "unfinished" side of the card.
//
// opts.qrPosition:
//   'side' (default) — contact block and QR on opposite sides of the card,
//     vertically centered against each other (best for wide horizontal cards).
//   'top' | 'bottom' — QR and the fully-centered contact block stacked one
//     above the other (best for narrow/vertical cards, where a side-by-side
//     split leaves no breathing room).
// opts.align: 'vertical' (default, contact rows stacked) | 'horizontal'
//   (phone/email/website in one row) — only applies to qrPosition:'side'.
export async function loadBackSide(canvas, profile, palette, w, h, opts = {}) {
  const {
    bg = '#ffffff',
    ink = palette.textDark || '#1a1a1a',
    accentColor = palette.accent,
    qrSide = 'right',
    accentShape = 'circle',
    qrPosition = 'side',
    align = 'vertical',
  } = opts
  canvas.backgroundColor = bg

  // Geometric accent so the back doesn't read as a flat, unfinished block.
  if (accentShape === 'circle') {
    const r = h * 0.55
    addCircle(canvas, {
      left: w - r * 0.55, top: h - r * 0.55, radius: r,
      fill: accentColor, opacity: 0.16, selectable: false, evented: false,
      elementType: 'accentShape',
    })
  } else if (accentShape === 'lines') {
    for (let i = 0; i < 4; i++) {
      addLine(canvas, [w - 60 - i * 14, h, w - i * 14, h - 60], {
        stroke: accentColor, strokeWidth: 2, opacity: 0.35,
        selectable: false, evented: false,
        ...(i === 0 ? { elementType: 'accentShape' } : {}),
      })
    }
  }

  // Builds the actual scannable QR a template ships with by default (a
  // Save Contact vCard from the profile, matching the editor's own default
  // destination) rather than a static "QR" placeholder box — so templates
  // no longer need a manual Remove-from-Back + Add-to-Back round trip in
  // the editor just to get a real, working QR onto the card.
  const qrLabel = async (size) => {
    const qrValue = buildDestinationValue('saveContact', {
      fullName: profile.personName || '',
      companyName: profile.companyName || '',
      designation: profile.designation || '',
      phone: profile.phone || '',
      email: profile.email || '',
      website: profile.website || '',
      address: profile.address || '',
    })
    if (qrValue) {
      try {
        const dataUrl = await renderQrToDataUrl({
          ...createDefaultQrSettings(), data: qrValue, size: 240, margin: 8,
        })
        const img = await FabricImage.fromURL(dataUrl)
        img.scaleToWidth(size)
        img.set({ originX: 'left', originY: 'top' })
        return img
      } catch {
        // Fall through to the static placeholder box below.
      }
    }
    const box = new Rect({
      width: size, height: size, fill: '#ffffff',
      stroke: accentColor, strokeWidth: 1.5, opacity: 0.9,
      originX: 'left', originY: 'top',
    })
    const label = new Textbox('QR', {
      width: size, top: size / 2 - 10,
      fontSize: 16, fontWeight: '700', fill: '#9a968d',
      textAlign: 'center', fontFamily: 'Inter, sans-serif',
      originX: 'left', originY: 'top',
    })
    return new Group([box, label])
  }

  if (qrPosition !== 'side') {
    // ── Stacked layout: QR + fully-centered contact block ─────────
    const stackQrSize = Math.max(w, h) < 260 ? 92 : Math.min(w * 0.34, 120)
    const rowW = w * 0.78
    const rowX = (w - rowW) / 2

    const qrGroup = await qrLabel(stackQrSize)
    qrGroup.elementType = 'qr'
    const contactBlockH = 34 + 30 + 34 * 3 // name + designation + 3 contact rows, roughly
    const gap = h * 0.05

    let qrTop, blockTop
    if (qrPosition === 'top') {
      qrTop = h * 0.08
      blockTop = qrTop + stackQrSize + gap
    } else {
      blockTop = h * 0.08
      qrTop = Math.min(h - stackQrSize - h * 0.06, blockTop + contactBlockH + gap)
    }
    qrGroup.set({ left: (w - stackQrSize) / 2, top: qrTop, originX: 'left', originY: 'top' })
    canvas.add(qrGroup)

    addText(canvas, f(profile, 'personName'), {
      left: 10, top: blockTop,
      fontSize: 25, fontWeight: '800', fill: ink,
      fontFamily: 'Georgia, serif', textAlign: 'center', width: w - 20,
      elementType: 'personName',
      opacity: isPlaceholder(profile, 'personName') ? 0.4 : 1,
    })
    addText(canvas, f(profile, 'designation'), {
      left: 10, top: blockTop + 34,
      fontSize: 14, fill: ink, opacity: 0.8, textAlign: 'center',
      fontFamily: 'Inter, sans-serif', width: w - 20,
      elementType: 'designation',
    })
    const contactTop = blockTop + 68
    const rowGap = 34
    addContactRow(canvas, '☎', f(profile, 'phone'), { left: rowX, top: contactTop, width: rowW, ink, accentColor, elementType: 'phone', center: true, hideWhenEmpty: usesProvidedDigitalCardData(profile) })
    addContactRow(canvas, '✉', f(profile, 'email'), { left: rowX, top: contactTop + rowGap, width: rowW, ink, accentColor, elementType: 'email', center: true, hideWhenEmpty: usesProvidedDigitalCardData(profile) })
    addContactRow(canvas, '🌐', f(profile, 'website'), { left: rowX, top: contactTop + rowGap * 2, width: rowW, ink, accentColor, elementType: 'website', center: true, hideWhenEmpty: usesProvidedDigitalCardData(profile) })

    addMotifIcon(canvas, palette, w, h, qrPosition === 'top' ? 'br' : 'tr', 32)
    return
  }

  // ── Side-by-side layout (default) ───────────────────────────────
  // Contact block and QR sized generously and pulled in from the edges
  // (percentage margins, not fixed px) so the whole composition reads as
  // centered on the card rather than pinned to one corner.
  const sideQrSize = 116
  const marginX = w * 0.07
  const contactW = w * 0.58
  const contactX = qrSide === 'right' ? marginX : w - contactW - marginX
  const qrX = qrSide === 'right' ? w - sideQrSize - marginX : marginX
  const blockTop = h * 0.16

  addText(canvas, f(profile, 'personName'), {
    left: contactX, top: blockTop,
    fontSize: 26, fontWeight: '800',
    fill: ink, fontFamily: 'Georgia, serif',
    width: contactW, elementType: 'personName',
    opacity: isPlaceholder(profile, 'personName') ? 0.4 : 1,
  })
  addText(canvas, f(profile, 'designation'), {
    left: contactX, top: blockTop + 36,
    fontSize: 14, fill: ink, opacity: 0.8,
    fontFamily: 'Inter, sans-serif', width: contactW,
    elementType: 'designation',
  })

  const contactTop = blockTop + 86
  let contactBottom
  if (align === 'horizontal') {
    addContactRowsHorizontal(canvas, profile, { left: contactX, top: contactTop, width: contactW, ink, accentColor, fontSize: 12 })
    contactBottom = contactTop
  } else {
    const rowGap = 32
    addContactRow(canvas, '☎', f(profile, 'phone'), { left: contactX, top: contactTop, width: contactW, ink, accentColor, elementType: 'phone', hideWhenEmpty: usesProvidedDigitalCardData(profile) })
    addContactRow(canvas, '✉', f(profile, 'email'), { left: contactX, top: contactTop + rowGap, width: contactW, ink, accentColor, elementType: 'email', hideWhenEmpty: usesProvidedDigitalCardData(profile) })
    addContactRow(canvas, '🌐', f(profile, 'website'), { left: contactX, top: contactTop + rowGap * 2, width: contactW, ink, accentColor, elementType: 'website', hideWhenEmpty: usesProvidedDigitalCardData(profile) })
    contactBottom = contactTop + rowGap * 2
  }

  // QR — opposite side from the contact block, vertically centered
  // relative to it, never dead-center on the card.
  const qrGroup = await qrLabel(sideQrSize)
  qrGroup.elementType = 'qr'
  qrGroup.set({
    left: qrX, top: (blockTop + contactBottom) / 2 - sideQrSize / 2,
    originX: 'left', originY: 'top',
  })
  canvas.add(qrGroup)

  addMotifIcon(canvas, palette, w, h, qrSide === 'right' ? 'bl' : 'br', 44)
}

// Per-template back-QR layout, mirroring the opts each template passes into
// loadBackSide above — kept in sync manually since those opts are inlined
// per-template rather than read back out of the closures.
const BACK_QR_OPTS = {
  'corp-minimal':   { qrSide: 'right', qrPosition: 'side' },
  'dark-premium':   { qrSide: 'right', qrPosition: 'side' },
  'gradient-hero':  { qrSide: 'right', qrPosition: 'side' },
  'split-diagonal': { qrSide: 'left',  qrPosition: 'side' },
  'side-column':    { qrSide: 'right', qrPosition: 'side' },
  'top-banner':     { qrSide: 'right', qrPosition: 'side' },
  'clean-white':    { qrSide: 'right', qrPosition: 'side' },
  'warm-creative':  { qrSide: 'right', qrPosition: 'side' },
  'vertical-dark':  { qrPosition: 'bottom' },
  'geo-corner':     { qrSide: 'left',  qrPosition: 'side' },
}

// Recomputes the exact spot a template's own loadBack() would place its QR
// at, using the same formulas as loadBackSide above. Lets the editor restore
// a QR to its template-curated "default place" (rather than a generic
// fallback position) after it's been removed and re-added via the QR panel.
export function computeBackQrRect(templateId, w, h) {
  const opts = BACK_QR_OPTS[templateId] || { qrSide: 'right', qrPosition: 'side' }

  if (opts.qrPosition !== 'side') {
    const stackQrSize = Math.max(w, h) < 260 ? 92 : Math.min(w * 0.34, 120)
    const contactBlockH = 34 + 30 + 34 * 3
    const gap = h * 0.05
    const blockTop = h * 0.08
    const qrTop = opts.qrPosition === 'top'
      ? h * 0.08
      : Math.min(h - stackQrSize - h * 0.06, blockTop + contactBlockH + gap)
    return { left: (w - stackQrSize) / 2, top: qrTop, size: stackQrSize }
  }

  const sideQrSize = 116
  const marginX = w * 0.07
  const qrX = opts.qrSide === 'right' ? w - sideQrSize - marginX : marginX
  const blockTop = h * 0.16
  const contactTop = blockTop + 86
  const contactBottom = contactTop + 32 * 2
  return { left: qrX, top: (blockTop + contactBottom) / 2 - sideQrSize / 2, size: sideQrSize }
}

// ════════════════════════════════════════════════════════════════
// TEMPLATE DEFINITIONS
// ════════════════════════════════════════════════════════════════

export const TEMPLATES = [

  // ── 1. Corporate Minimal ─────────────────────────────────────
  {
    id: 'corp-minimal',
    label: 'Corporate Minimal',
    category: 'corporate',
    orientation: 'horizontal',

    svgPreview(pal) {
      return `<svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg">
        <rect width="280" height="160" fill="#f8f7f3"/>
        <rect width="8" height="160" fill="${pal.primary}"/>
        <rect x="110" y="14" width="60" height="60" rx="8" fill="${pal.accent}" opacity="0.2"/>
        <text x="140" y="94" text-anchor="middle" font-size="22" font-weight="800" fill="${pal.primary}" font-family="system-ui">Company Name</text>
        <text x="140" y="114" text-anchor="middle" font-size="11" font-style="italic" fill="#888" font-family="system-ui">Your tagline here</text>
        <text x="140" y="146" text-anchor="middle" font-size="9" fill="#999" font-family="system-ui">123 Business Street, Your City</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      canvas.backgroundColor = '#f8f7f3'
      // Left accent bar
      addRect(canvas, { left: 0, top: 0, width: 8, height: h, fill: palette.primary, selectable: false, evented: false, elementType: 'accentShape' })
      // Bottom band
      addRect(canvas, { left: 0, top: h * 0.72, width: w, height: h * 0.28, fill: palette.primary, opacity: 0.07, selectable: false, evented: false })
      // Logo — large, centered, stacked above the company name (not beside
      // it) — the primary visual element.
      const logoSize = 100
      await addLogo(canvas, profile, w / 2 - logoSize / 2, h * 0.08, logoSize)
      // Company Name — centered below the logo, sized to dominate the card
      addText(canvas, f(profile, 'companyName'), {
        left: 20, top: h * 0.08 + logoSize + 14,
        fontSize: 32, fontWeight: '800',
        fill: palette.primary,
        fontFamily: 'Georgia, serif',
        textAlign: 'center',
        opacity: isPlaceholder(profile, 'companyName') ? 0.35 : 1,
        width: w - 40,
        elementType: 'companyName',
      })
      // Tagline
      addText(canvas, f(profile, 'tagline'), {
        left: 20, top: h * 0.08 + logoSize + 56,
        fontSize: 14, fontStyle: 'italic',
        fill: '#888',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        opacity: 0.78,
        width: w - 40,
        elementType: 'tagline',
      })
      // Address — bottom center, with a pin icon, clearly legible
      addAddressFooter(canvas, profile, w, h, { ink: palette.primary, fontSize: 14 })
      addMotifIcon(canvas, palette, w, h, 'bl', 44)
    },

    async loadBack(canvas, profile, palette, w, h) {
      // Reverted from align:'horizontal' — splitting a ~58%-width column
      // into three side-by-side chips left each one only ~47px for text,
      // nowhere near enough for a phone number or email address, so they
      // wrapped and overlapped the name/QR above. Vertical stacking (the
      // layout every other template already uses successfully) actually fits.
      await loadBackSide(canvas, profile, palette, w, h, {
        bg: '#f8f7f3', ink: palette.primary, accentColor: palette.accent, qrSide: 'right', accentShape: 'circle',
      })
    },
  },

  // ── 2. Dark Premium ──────────────────────────────────────────
  {
    id: 'dark-premium',
    label: 'Dark Premium',
    category: 'premium',
    orientation: 'horizontal',

    svgPreview(pal) {
      return `<svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg">
        <rect width="280" height="160" fill="#0d1117"/>
        <rect x="0" y="0" width="280" height="160" fill="url(#g1)" opacity="0.4"/>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="280" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="${pal.primary}" stop-opacity="0.6"/>
            <stop offset="1" stop-color="#0d1117" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <circle cx="240" cy="20" r="60" fill="${pal.accent}" opacity="0.07"/>
        <circle cx="240" cy="20" r="40" fill="${pal.accent}" opacity="0.07"/>
        <text x="20" y="66" font-size="24" font-weight="800" fill="#fff" font-family="system-ui">Company Name</text>
        <text x="20" y="86" font-size="11" font-style="italic" fill="${pal.accent}" font-family="system-ui">Your tagline here</text>
        <text x="20" y="144" font-size="8" fill="#aaa" font-family="system-ui">123 Business Street, Your City</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      // Dark background
      addRect(canvas, {
        left: 0, top: 0, width: w, height: h,
        fill: '#0d1117',
        selectable: false, evented: false,
      })
      // Gradient overlay
      const grad = linearGrad(canvas, 0, 0, w * 0.7, h, palette.primary + '99', '#00000000')
      addRect(canvas, { left: 0, top: 0, width: w, height: h, fill: grad, selectable: false, evented: false, elementType: 'accentShape' })
      // Corner circles
      addCircle(canvas, { left: w - 90, top: -40, radius: 90, fill: palette.accent, opacity: 0.07, selectable: false, evented: false })
      addCircle(canvas, { left: w - 60, top: -20, radius: 60, fill: palette.accent, opacity: 0.07, selectable: false, evented: false })
      // Premium accent — thin gold/accent rule down the full left edge
      addRect(canvas, { left: 0, top: 0, width: 3, height: h, fill: palette.accent, opacity: 0.8, selectable: false, evented: false })
      // Logo — pulled in from the edge toward center, the primary visual element
      const indent = w * 0.14
      await addLogo(canvas, profile, indent, h * 0.12, 82)
      // Company Name
      addText(canvas, f(profile, 'companyName'), {
        left: indent, top: h * 0.12 + 92,
        fontSize: 32, fontWeight: '800',
        fill: '#ffffff',
        fontFamily: 'Georgia, serif',
        opacity: isPlaceholder(profile, 'companyName') ? 0.35 : 1,
        width: w - indent - 20,
        elementType: 'companyName',
      })
      // Tagline
      addText(canvas, f(profile, 'tagline'), {
        left: indent, top: h * 0.12 + 134,
        fontSize: 14, fontStyle: 'italic',
        fill: palette.accent,
        fontFamily: 'Inter, sans-serif',
        width: w - indent - 20,
        opacity: 0.85,
        elementType: 'tagline',
      })
      // Address — bottom center, with a pin icon, clearly legible
      addAddressFooter(canvas, profile, w, h, { ink: '#ffffff', fontSize: 14 })
      addMotifIcon(canvas, palette, w, h, 'br', 44)
    },

    async loadBack(canvas, profile, palette, w, h) {
      await loadBackSide(canvas, profile, palette, w, h, {
        bg: '#0d1117', ink: '#ffffff', accentColor: palette.accent, qrSide: 'right', accentShape: 'circle',
      })
    },
  },

  // ── 3. Gradient Hero ─────────────────────────────────────────
  {
    id: 'gradient-hero',
    label: 'Gradient Hero',
    category: 'creative',
    orientation: 'horizontal',

    svgPreview(pal) {
      return `<svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gh" x1="0" y1="0" x2="280" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="${pal.primary}"/>
            <stop offset="1" stop-color="${pal.accent}"/>
          </linearGradient>
        </defs>
        <rect width="280" height="160" fill="url(#gh)"/>
        <circle cx="260" cy="150" r="80" fill="#fff" opacity="0.05"/>
        <circle cx="260" cy="150" r="50" fill="#fff" opacity="0.05"/>
        <text x="140" y="60" text-anchor="middle" font-size="24" font-weight="800" fill="#fff" font-family="system-ui">Company Name</text>
        <text x="140" y="80" text-anchor="middle" font-size="11" font-style="italic" fill="rgba(255,255,255,0.75)" font-family="system-ui">Your tagline here</text>
        <text x="140" y="145" text-anchor="middle" font-size="8" fill="rgba(255,255,255,0.7)" font-family="system-ui">123 Business Street, Your City</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      // Gradient background rect
      const grad = linearGrad(canvas, 0, 0, w, h, palette.primary, palette.accent)
      addRect(canvas, { left: 0, top: 0, width: w, height: h, fill: grad, selectable: false, evented: false, elementType: 'accentShape' })
      // Decorative circles
      addCircle(canvas, { left: w - 60, top: h - 60, radius: 110, fill: '#ffffff', opacity: 0.05, selectable: false, evented: false })
      addCircle(canvas, { left: w - 30, top: h - 30, radius: 70, fill: '#ffffff', opacity: 0.05, selectable: false, evented: false })
      // Logo — large, centered top, the primary visual element
      const logoSize = 78
      await addLogo(canvas, profile, w / 2 - logoSize / 2, h * 0.10, logoSize)
      // Company Name — centered below the logo
      addText(canvas, f(profile, 'companyName'), {
        left: 20, top: h * 0.10 + logoSize + 14,
        fontSize: 27, fontWeight: '800',
        fill: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        opacity: isPlaceholder(profile, 'companyName') ? 0.4 : 1,
        width: w - 40, textAlign: 'center',
        elementType: 'companyName',
      })
      // Tagline
      addText(canvas, f(profile, 'tagline'), {
        left: 20, top: h * 0.10 + logoSize + 50,
        fontSize: 13, fontStyle: 'italic',
        fill: 'rgba(255,255,255,0.85)',
        fontFamily: 'Inter, sans-serif',
        width: w - 40, textAlign: 'center',
        elementType: 'tagline',
      })
      // Address — bottom center, with a pin icon, clearly legible
      addAddressFooter(canvas, profile, w, h, { ink: '#ffffff', fontSize: 14 })
      addMotifIcon(canvas, palette, w, h, 'br', 44)
    },

    async loadBack(canvas, profile, palette, w, h) {
      await loadBackSide(canvas, profile, palette, w, h, {
        bg: palette.primary, ink: '#ffffff', accentColor: palette.accent, qrSide: 'right', accentShape: 'circle',
      })
    },
  },

  // ── 4. Split Diagonal ────────────────────────────────────────
  {
    id: 'split-diagonal',
    label: 'Split Diagonal',
    category: 'modern',
    orientation: 'horizontal',

    svgPreview(pal) {
      return `<svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg">
        <rect width="280" height="160" fill="#fff"/>
        <polygon points="0,0 185,0 130,160 0,160" fill="${pal.primary}"/>
        <text x="18" y="66" font-size="17" font-weight="800" fill="#fff" font-family="system-ui">Company</text>
        <text x="18" y="84" font-size="9.5" font-style="italic" fill="rgba(255,255,255,0.75)" font-family="system-ui">Your tagline</text>
        <text x="164" y="130" font-size="7.5" fill="#888" font-family="system-ui">123 Business St, City</text>
        <rect x="210" y="118" width="50" height="4" rx="2" fill="${pal.accent}"/>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      canvas.backgroundColor = '#ffffff'
      // Dark diagonal left panel — widened to cover more of the card, but
      // stopped short of the very bottom edge so the address band (now
      // centered across the full card width, like every other template)
      // always lands on the plain white background instead of straddling
      // both colors.
      const panelBottom = h * 0.84
      const poly = new Polygon(
        [{ x: 0, y: 0 }, { x: w * 0.66, y: 0 }, { x: w * 0.54, y: panelBottom }, { x: 0, y: panelBottom }],
        { fill: palette.primary, selectable: false, evented: false, elementType: 'accentShape' }
      )
      canvas.add(poly)
      // Accent stripe on right
      addRect(canvas, { left: w - 6, top: 0, width: 6, height: h, fill: palette.accent, selectable: false, evented: false })
      // Logo — large, dark side, the primary visual element
      const logoSize = 86
      await addLogo(canvas, profile, 20, h * 0.11, logoSize)
      // Company Name on dark side
      // The diagonal boundary runs from x=0.66w (top) to x=0.54w (bottom), so
      // the safe left-zone width must clear the boundary's narrowest point
      // (bottom, 0.54w) with margin, not just its top.
      addText(canvas, f(profile, 'companyName'), {
        left: 20, top: h * 0.11 + logoSize + 12,
        fontSize: 27, fontWeight: '800',
        fill: '#ffffff',
        fontFamily: 'Georgia, serif',
        width: w * 0.48,
        opacity: isPlaceholder(profile, 'companyName') ? 0.4 : 1,
        elementType: 'companyName',
      })
      addText(canvas, f(profile, 'tagline'), {
        left: 20, top: h * 0.11 + logoSize + 50,
        fontSize: 13, fontStyle: 'italic',
        fill: 'rgba(255,255,255,0.8)',
        fontFamily: 'Inter, sans-serif', width: w * 0.48,
        elementType: 'tagline',
      })
      // Address — bottom center, with a pin icon, clearly legible
      addAddressFooter(canvas, profile, w, h, { ink: palette.primary, fontSize: 14 })
      addMotifIcon(canvas, palette, w, h, 'br', 36)
    },

    async loadBack(canvas, profile, palette, w, h) {
      await loadBackSide(canvas, profile, palette, w, h, {
        bg: '#ffffff', ink: palette.primary, accentColor: palette.accent, qrSide: 'left', accentShape: 'circle',
      })
    },
  },

  // ── 5. Side Column ───────────────────────────────────────────
  {
    id: 'side-column',
    label: 'Side Column',
    category: 'corporate',
    orientation: 'horizontal',

    svgPreview(pal) {
      return `<svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg">
        <rect width="280" height="160" fill="#fff"/>
        <rect width="98" height="160" fill="${pal.primary}"/>
        <text x="49" y="56" font-size="9" fill="rgba(255,255,255,0.8)" text-anchor="middle" font-family="system-ui" font-weight="700">LOGO</text>
        <text x="118" y="52" font-size="20" font-weight="800" fill="${pal.primary}" font-family="system-ui">Company Name</text>
        <text x="118" y="70" font-size="10.5" font-style="italic" fill="#888" font-family="system-ui">Your tagline here</text>
        <text x="118" y="132" font-size="8" fill="#999" font-family="system-ui">123 Business St, Your City</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      canvas.backgroundColor = '#ffffff'
      const colW = w * 0.42
      // Left column — widened to be the card's dominant visual block, but
      // stopped short of the very bottom so the address band (centered
      // across the full card width, like every other template) always
      // lands on the plain white background.
      const colH = h * 0.84
      addRect(canvas, { left: 0, top: 0, width: colW, height: colH, fill: palette.primary, selectable: false, evented: false, elementType: 'accentShape' })
      // Logo — large, centered in the column, the primary visual element
      const logoSize = 96
      await addLogo(canvas, profile, (colW - logoSize) / 2, colH / 2 - logoSize / 2, logoSize)
      // Right zone: Company Name, Tagline, Address — grouped vertically
      const rx = colW + 18
      const rw = w - rx - 12
      addText(canvas, f(profile, 'companyName'), {
        left: rx, top: h * 0.26,
        fontSize: 28, fontWeight: '800',
        fill: palette.primary,
        fontFamily: 'Georgia, serif', width: rw,
        opacity: isPlaceholder(profile, 'companyName') ? 0.4 : 1,
        elementType: 'companyName',
      })
      addText(canvas, f(profile, 'tagline'), {
        left: rx, top: h * 0.26 + 42,
        fontSize: 14, fontStyle: 'italic',
        fill: '#888',
        fontFamily: 'Inter, sans-serif', width: rw, opacity: 0.78,
        elementType: 'tagline',
      })
      addLine(canvas, [rx, h * 0.68, w - 10, h * 0.68], { stroke: palette.primary, strokeWidth: 0.7, opacity: 0.2, selectable: false, evented: false })
      // Address — bottom center, with a pin icon, clearly legible
      addAddressFooter(canvas, profile, w, h, { ink: palette.primary, fontSize: 14 })
      addMotifIcon(canvas, palette, w, h, 'br')
    },

    async loadBack(canvas, profile, palette, w, h) {
      await loadBackSide(canvas, profile, palette, w, h, {
        bg: '#ffffff', ink: palette.primary, accentColor: palette.accent, qrSide: 'right', accentShape: 'lines',
      })
    },
  },

  // ── 6. Top Banner ────────────────────────────────────────────
  {
    id: 'top-banner',
    label: 'Top Banner',
    category: 'modern',
    orientation: 'horizontal',

    svgPreview(pal) {
      return `<svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg">
        <rect width="280" height="160" fill="#fff"/>
        <rect width="280" height="92" fill="${pal.primary}"/>
        <text x="20" y="50" font-size="24" font-weight="800" fill="#fff" font-family="system-ui">Company Name</text>
        <rect x="206" y="20" width="56" height="52" rx="8" fill="rgba(255,255,255,0.15)"/>
        <text x="234" y="50" font-size="10" fill="rgba(255,255,255,0.8)" text-anchor="middle" font-family="system-ui" font-weight="700">LOGO</text>
        <text x="20" y="120" font-size="12" font-style="italic" fill="#888" font-family="system-ui">Your tagline here</text>
        <text x="20" y="144" font-size="8" fill="#999" font-family="system-ui">123 Business Street, Your City</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      canvas.backgroundColor = '#ffffff'
      const bannerH = h * 0.5
      const logoSize = 62
      // Top banner — holds company name (left) + logo (right), the
      // dominant brand elements, now covering half the card.
      addRect(canvas, { left: 0, top: 0, width: w, height: bannerH, fill: palette.primary, selectable: false, evented: false, elementType: 'accentShape' })
      await addLogo(canvas, profile, w - logoSize - 20, (bannerH - logoSize) / 2, logoSize)
      addText(canvas, f(profile, 'companyName'), {
        left: 20, top: bannerH / 2 - 18,
        fontSize: 25, fontWeight: '800',
        fill: '#ffffff',
        fontFamily: 'Georgia, serif',
        width: w - logoSize - 60,
        opacity: isPlaceholder(profile, 'companyName') ? 0.4 : 1,
        elementType: 'companyName',
      })
      // Tagline — below the banner
      addText(canvas, f(profile, 'tagline'), {
        left: 20, top: bannerH + 20,
        fontSize: 13, fontStyle: 'italic',
        fill: '#888',
        fontFamily: 'Inter, sans-serif',
        width: w - 40, opacity: 0.78,
        elementType: 'tagline',
      })
      // Accent underline
      addRect(canvas, { left: 20, top: bannerH + 54, width: 50, height: 3, rx: 1.5, fill: palette.accent, selectable: false, evented: false })
      // Address — bottom center, with a pin icon, clearly legible
      addAddressFooter(canvas, profile, w, h, { ink: palette.primary, fontSize: 14 })
      addMotifIcon(canvas, palette, w, h, 'br', 36)
    },

    async loadBack(canvas, profile, palette, w, h) {
      await loadBackSide(canvas, profile, palette, w, h, {
        bg: '#ffffff', ink: palette.primary, accentColor: palette.accent, qrSide: 'right', accentShape: 'circle',
      })
    },
  },

  // ── 7. Clean White ────────────────────────────────────────────
  {
    id: 'clean-white',
    label: 'Clean White',
    category: 'minimal',
    orientation: 'horizontal',

    svgPreview(pal) {
      return `<svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg">
        <rect width="280" height="160" fill="#fff"/>
        <rect x="20" y="20" width="4" height="70" rx="2" fill="${pal.accent}"/>
        <text x="34" y="48" font-size="23" font-weight="800" fill="${pal.primary}" font-family="system-ui">Company Name</text>
        <text x="34" y="72" font-size="11" font-style="italic" fill="#888" font-family="system-ui">Your tagline here</text>
        <text x="20" y="144" font-size="8" fill="#999" font-family="system-ui">123 Business Street, Your City</text>
        <rect x="196" y="16" width="66" height="66" rx="10" fill="${pal.primary}" opacity="0.06"/>
        <text x="229" y="53" font-size="11" fill="${pal.primary}" opacity="0.4" text-anchor="middle" font-family="system-ui" font-weight="700">LOGO</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      // Subtle grey instead of stark white — reads as intentionally
      // designed rather than unstyled text on a blank page.
      canvas.backgroundColor = '#f8f8f8'
      addRect(canvas, { left: 20, top: h * 0.88, width: w - 40, height: 1, fill: palette.primary, opacity: 0.1, selectable: false, evented: false })
      // Full-height colored stripe on the very left edge
      addRect(canvas, { left: 0, top: 0, width: 4, height: h, fill: palette.primary, selectable: false, evented: false, elementType: 'accentShape' })
      // Logo — large, top-right, the primary visual element
      await addLogo(canvas, profile, w - 96, h * 0.16, 78)
      // Company Name — good margin clear of the left stripe
      addText(canvas, f(profile, 'companyName'), {
        left: 36, top: h * 0.16 + 4,
        fontSize: 27, fontWeight: '800',
        fill: palette.primary,
        fontFamily: 'Georgia, serif',
        opacity: isPlaceholder(profile, 'companyName') ? 0.35 : 1,
        width: w - 150,
        elementType: 'companyName',
      })
      addText(canvas, f(profile, 'tagline'), {
        left: 36, top: h * 0.16 + 42, fontSize: 13, fontStyle: 'italic', fill: '#888',
        fontFamily: 'Inter, sans-serif', width: w - 150, opacity: 0.78,
        elementType: 'tagline',
      })
      // Address — bottom center, with a pin icon, clearly legible
      addAddressFooter(canvas, profile, w, h, { ink: palette.primary, fontSize: 14 })
      addMotifIcon(canvas, palette, w, h, 'br')
    },

    async loadBack(canvas, profile, palette, w, h) {
      await loadBackSide(canvas, profile, palette, w, h, {
        bg: '#f8f8f8', ink: palette.primary, accentColor: palette.accent, qrSide: 'right', accentShape: 'circle',
      })
    },
  },

  // ── 8. Warm Creative ─────────────────────────────────────────
  {
    id: 'warm-creative',
    label: 'Warm Creative',
    category: 'creative',
    orientation: 'horizontal',

    svgPreview() {
      return `<svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="wc" x1="0" y1="0" x2="280" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#d1495b"/>
            <stop offset="1" stop-color="#f4a261"/>
          </linearGradient>
        </defs>
        <rect width="280" height="160" fill="url(#wc)"/>
        <circle cx="0" cy="160" r="80" fill="#fff" opacity="0.07"/>
        <circle cx="280" cy="0" r="60" fill="#fff" opacity="0.07"/>
        <text x="20" y="64" font-size="24" font-weight="800" fill="#fff" font-family="system-ui">Company Name</text>
        <text x="20" y="86" font-size="12" font-style="italic" fill="rgba(255,255,255,0.8)" font-family="system-ui">Your tagline here</text>
        <text x="20" y="144" font-size="8" fill="rgba(255,255,255,0.65)" font-family="system-ui">123 Business Street, Your City</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      const grad = linearGrad(canvas, 0, 0, w, h, '#d1495b', '#f4a261')
      addRect(canvas, { left: 0, top: 0, width: w, height: h, fill: grad, selectable: false, evented: false, elementType: 'accentShape' })
      // Large contrasting circle, top-right, partially off-card
      addCircle(canvas, { left: w - h * 0.5, top: -h * 0.45, radius: h * 0.6, fill: palette.accent, opacity: 0.25, selectable: false, evented: false })
      addCircle(canvas, { left: -40, top: h - 40, radius: 110, fill: '#ffffff', opacity: 0.07, selectable: false, evented: false })
      // Logo — large, top-left, the dominant visual element
      await addLogo(canvas, profile, 20, h * 0.12, 78)
      addText(canvas, f(profile, 'companyName'), {
        left: 20, top: h * 0.12 + 90,
        fontSize: 27, fontWeight: '800', fill: '#ffffff',
        fontFamily: 'Poppins, sans-serif',
        opacity: isPlaceholder(profile, 'companyName') ? 0.4 : 1,
        width: w - 40,
        elementType: 'companyName',
      })
      addText(canvas, f(profile, 'tagline'), {
        left: 20, top: h * 0.12 + 128, fontSize: 13, fontStyle: 'italic', fill: 'rgba(255,255,255,0.85)',
        fontFamily: 'Inter, sans-serif', width: w - 40, opacity: 0.8,
        elementType: 'tagline',
      })
      // Address — bottom center, with a pin icon, clearly legible
      addAddressFooter(canvas, profile, w, h, { ink: '#ffffff', fontSize: 14 })
      addMotifIcon(canvas, palette, w, h, 'br', 40)
    },

    async loadBack(canvas, profile, palette, w, h) {
      await loadBackSide(canvas, profile, palette, w, h, {
        bg: '#fff6f2', ink: '#3a1f1f', accentColor: palette.accent, qrSide: 'right', accentShape: 'circle',
      })
    },
  },

  // ── 9. Vertical Card ─────────────────────────────────────────
  {
    id: 'vertical-dark',
    label: 'Vertical Dark',
    category: 'premium',
    orientation: 'vertical',

    svgPreview(pal) {
      return `<svg viewBox="0 0 160 280" xmlns="http://www.w3.org/2000/svg">
        <rect width="160" height="280" fill="${pal.primary}"/>
        <rect y="200" width="160" height="80" fill="${pal.accent}" opacity="0.18"/>
        <circle cx="80" cy="90" r="56" fill="rgba(255,255,255,0.08)"/>
        <text x="80" y="96" font-size="12" fill="rgba(255,255,255,0.4)" text-anchor="middle" font-family="system-ui">LOGO</text>
        <text x="80" y="176" font-size="17" font-weight="800" fill="#fff" text-anchor="middle" font-family="system-ui">Company Name</text>
        <text x="80" y="196" font-size="10" font-style="italic" fill="${pal.accent}" text-anchor="middle" font-family="system-ui">Your tagline here</text>
        <line x1="30" y1="212" x2="130" y2="212" stroke="${pal.accent}" stroke-width="0.8" opacity="0.4"/>
        <text x="80" y="260" font-size="8" fill="rgba(255,255,255,0.55)" text-anchor="middle" font-family="system-ui">123 Business Street, City</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      addRect(canvas, { left: 0, top: 0, width: w, height: h, fill: palette.primary, selectable: false, evented: false, elementType: 'accentShape' })
      // Tinted footer band. A translucent accent-colour fill here blends
      // with the dark navy background and can read as a muddy olive/brown
      // depending on the accent hue — a flat, palette-agnostic white tint
      // reads as a clean, intentional dark shade regardless of accent color.
      addRect(canvas, { left: 0, top: h * 0.36, width: w, height: h * 0.64, fill: 'rgba(255,255,255,0.05)', selectable: false, evented: false })
      // Large circular logo placeholder, top-center — the primary visual,
      // enlarged and the whole block spread out (bigger gaps, bigger type)
      // so it actually fills the tinted band instead of clustering at the
      // top and leaving the rest of the band empty.
      const circleR = 76
      const circleTop = h * 0.08
      addCircle(canvas, { left: w / 2 - circleR, top: circleTop, radius: circleR, fill: 'rgba(255,255,255,0.08)', selectable: false, evented: false })
      const logoSize = 108
      await addLogo(canvas, profile, w / 2 - logoSize / 2, circleTop + circleR - logoSize / 2, logoSize)
      addText(canvas, f(profile, 'companyName'), {
        left: 10, top: circleTop + circleR * 2 + 28,
        fontSize: 30, fontWeight: '800', fill: '#ffffff',
        fontFamily: 'Georgia, serif', textAlign: 'center', width: w - 20,
        opacity: isPlaceholder(profile, 'companyName') ? 0.4 : 1,
        elementType: 'companyName',
      })
      addText(canvas, f(profile, 'tagline'), {
        left: 10, top: circleTop + circleR * 2 + 70, fontSize: 15, fontStyle: 'italic',
        fill: palette.accent, textAlign: 'center', opacity: 0.85,
        fontFamily: 'Inter, sans-serif', width: w - 20,
        elementType: 'tagline',
      })
      // Short fixed-width accent divider below the tagline
      addLine(canvas, [w / 2 - 30, circleTop + circleR * 2 + 100, w / 2 + 30, circleTop + circleR * 2 + 100], { stroke: palette.accent, strokeWidth: 0.8, opacity: 0.4, selectable: false, evented: false })
      // Address — bottom center, with a pin icon, clearly legible
      addAddressFooter(canvas, profile, w, h, { ink: '#ffffff', fontSize: 16 })
      addMotifIcon(canvas, palette, w, h, 'br', 36)
    },

    async loadBack(canvas, profile, palette, w, h) {
      // Vertical orientation has no room for the default side-by-side back
      // layout — details stacked on top, QR centered near the bottom.
      await loadBackSide(canvas, profile, palette, w, h, {
        bg: palette.primary, ink: '#ffffff', accentColor: palette.accent, accentShape: 'lines', qrPosition: 'bottom',
      })
    },
  },

  // ── 10. Geo Corner ───────────────────────────────────────────
  {
    id: 'geo-corner',
    label: 'Geo Corner',
    category: 'modern',
    orientation: 'horizontal',

    svgPreview(pal) {
      return `<svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg">
        <rect width="280" height="160" fill="#fff"/>
        <polygon points="0,0 129,0 0,144" fill="${pal.primary}"/>
        <polygon points="280,160 101,160 280,22" fill="${pal.accent}" opacity="0.85"/>
        <polygon points="280,160 280,77 162,160" fill="${pal.primary}" opacity="0.55"/>
        <text x="129" y="97" font-size="20" font-weight="800" fill="${pal.primary}" font-family="system-ui">Company Name</text>
        <text x="129" y="112" font-size="10" font-style="italic" fill="#888" font-family="system-ui">Your tagline here</text>
        <text x="80" y="127" font-size="8" fill="${pal.primary}" font-family="system-ui">123 Business Street, Your City</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      canvas.backgroundColor = '#ffffff'
      // Top-left triangle.
      const tl = new Polygon([{ x: 0, y: 0 }, { x: w * 0.46, y: 0 }, { x: 0, y: h * 0.9 }], { fill: palette.primary, selectable: false, evented: false, elementType: 'accentShape' })
      canvas.add(tl)
      // Bottom-right shapes now run all the way to the card's true bottom
      // edge (and right edge) — no blank white strip left underneath them.
      const br1 = new Polygon([{ x: w, y: h }, { x: w * 0.36, y: h }, { x: w, y: h * 0.14 }], { fill: palette.accent, opacity: 0.85, selectable: false, evented: false })
      canvas.add(br1)
      const br2 = new Polygon([{ x: w, y: h }, { x: w, y: h * 0.48 }, { x: w * 0.58, y: h }], { fill: palette.primary, opacity: 0.55, selectable: false, evented: false })
      canvas.add(br2)
      // Logo — sized to ~40% of the card's shorter side so it actually
      // reads as the dominant visual element instead of a tiny badge, and
      // pulled inward from the corner toward the middle of the triangle
      // (both horizontally and vertically) rather than flush against the
      // top-left edges. Part of it now sits past the triangle's diagonal
      // edge onto the white background, which is fine — the logo box
      // itself is white, so it blends in seamlessly there.
      const logoSize = h * 0.4
      await addLogo(canvas, profile, w * 0.10, h * 0.13, logoSize)
      // Company Name — in the white gap between the two shapes, roughly
      // centered rather than pinned to either edge. fontSize/width chosen
      // so "Company Name" fits on one line — the previous width (w*0.38)
      // was too narrow at fontSize 28, so it wrapped to two lines and ran
      // straight into the tagline below it.
      const nameTop = h * 0.34
      addText(canvas, f(profile, 'companyName'), {
        left: w * 0.46, top: nameTop,
        fontSize: 24, fontWeight: '800', fill: palette.primary,
        fontFamily: 'Georgia, serif',
        opacity: isPlaceholder(profile, 'companyName') ? 0.35 : 1,
        width: w * 0.42,
        elementType: 'companyName',
      })
      addText(canvas, f(profile, 'tagline'), {
        left: w * 0.46, top: nameTop + 34, fontSize: 13, fontStyle: 'italic', fill: '#888',
        fontFamily: 'Inter, sans-serif', width: w * 0.42, opacity: 0.78,
        elementType: 'tagline',
      })
      // Address — sits directly over the accent band (dark ink stays
      // legible on both the white background and the accent color), no
      // white footer strip reserved beneath the shapes anymore.
      addAddressFooter(canvas, profile, w, h, { ink: palette.primary, fontSize: 14 })
      addMotifIcon(canvas, palette, w, h, 'tr', 28)
    },

    async loadBack(canvas, profile, palette, w, h) {
      await loadBackSide(canvas, profile, palette, w, h, {
        bg: '#ffffff', ink: palette.primary, accentColor: palette.accent, qrSide: 'left', accentShape: 'circle',
      })
    },
  },
]

export const TEMPLATE_CATEGORIES = [
  { key: 'all',       label: 'All Templates' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'modern',    label: 'Modern' },
  { key: 'creative',  label: 'Creative' },
  { key: 'minimal',   label: 'Minimal' },
  { key: 'premium',   label: 'Premium' },
]

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0]
}
