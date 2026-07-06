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
  Textbox, Rect, Circle, Triangle, Line, FabricImage, Gradient, Polygon,
} from 'fabric'

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
const PH = {
  personName:  'Your Name',
  designation: 'Your Title',
  companyName: 'Company Name',
  phone:       '+91 XXXXX XXXXX',
  email:       'email@example.com',
  website:     'www.example.com',
  location:    'Your City',
  tagline:     'Professional tagline here',
}

function f(profile, key) {
  return profile[key] || PH[key] || ''
}

function isPlaceholder(profile, key) {
  return !profile[key]
}

// ── Palette helpers ──────────────────────────────────────────────
export function getPalette(profile) {
  const tc = profile.themeColors || []
  return {
    primary: tc[0] || '#1f2d3d',
    accent:  tc[1] || '#c9a24b',
    text:    '#ffffff',
    textDark:'#1a1a1a',
  }
}

// ── Fabric helpers ───────────────────────────────────────────────
// All templates author `left`/`top` as a top-left anchor (the convention
// Fabric used before v6). Fabric 7's default origin is 'center', so every
// object must explicitly opt back into 'left'/'top' or it renders shifted
// by half its own width/height — usually off-canvas.
function addText(canvas, text, opts = {}) {
  const t = new Textbox(text, {
    selectable: true,
    editable: true,
    originX: 'left',
    originY: 'top',
    ...opts,
  })
  canvas.add(t)
  return t
}

function addRect(canvas, opts = {}) {
  const r = new Rect({ selectable: true, originX: 'left', originY: 'top', ...opts })
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

async function addLogo(canvas, profile, x, y, size) {
  const src = profile.logo || profile.logoSource
  if (!src) return
  try {
    const img = await FabricImage.fromURL(src, { crossOrigin: 'anonymous' })
    img.scaleToWidth(size)
    if (img.getScaledHeight() > size) img.scaleToHeight(size)
    img.set({ left: x, top: y, selectable: true, originX: 'left', originY: 'top' })
    canvas.add(img)
  } catch (_) {}
}

// ── Contact line helper ──────────────────────────────────────────
function contactLine(profile, fillColor) {
  const parts = [
    f(profile, 'phone'),
    f(profile, 'email'),
    f(profile, 'website'),
  ].filter(Boolean)
  return { text: parts.join('  ·  '), fill: fillColor }
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
        <rect width="6" height="160" fill="${pal.primary}"/>
        <rect y="118" width="280" height="42" fill="${pal.primary}" opacity="0.07"/>
        <text x="20" y="42" font-size="16" font-weight="800" fill="${pal.primary}" font-family="system-ui">Your Name</text>
        <text x="20" y="59" font-size="9" fill="#888" font-family="system-ui">Your Title · Company Name</text>
        <line x1="20" y1="71" x2="180" y2="71" stroke="${pal.primary}" stroke-width="0.7" opacity="0.25"/>
        <text x="20" y="87" font-size="7.5" fill="#999" font-family="system-ui">+91 XXXXX XXXXX</text>
        <text x="20" y="98" font-size="7.5" fill="#999" font-family="system-ui">email@example.com</text>
        <text x="20" y="109" font-size="7.5" fill="#999" font-family="system-ui">www.example.com</text>
        <rect x="218" y="20" width="48" height="36" rx="5" fill="${pal.accent}" opacity="0.15"/>
        <text x="242" y="43" font-size="11" font-weight="800" fill="${pal.accent}" text-anchor="middle" font-family="system-ui">LOGO</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      canvas.backgroundColor = '#f8f7f3'
      // Left accent bar
      addRect(canvas, { left: 0, top: 0, width: 6, height: h, fill: palette.primary, selectable: false, evented: false })
      // Bottom band
      addRect(canvas, { left: 0, top: h * 0.76, width: w, height: h * 0.24, fill: palette.primary, opacity: 0.06, selectable: false, evented: false })
      // Logo
      await addLogo(canvas, profile, w - 100, 20, 70)
      // Name
      addText(canvas, f(profile, 'personName'), {
        left: 20, top: 28,
        fontSize: 26, fontWeight: '800',
        fill: palette.primary,
        fontFamily: 'Georgia, serif',
        opacity: isPlaceholder(profile, 'personName') ? 0.35 : 1,
        width: w - 130,
      })
      // Designation + Company
      addText(canvas, `${f(profile, 'designation')} · ${f(profile, 'companyName')}`, {
        left: 20, top: 62,
        fontSize: 11, fontWeight: '500',
        fill: '#888',
        fontFamily: 'Inter, sans-serif',
        width: w - 120,
        opacity: (isPlaceholder(profile, 'designation') && isPlaceholder(profile, 'companyName')) ? 0.4 : 0.75,
      })
      // Separator
      addLine(canvas, [20, 82, w * 0.62, 82], { stroke: palette.primary, strokeWidth: 0.8, opacity: 0.25, selectable: false, evented: false })
      // Contact
      addText(canvas, f(profile, 'phone'), { left: 20, top: 92, fontSize: 10, fill: '#666', fontFamily: 'Inter, sans-serif', width: w - 30, opacity: 0.8 })
      addText(canvas, f(profile, 'email'), { left: 20, top: 108, fontSize: 10, fill: '#666', fontFamily: 'Inter, sans-serif', width: w - 30, opacity: 0.8 })
      addText(canvas, f(profile, 'website'), { left: 20, top: 124, fontSize: 10, fill: palette.primary, fontFamily: 'Inter, sans-serif', width: w - 30, opacity: 0.8 })
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
        <text x="20" y="52" font-size="18" font-weight="800" fill="#fff" font-family="system-ui">Your Name</text>
        <text x="20" y="68" font-size="9" fill="${pal.accent}" font-family="system-ui" font-weight="600">YOUR TITLE · COMPANY</text>
        <line x1="20" y1="82" x2="200" y2="82" stroke="${pal.accent}" stroke-width="0.8" opacity="0.4"/>
        <text x="20" y="98" font-size="7.5" fill="#aaa" font-family="system-ui">+91 XXXXX XXXXX  ·  email@example.com</text>
        <text x="20" y="112" font-size="7.5" fill="#aaa" font-family="system-ui">www.example.com</text>
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
      addRect(canvas, { left: 0, top: 0, width: w, height: h, fill: grad, selectable: false, evented: false })
      // Corner circles
      addCircle(canvas, { left: w - 90, top: -40, radius: 90, fill: palette.accent, opacity: 0.07, selectable: false, evented: false })
      addCircle(canvas, { left: w - 60, top: -20, radius: 60, fill: palette.accent, opacity: 0.07, selectable: false, evented: false })
      // Logo
      await addLogo(canvas, profile, w - 100, 20, 60)
      // Name
      addText(canvas, f(profile, 'personName'), {
        left: 20, top: h * 0.26,
        fontSize: 28, fontWeight: '800',
        fill: '#ffffff',
        fontFamily: 'Georgia, serif',
        opacity: isPlaceholder(profile, 'personName') ? 0.35 : 1,
        width: w - 130,
      })
      // Title
      addText(canvas, `${f(profile, 'designation').toUpperCase()} · ${f(profile, 'companyName').toUpperCase()}`, {
        left: 20, top: h * 0.5,
        fontSize: 9, fontWeight: '700',
        fill: palette.accent,
        charSpacing: 80,
        fontFamily: 'Inter, sans-serif',
        width: w - 30,
        opacity: 0.9,
      })
      // Separator
      addLine(canvas, [20, h * 0.61, w * 0.75, h * 0.61], { stroke: palette.accent, strokeWidth: 0.8, opacity: 0.4, selectable: false, evented: false })
      // Contact
      addText(canvas, `${f(profile, 'phone')}  ·  ${f(profile, 'email')}`, {
        left: 20, top: h * 0.65,
        fontSize: 9, fill: '#aaaaaa',
        fontFamily: 'Inter, sans-serif',
        width: w - 30,
      })
      addText(canvas, f(profile, 'website'), {
        left: 20, top: h * 0.78,
        fontSize: 9, fill: '#aaaaaa',
        fontFamily: 'Inter, sans-serif',
        width: w - 30,
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
        <text x="20" y="48" font-size="18" font-weight="800" fill="#fff" font-family="system-ui">Your Name</text>
        <text x="20" y="64" font-size="9" fill="rgba(255,255,255,0.75)" font-family="system-ui">Your Title · Company Name</text>
        <line x1="20" y1="78" x2="160" y2="78" stroke="#fff" stroke-width="0.8" opacity="0.3"/>
        <text x="20" y="94" font-size="7.5" fill="rgba(255,255,255,0.7)" font-family="system-ui">+91 XXXXX XXXXX</text>
        <text x="20" y="106" font-size="7.5" fill="rgba(255,255,255,0.7)" font-family="system-ui">email@example.com</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      // Gradient background rect
      const grad = linearGrad(canvas, 0, 0, w, h, palette.primary, palette.accent)
      addRect(canvas, { left: 0, top: 0, width: w, height: h, fill: grad, selectable: false, evented: false })
      // Decorative circles
      addCircle(canvas, { left: w - 60, top: h - 60, radius: 110, fill: '#ffffff', opacity: 0.05, selectable: false, evented: false })
      addCircle(canvas, { left: w - 30, top: h - 30, radius: 70, fill: '#ffffff', opacity: 0.05, selectable: false, evented: false })
      // Logo
      await addLogo(canvas, profile, w - 100, 20, 65)
      // Name
      addText(canvas, f(profile, 'personName'), {
        left: 20, top: h * 0.22,
        fontSize: 28, fontWeight: '800',
        fill: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        opacity: isPlaceholder(profile, 'personName') ? 0.4 : 1,
        width: w - 130,
      })
      addText(canvas, `${f(profile, 'designation')} · ${f(profile, 'companyName')}`, {
        left: 20, top: h * 0.5,
        fontSize: 11, fill: 'rgba(255,255,255,0.8)',
        fontFamily: 'Inter, sans-serif',
        width: w - 130,
      })
      addLine(canvas, [20, h * 0.62, w * 0.58, h * 0.62], { stroke: '#ffffff', strokeWidth: 0.8, opacity: 0.3, selectable: false, evented: false })
      addText(canvas, f(profile, 'phone'), { left: 20, top: h * 0.67, fontSize: 10, fill: 'rgba(255,255,255,0.75)', fontFamily: 'Inter, sans-serif', width: w - 30 })
      addText(canvas, f(profile, 'email'), { left: 20, top: h * 0.8, fontSize: 10, fill: 'rgba(255,255,255,0.75)', fontFamily: 'Inter, sans-serif', width: w - 30 })
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
        <polygon points="0,0 160,0 100,160 0,160" fill="${pal.primary}"/>
        <text x="18" y="52" font-size="15" font-weight="800" fill="#fff" font-family="system-ui">Your</text>
        <text x="18" y="70" font-size="15" font-weight="800" fill="#fff" font-family="system-ui">Name</text>
        <text x="18" y="87" font-size="7.5" fill="rgba(255,255,255,0.75)" font-family="system-ui">Your Title</text>
        <text x="142" y="68" font-size="8" fill="${pal.primary}" font-family="system-ui" font-weight="700">Company</text>
        <line x1="142" y1="76" x2="265" y2="76" stroke="${pal.primary}" stroke-width="0.7" opacity="0.3"/>
        <text x="142" y="90" font-size="7" fill="#888" font-family="system-ui">+91 XXXXX XXXXX</text>
        <text x="142" y="102" font-size="7" fill="#888" font-family="system-ui">email@example.com</text>
        <text x="142" y="114" font-size="7" fill="#888" font-family="system-ui">www.example.com</text>
        <rect x="210" y="120" width="${pal.accent === '#c9a24b' ? 60 : 60}" height="4" rx="2" fill="${pal.accent}"/>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      canvas.backgroundColor = '#ffffff'
      // Dark diagonal left panel
      const poly = new Polygon(
        [{ x: 0, y: 0 }, { x: w * 0.52, y: 0 }, { x: w * 0.38, y: h }, { x: 0, y: h }],
        { fill: palette.primary, selectable: false, evented: false }
      )
      canvas.add(poly)
      // Accent stripe on right
      addRect(canvas, { left: w - 6, top: 0, width: 6, height: h, fill: palette.accent, selectable: false, evented: false })
      // Logo on dark side
      await addLogo(canvas, profile, 20, 18, 50)
      // Name on dark side
      // The diagonal boundary runs from x=0.52w (top) to x=0.38w (bottom), so
      // the safe left-zone width must clear the boundary's narrowest point
      // (bottom, 0.38w) with margin, not just its top.
      addText(canvas, f(profile, 'personName'), {
        left: 16, top: h * 0.28,
        fontSize: 20, fontWeight: '800',
        fill: '#ffffff',
        fontFamily: 'Georgia, serif',
        width: w * 0.28,
        opacity: isPlaceholder(profile, 'personName') ? 0.4 : 1,
      })
      addText(canvas, f(profile, 'designation'), {
        left: 16, top: h * 0.58,
        fontSize: 9, fill: 'rgba(255,255,255,0.75)',
        fontFamily: 'Inter, sans-serif', width: w * 0.28,
      })
      // Info on white side — must start clear of the boundary's widest point
      // (top, 0.52w) with margin, not just its bottom.
      const infoX = w * 0.58
      const infoWidth = w * 0.38
      addText(canvas, f(profile, 'companyName'), {
        left: infoX, top: h * 0.2,
        fontSize: 13, fontWeight: '700',
        fill: palette.primary,
        fontFamily: 'Inter, sans-serif', width: infoWidth,
      })
      addLine(canvas, [infoX, h * 0.36, w - 10, h * 0.36], { stroke: palette.primary, strokeWidth: 0.7, opacity: 0.25, selectable: false, evented: false })
      addText(canvas, f(profile, 'phone'), { left: infoX, top: h * 0.42, fontSize: 9, fill: '#666', fontFamily: 'Inter, sans-serif', width: infoWidth })
      addText(canvas, f(profile, 'email'), { left: infoX, top: h * 0.56, fontSize: 9, fill: '#666', fontFamily: 'Inter, sans-serif', width: infoWidth })
      addText(canvas, f(profile, 'website'), { left: infoX, top: h * 0.7, fontSize: 9, fill: palette.primary, fontFamily: 'Inter, sans-serif', width: infoWidth })
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
        <rect width="76" height="160" fill="${pal.primary}"/>
        <text x="38" y="52" font-size="8" fill="rgba(255,255,255,0.8)" text-anchor="middle" font-family="system-ui" font-weight="700">LOGO</text>
        <rect x="17" y="64" width="44" height="44" rx="22" fill="rgba(255,255,255,0.12)"/>
        <text x="38" y="91" font-size="18" fill="rgba(255,255,255,0.5)" text-anchor="middle" font-family="system-ui">👤</text>
        <text x="38" y="130" font-size="7" fill="rgba(255,255,255,0.7)" text-anchor="middle" font-family="system-ui">Your City</text>
        <text x="96" y="38" font-size="16" font-weight="800" fill="${pal.primary}" font-family="system-ui">Your Name</text>
        <text x="96" y="53" font-size="8.5" fill="#888" font-family="system-ui">Your Title</text>
        <text x="96" y="63" font-size="8.5" fill="${pal.accent}" font-family="system-ui" font-weight="600">Company Name</text>
        <line x1="96" y1="75" x2="268" y2="75" stroke="${pal.primary}" stroke-width="0.7" opacity="0.2"/>
        <text x="96" y="92" font-size="7.5" fill="#888" font-family="system-ui">+91 XXXXX XXXXX</text>
        <text x="96" y="107" font-size="7.5" fill="#888" font-family="system-ui">email@example.com</text>
        <text x="96" y="122" font-size="7.5" fill="#888" font-family="system-ui">www.example.com</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      canvas.backgroundColor = '#ffffff'
      const colW = w * 0.26
      // Left column
      addRect(canvas, { left: 0, top: 0, width: colW, height: h, fill: palette.primary, selectable: false, evented: false })
      // Logo in column
      await addLogo(canvas, profile, (colW - 60) / 2, 18, 60)
      // City in column
      addText(canvas, f(profile, 'location'), {
        left: 6, top: h * 0.78,
        fontSize: 8, fill: 'rgba(255,255,255,0.7)',
        fontFamily: 'Inter, sans-serif',
        width: colW - 12, textAlign: 'center',
      })
      // Right side content
      const rx = colW + 18
      addText(canvas, f(profile, 'personName'), {
        left: rx, top: h * 0.16,
        fontSize: 22, fontWeight: '800',
        fill: palette.primary,
        fontFamily: 'Georgia, serif',
        opacity: isPlaceholder(profile, 'personName') ? 0.35 : 1,
        width: w - rx - 12,
      })
      addText(canvas, f(profile, 'designation'), {
        left: rx, top: h * 0.43,
        fontSize: 10, fill: '#888',
        fontFamily: 'Inter, sans-serif', width: w - rx - 12,
      })
      addText(canvas, f(profile, 'companyName'), {
        left: rx, top: h * 0.56,
        fontSize: 10, fontWeight: '700',
        fill: palette.accent,
        fontFamily: 'Inter, sans-serif', width: w - rx - 12,
      })
      addLine(canvas, [rx, h * 0.66, w - 10, h * 0.66], { stroke: palette.primary, strokeWidth: 0.7, opacity: 0.2, selectable: false, evented: false })
      addText(canvas, f(profile, 'phone'), { left: rx, top: h * 0.7, fontSize: 9, fill: '#777', fontFamily: 'Inter, sans-serif', width: w - rx - 12 })
      addText(canvas, f(profile, 'email'), { left: rx, top: h * 0.8, fontSize: 9, fill: '#777', fontFamily: 'Inter, sans-serif', width: w - rx - 12 })
      addText(canvas, f(profile, 'website'), { left: rx, top: h * 0.9, fontSize: 9, fill: palette.primary, fontFamily: 'Inter, sans-serif', width: w - rx - 12 })
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
        <rect width="280" height="64" fill="${pal.primary}"/>
        <text x="20" y="38" font-size="18" font-weight="800" fill="#fff" font-family="system-ui">Your Name</text>
        <text x="20" y="53" font-size="8" fill="rgba(255,255,255,0.75)" font-family="system-ui">Your Title · Company Name</text>
        <rect x="218" y="16" width="48" height="36" rx="6" fill="rgba(255,255,255,0.15)"/>
        <text x="242" y="38" font-size="10" fill="rgba(255,255,255,0.8)" text-anchor="middle" font-family="system-ui" font-weight="700">LOGO</text>
        <line x1="20" y1="86" x2="260" y2="86" stroke="${pal.primary}" stroke-width="0.7" opacity="0.15"/>
        <text x="20" y="104" font-size="7.5" fill="#888" font-family="system-ui">+91 XXXXX XXXXX</text>
        <text x="20" y="118" font-size="7.5" fill="#888" font-family="system-ui">email@example.com</text>
        <text x="20" y="132" font-size="7.5" fill="${pal.primary}" font-family="system-ui">www.example.com</text>
        <rect x="20" y="146" width="40" height="3" rx="1.5" fill="${pal.accent}"/>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      canvas.backgroundColor = '#ffffff'
      const bannerH = h * 0.42
      // Top banner
      addRect(canvas, { left: 0, top: 0, width: w, height: bannerH, fill: palette.primary, selectable: false, evented: false })
      // Logo in banner
      await addLogo(canvas, profile, w - 90, 14, 55)
      // Name in banner
      addText(canvas, f(profile, 'personName'), {
        left: 20, top: bannerH * 0.22,
        fontSize: 24, fontWeight: '800',
        fill: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        opacity: isPlaceholder(profile, 'personName') ? 0.4 : 1,
        width: w - 110,
      })
      addText(canvas, `${f(profile, 'designation')} · ${f(profile, 'companyName')}`, {
        left: 20, top: bannerH * 0.66,
        fontSize: 9.5, fill: 'rgba(255,255,255,0.8)',
        fontFamily: 'Inter, sans-serif', width: w - 110,
      })
      // Accent underline
      addRect(canvas, { left: 20, top: h * 0.52, width: 44, height: 3, rx: 1.5, fill: palette.accent, selectable: false, evented: false })
      // Bottom contact
      addText(canvas, f(profile, 'phone'), { left: 20, top: h * 0.59, fontSize: 10, fill: '#777', fontFamily: 'Inter, sans-serif', width: w - 30 })
      addText(canvas, f(profile, 'email'), { left: 20, top: h * 0.71, fontSize: 10, fill: '#777', fontFamily: 'Inter, sans-serif', width: w - 30 })
      addText(canvas, f(profile, 'website'), { left: 20, top: h * 0.83, fontSize: 10, fill: palette.primary, fontFamily: 'Inter, sans-serif', width: w - 30 })
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
        <rect x="20" y="130" width="240" height="1" fill="${pal.primary}" opacity="0.08"/>
        <rect x="20" y="20" width="4" height="48" rx="2" fill="${pal.accent}"/>
        <text x="34" y="40" font-size="17" font-weight="800" fill="${pal.primary}" font-family="system-ui">Your Name</text>
        <text x="34" y="56" font-size="9" fill="#888" font-family="system-ui">Your Title</text>
        <text x="34" y="69" font-size="9" fill="${pal.accent}" font-family="system-ui" font-weight="600">Company</text>
        <text x="20" y="98" font-size="7.5" fill="#999" font-family="system-ui">+91 XXXXX XXXXX</text>
        <text x="20" y="112" font-size="7.5" fill="#999" font-family="system-ui">email@example.com</text>
        <text x="20" y="126" font-size="7.5" fill="#999" font-family="system-ui">www.example.com</text>
        <rect x="210" y="20" width="52" height="52" rx="8" fill="${pal.primary}" opacity="0.06"/>
        <text x="236" y="50" font-size="10" fill="${pal.primary}" opacity="0.4" text-anchor="middle" font-family="system-ui" font-weight="700">LOGO</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      canvas.backgroundColor = '#ffffff'
      addRect(canvas, { left: 20, top: h * 0.88, width: w - 40, height: 1, fill: palette.primary, opacity: 0.1, selectable: false, evented: false })
      // Accent bar
      addRect(canvas, { left: 20, top: 20, width: 4, height: 52, rx: 2, fill: palette.accent, selectable: false, evented: false })
      // Logo
      await addLogo(canvas, profile, w - 90, 18, 60)
      // Name
      addText(canvas, f(profile, 'personName'), {
        left: 34, top: 22,
        fontSize: 24, fontWeight: '800',
        fill: palette.primary,
        fontFamily: 'Inter, sans-serif',
        opacity: isPlaceholder(profile, 'personName') ? 0.35 : 1,
        width: w - 130,
      })
      addText(canvas, f(profile, 'designation'), { left: 34, top: 54, fontSize: 11, fill: '#888', fontFamily: 'Inter, sans-serif', width: w - 130 })
      addText(canvas, f(profile, 'companyName'), { left: 34, top: 69, fontSize: 11, fontWeight: '700', fill: palette.accent, fontFamily: 'Inter, sans-serif', width: w - 130 })
      addText(canvas, f(profile, 'phone'), { left: 20, top: h * 0.55, fontSize: 10, fill: '#888', fontFamily: 'Inter, sans-serif', width: w - 30 })
      addText(canvas, f(profile, 'email'), { left: 20, top: h * 0.67, fontSize: 10, fill: '#888', fontFamily: 'Inter, sans-serif', width: w - 30 })
      addText(canvas, f(profile, 'website'), { left: 20, top: h * 0.79, fontSize: 10, fill: palette.primary, fontFamily: 'Inter, sans-serif', width: w - 30 })
    },
  },

  // ── 8. Warm Creative ─────────────────────────────────────────
  {
    id: 'warm-creative',
    label: 'Warm Creative',
    category: 'creative',
    orientation: 'horizontal',

    svgPreview(pal) {
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
        <text x="20" y="50" font-size="18" font-weight="800" fill="#fff" font-family="system-ui">Your Name</text>
        <text x="20" y="67" font-size="9" fill="rgba(255,255,255,0.8)" font-family="system-ui">Your Title · Company</text>
        <line x1="20" y1="82" x2="180" y2="82" stroke="#fff" stroke-width="1" opacity="0.3"/>
        <text x="20" y="99" font-size="7.5" fill="rgba(255,255,255,0.8)" font-family="system-ui">+91 XXXXX XXXXX</text>
        <text x="20" y="113" font-size="7.5" fill="rgba(255,255,255,0.8)" font-family="system-ui">email@example.com</text>
        <text x="20" y="127" font-size="7.5" fill="rgba(255,255,255,0.8)" font-family="system-ui">www.example.com</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      const grad = linearGrad(canvas, 0, 0, w, h, '#d1495b', '#f4a261')
      addRect(canvas, { left: 0, top: 0, width: w, height: h, fill: grad, selectable: false, evented: false })
      addCircle(canvas, { left: -40, top: h - 40, radius: 110, fill: '#ffffff', opacity: 0.07, selectable: false, evented: false })
      addCircle(canvas, { left: w - 30, top: -30, radius: 80, fill: '#ffffff', opacity: 0.07, selectable: false, evented: false })
      await addLogo(canvas, profile, w - 90, 18, 60)
      addText(canvas, f(profile, 'personName'), {
        left: 20, top: h * 0.2,
        fontSize: 26, fontWeight: '800', fill: '#ffffff',
        fontFamily: 'Poppins, sans-serif',
        opacity: isPlaceholder(profile, 'personName') ? 0.4 : 1,
        width: w - 130,
      })
      addText(canvas, `${f(profile, 'designation')} · ${f(profile, 'companyName')}`, {
        left: 20, top: h * 0.5, fontSize: 10, fill: 'rgba(255,255,255,0.85)',
        fontFamily: 'Inter, sans-serif', width: w - 130,
      })
      addLine(canvas, [20, h * 0.62, w * 0.65, h * 0.62], { stroke: '#ffffff', strokeWidth: 0.8, opacity: 0.3, selectable: false, evented: false })
      addText(canvas, f(profile, 'phone'), { left: 20, top: h * 0.67, fontSize: 9.5, fill: 'rgba(255,255,255,0.8)', fontFamily: 'Inter, sans-serif', width: w - 30 })
      addText(canvas, f(profile, 'email'), { left: 20, top: h * 0.79, fontSize: 9.5, fill: 'rgba(255,255,255,0.8)', fontFamily: 'Inter, sans-serif', width: w - 30 })
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
        <circle cx="80" cy="80" r="42" fill="rgba(255,255,255,0.08)"/>
        <text x="80" y="86" font-size="12" fill="rgba(255,255,255,0.4)" text-anchor="middle" font-family="system-ui">LOGO</text>
        <text x="80" y="148" font-size="14" font-weight="800" fill="#fff" text-anchor="middle" font-family="system-ui">Your Name</text>
        <text x="80" y="164" font-size="8" fill="${pal.accent}" text-anchor="middle" font-family="system-ui" font-weight="600">YOUR TITLE</text>
        <line x1="30" y1="180" x2="130" y2="180" stroke="${pal.accent}" stroke-width="0.8" opacity="0.4"/>
        <text x="80" y="200" font-size="7" fill="rgba(255,255,255,0.65)" text-anchor="middle" font-family="system-ui">Company Name</text>
        <text x="80" y="220" font-size="7" fill="rgba(255,255,255,0.55)" text-anchor="middle" font-family="system-ui">+91 XXXXX XXXXX</text>
        <text x="80" y="236" font-size="7" fill="rgba(255,255,255,0.55)" text-anchor="middle" font-family="system-ui">email@example.com</text>
        <text x="80" y="252" font-size="7" fill="rgba(255,255,255,0.55)" text-anchor="middle" font-family="system-ui">www.example.com</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      addRect(canvas, { left: 0, top: 0, width: w, height: h, fill: palette.primary, selectable: false, evented: false })
      // Tinted footer band. A translucent accent-colour fill here blends
      // with the dark navy background and can read as a muddy olive/brown
      // depending on the accent hue — a flat, palette-agnostic white tint
      // reads as a clean, intentional dark shade regardless of accent color.
      addRect(canvas, { left: 0, top: h * 0.42, width: w, height: h * 0.58, fill: 'rgba(255,255,255,0.05)', selectable: false, evented: false })
      // Logo circle — sized and padded so it sits fully inside the card
      // with clear top margin, instead of crowding/clipping the top edge.
      const circleR = 28
      const circleTop = h * 0.10
      addCircle(canvas, { left: w / 2 - circleR, top: circleTop, radius: circleR, fill: 'rgba(255,255,255,0.08)', selectable: false, evented: false })
      const logoSize = 42
      await addLogo(canvas, profile, w / 2 - logoSize / 2, circleTop + circleR - logoSize / 2, logoSize)
      addText(canvas, f(profile, 'personName'), {
        left: 10, top: h * 0.28,
        fontSize: 18, fontWeight: '800', fill: '#ffffff',
        fontFamily: 'Georgia, serif', textAlign: 'center', width: w - 20,
        opacity: isPlaceholder(profile, 'personName') ? 0.4 : 1,
      })
      addText(canvas, f(profile, 'designation').toUpperCase(), {
        left: 10, top: h * 0.375, fontSize: 9, fontWeight: '700',
        fill: palette.accent, textAlign: 'center', charSpacing: 40,
        fontFamily: 'Inter, sans-serif', width: w - 20,
      })
      addLine(canvas, [w * 0.22, h * 0.44, w * 0.78, h * 0.44], { stroke: palette.accent, strokeWidth: 0.8, opacity: 0.4, selectable: false, evented: false })
      // Contact block tightened into ~0.065h steps (was ~0.12h apart,
      // scattering the lines across mostly-empty space) so it reads as one
      // cohesive group rather than isolated fragments.
      addText(canvas, f(profile, 'companyName'), { left: 10, top: h * 0.52, fontSize: 9, fill: 'rgba(255,255,255,0.7)', textAlign: 'center', fontFamily: 'Inter, sans-serif', width: w - 20 })
      addText(canvas, f(profile, 'phone'), { left: 10, top: h * 0.585, fontSize: 8.5, fill: 'rgba(255,255,255,0.6)', textAlign: 'center', fontFamily: 'Inter, sans-serif', width: w - 20 })
      addText(canvas, f(profile, 'email'), { left: 10, top: h * 0.65, fontSize: 8.5, fill: 'rgba(255,255,255,0.6)', textAlign: 'center', fontFamily: 'Inter, sans-serif', width: w - 20 })
      addText(canvas, f(profile, 'website'), { left: 10, top: h * 0.715, fontSize: 8.5, fill: 'rgba(255,255,255,0.6)', textAlign: 'center', fontFamily: 'Inter, sans-serif', width: w - 20 })
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
        <polygon points="0,0 90,0 0,90" fill="${pal.primary}" opacity="0.9"/>
        <polygon points="280,160 190,160 280,70" fill="${pal.accent}" opacity="0.7"/>
        <polygon points="280,160 280,90 210,160" fill="${pal.primary}" opacity="0.4"/>
        <text x="20" y="106" font-size="16" font-weight="800" fill="${pal.primary}" font-family="system-ui">Your Name</text>
        <text x="20" y="121" font-size="8" fill="#888" font-family="system-ui">Your Title · Company</text>
        <line x1="20" y1="130" x2="200" y2="130" stroke="${pal.primary}" stroke-width="0.7" opacity="0.2"/>
        <text x="20" y="144" font-size="7" fill="#999" font-family="system-ui">+91 XXXXX · email@example.com</text>
      </svg>`
    },

    async load(canvas, profile, palette, w, h) {
      canvas.backgroundColor = '#ffffff'
      // Top-left triangle
      const tl = new Polygon([{ x: 0, y: 0 }, { x: w * 0.3, y: 0 }, { x: 0, y: h * 0.55 }], { fill: palette.primary, selectable: false, evented: false })
      canvas.add(tl)
      // Bottom-right triangles
      const br1 = new Polygon([{ x: w, y: h }, { x: w * 0.65, y: h }, { x: w, y: h * 0.44 }], { fill: palette.accent, opacity: 0.8, selectable: false, evented: false })
      canvas.add(br1)
      const br2 = new Polygon([{ x: w, y: h }, { x: w, y: h * 0.7 }, { x: w * 0.78, y: h }], { fill: palette.primary, opacity: 0.5, selectable: false, evented: false })
      canvas.add(br2)
      // Logo
      await addLogo(canvas, profile, w * 0.38, 18, 50)
      // Name
      addText(canvas, f(profile, 'personName'), {
        left: 20, top: h * 0.55,
        fontSize: 22, fontWeight: '800', fill: palette.primary,
        fontFamily: 'Inter, sans-serif',
        opacity: isPlaceholder(profile, 'personName') ? 0.35 : 1,
        width: w - 40,
      })
      addText(canvas, `${f(profile, 'designation')} · ${f(profile, 'companyName')}`, {
        left: 20, top: h * 0.74, fontSize: 9.5, fill: '#888', fontFamily: 'Inter, sans-serif', width: w * 0.65,
      })
      addLine(canvas, [20, h * 0.84, w * 0.74, h * 0.84], { stroke: palette.primary, strokeWidth: 0.7, opacity: 0.2, selectable: false, evented: false })
      addText(canvas, `${f(profile, 'phone')}  ·  ${f(profile, 'email')}`, { left: 20, top: h * 0.87, fontSize: 8.5, fill: '#999', fontFamily: 'Inter, sans-serif', width: w * 0.65 })
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
