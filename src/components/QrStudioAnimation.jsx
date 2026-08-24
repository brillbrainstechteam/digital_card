import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCode, createDefaultQrSettings, buildDestinationValue } from '../features/qr'
import './qr-animation.css'

/* ══════════════════════════════════════════════════════
   QR Studio showcase animation

   Deliberately not a second phone mockup — the hero
   already uses one, and a QR is *authored* in the studio
   and *scanned* on a phone. This is the authoring side.

   The codes are not pictures of QR codes: they run the
   product's own buildDestinationValue() through its own
   <QRCode> renderer, so what the page advertises is
   exactly what the studio produces.
   ══════════════════════════════════════════════════════ */

const BRAND_NAVY = '#0E1A35'
const BRAND_GOLD = '#D4AF37'

// The QR engine sets hideBackgroundDots, so it clears a quiet zone and the
// logo lands on the code's white background. bb-logo.png is white-stroked,
// which would leave only its gold brain detail visible and the "BB" itself
// invisible. Composite it onto a navy tile first so it reads on white — and
// hand the engine a data URL, which is what it expects (see the saveAsBlob
// note in qrEngine.js).
function useBrandLogoTile() {
  const [tile, setTile] = useState(null)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const S = 256
      const canvas = document.createElement('canvas')
      canvas.width = S
      canvas.height = S
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = BRAND_NAVY
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath()
        ctx.roundRect(0, 0, S, S, S * 0.22)
        ctx.fill()
      } else {
        ctx.fillRect(0, 0, S, S)
      }

      const pad = S * 0.17
      const box = S - pad * 2
      const scale = Math.min(box / img.width, box / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h)

      try { setTile(canvas.toDataURL('image/png')) } catch { /* tainted canvas — skip the logo */ }
    }
    img.src = '/bb-logo.png'
    return () => { cancelled = true }
  }, [])

  return tile
}

function DestIcon({ type }) {
  const paths = {
    website: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 9h-3a15.6 15.6 0 0 0-1.2-5.4A8 8 0 0 1 18.9 11ZM12 4.1c.8 1.1 1.6 3.2 1.8 6.9h-3.6c.2-3.7 1-5.8 1.8-6.9ZM4.3 13h3c.1 2 .5 3.9 1.2 5.4A8 8 0 0 1 4.3 13Zm3-2h-3a8 8 0 0 1 4.2-5.4A15.6 15.6 0 0 0 7.3 11ZM12 19.9c-.8-1.1-1.6-3.2-1.8-6.9h3.6c-.2 3.7-1 5.8-1.8 6.9Zm2.7-1.5c.7-1.5 1.1-3.4 1.2-5.4h3a8 8 0 0 1-4.2 5.4Z" />,
    whatsapp: <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.6 4.7-1.2A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20Zm4.4-5.8-1.6-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.7-.8c.1-.2.1-.4 0-.6l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3c-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7a9.9 9.9 0 0 0 4.1 3.6c1.4.6 2 .6 2.7.5.4 0 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1Z" />,
    wifi: <path d="M12 20a1.7 1.7 0 1 0 0-3.4A1.7 1.7 0 0 0 12 20Zm0-6.2a5 5 0 0 1 3.3 1.2l1.4-1.5a7 7 0 0 0-9.4 0l1.4 1.5a5 5 0 0 1 3.3-1.2Zm0-4.2a9.2 9.2 0 0 1 6.2 2.4l1.4-1.5a11.2 11.2 0 0 0-15.2 0l1.4 1.5A9.2 9.2 0 0 1 12 9.6Zm0-4.2a13.4 13.4 0 0 1 9 3.5l1.4-1.5a15.4 15.4 0 0 0-20.8 0L3 8.9a13.4 13.4 0 0 1 9-3.5Z" />,
    saveContact: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 4v2h16v-2c0-2.3-4.7-4-8-4Z" />,
  }
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{paths[type]}</svg>
}

// Four destination kinds the studio can encode, each with the fields the
// product's own builder expects.
const DESTINATIONS = [
  {
    type: 'website',
    label: 'Website',
    caption: 'Send scans to any page',
    fields: { url: 'brillbrainsconsultants.com' },
    display: 'brillbrainsconsultants.com',
  },
  {
    type: 'whatsapp',
    label: 'WhatsApp',
    caption: 'Open a chat, pre-filled',
    fields: { number: '919876543210', message: 'Hi Brill Brains!' },
    display: 'wa.me/919876543210',
  },
  {
    type: 'wifi',
    label: 'Wi-Fi',
    caption: 'Guests join without typing',
    fields: { ssid: 'BrillBrains-Guest', security: 'WPA', password: 'welcome2026', hidden: false },
    display: 'BrillBrains-Guest',
  },
  {
    type: 'saveContact',
    label: 'Contact',
    caption: 'Saves straight to the phonebook',
    fields: {
      fullName: 'Brill Brains Consultants',
      companyName: 'Brill Brains',
      designation: 'Strategic & Creative',
      phones: [{ label: 'Mobile', number: '+919876543210' }],
      email: 'hello@brillbrainsconsultants.com',
      websites: [{ label: 'Website', url: 'https://brillbrainsconsultants.com' }],
      address: 'Pune, India',
    },
    display: 'Brill Brains Consultants.vcf',
  },
]

// 1 pick destination · 2 type it · 3 encode · 4 colour · 5 gradient
// 6 logo · 7 make it dynamic · 8 export · 9 scans
const SCENE_MS = [900, 1300, 900, 800, 800, 900, 1000, 900, 1300]
const SCENE_COUNT = SCENE_MS.length
const RESTING_SCENE = 8

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

function debugOverride(key) {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get(key)
  return v === null ? null : Number(v)
}

export function QrStudioAnimation() {
  const reduced = usePrefersReducedMotion()
  const pinnedScene = debugOverride('qrScene')
  const pinnedDest = debugOverride('qrDest')

  const [scene, setScene] = useState(pinnedScene ?? (reduced ? RESTING_SCENE : 1))
  const [destIdx, setDestIdx] = useState(pinnedDest ?? 0)
  const [typed, setTyped] = useState('')
  const [scans, setScans] = useState(0)

  const dest = DESTINATIONS[destIdx] ?? DESTINATIONS[0]
  const logoTile = useBrandLogoTile()

  useEffect(() => { if (reduced) setScene(RESTING_SCENE) }, [reduced])

  useEffect(() => {
    if (reduced || pinnedScene !== null) return undefined
    const t = setTimeout(() => {
      // Read `scene` directly rather than mutating it from inside a setState
      // updater — updaters must be pure, and StrictMode double-invokes them.
      if (scene >= SCENE_COUNT) {
        setDestIdx((d) => (d + 1) % DESTINATIONS.length)
        setScene(1)
      } else {
        setScene(scene + 1)
      }
    }, SCENE_MS[scene - 1] ?? 900)
    return () => clearTimeout(t)
  }, [scene, reduced, pinnedScene])

  // Type the destination out during scene 2. Only the caption types — the QR
  // payload is set once, at scene 3, so the encoder isn't re-run per keystroke.
  useEffect(() => {
    if (scene < 2) { setTyped(''); return undefined }
    if (scene > 2 || reduced) { setTyped(dest.display); return undefined }
    let i = 0
    setTyped('')
    const id = setInterval(() => {
      i += 1
      setTyped(dest.display.slice(0, i))
      if (i >= dest.display.length) clearInterval(id)
    }, Math.max(18, 900 / dest.display.length))
    return () => clearInterval(id)
  }, [scene, dest, reduced])

  useEffect(() => {
    if (scene < 9) { setScans(0); return undefined }
    if (reduced) { setScans(1284); return undefined }
    const step = Math.ceil(1284 / 26)
    const id = setInterval(() => setScans((p) => (p + step >= 1284 ? 1284 : p + step)), 45)
    return () => clearInterval(id)
  }, [scene, reduced])

  const settings = useMemo(() => {
    const base = createDefaultQrSettings()
    return {
      ...base,
      qrType: scene >= 7 ? 'dynamic' : 'static',
      destinationType: dest.type,
      destinationFields: dest.fields,
      data: buildDestinationValue(dest.type, dest.fields),
      foreground: scene >= 4 ? BRAND_NAVY : '#111827',
      background: '#ffffff',
      gradient: scene >= 5 ? { type: 'linear', rotation: 45, colors: [BRAND_GOLD, BRAND_NAVY] } : null,
      logo: scene >= 6 ? logoTile : null,
      logoSizeRatio: 0.24,
    }
  }, [scene, dest, logoTile])

  const isDynamic = scene >= 7

  return (
    <div className="qrs" role="img" aria-label="Animated preview of the QR Studio building a branded QR code">
      <div className="qrs-head">
        <span className="qrs-dots"><i /><i /><i /></span>
        <span className="qrs-title">QR Studio</span>
        <span className={`qrs-badge${isDynamic ? ' is-dynamic' : ''}`}>{isDynamic ? 'Dynamic' : 'Static'}</span>
      </div>

      <div className="qrs-tabs">
        {DESTINATIONS.map((d) => (
          <span key={d.type} className={`qrs-tab${d.type === dest.type ? ' active' : ''}`}>
            <DestIcon type={d.type} />
            {d.label}
          </span>
        ))}
      </div>

      <div className="qrs-body">
        <div className="qrs-stage">
          <AnimatePresence mode="wait">
            {scene < 3 ? (
              <motion.div key="empty" className="qrs-placeholder"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="qrs-placeholder-grid" aria-hidden="true">
                  {Array.from({ length: 9 }).map((_, i) => <i key={i} />)}
                </span>
                <span className="qrs-placeholder-text">
                  {scene === 1 ? 'Pick a destination' : 'Encoding…'}
                </span>
              </motion.div>
            ) : (
              <motion.div key={`qr-${dest.type}`} className="qrs-code"
                initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.32 }}>
                <QRCode settings={settings} size={150} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="qrs-side">
          <p className="qrs-caption">{dest.caption}</p>
          <p className="qrs-value">
            {typed}
            {scene === 2 && <span className="qrs-caret" />}
          </p>

          <div className="qrs-steps">
            <Step on={scene >= 4} label="Brand colour" swatch={BRAND_NAVY} />
            <Step on={scene >= 5} label="Gradient" swatch={`linear-gradient(45deg, ${BRAND_GOLD}, ${BRAND_NAVY})`} />
            <Step on={scene >= 6} label="Logo added" logo />
          </div>

          {scene >= 7 && (
            <motion.p className="qrs-note" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              Re-point it any time — the printed code never changes.
            </motion.p>
          )}
        </div>
      </div>

      <div className="qrs-foot">
        <div className="qrs-exports">
          {['PNG', 'SVG', 'PDF'].map((f, i) => (
            <motion.span key={f} className={`qrs-chip${scene >= 8 ? ' on' : ''}`}
              animate={scene >= 8 ? { scale: [0.9, 1] } : {}} transition={{ delay: i * 0.07 }}>
              {f}
            </motion.span>
          ))}
        </div>
        <span className={`qrs-scans${scene >= 9 ? ' on' : ''}`}>
          {scans.toLocaleString('en-IN')} scans
        </span>
      </div>
    </div>
  )
}

function Step({ on, label, swatch, logo }) {
  return (
    <span className={`qrs-step${on ? ' on' : ''}`}>
      <span
        className={`qrs-step-dot${logo ? ' is-logo' : ''}`}
        style={swatch ? { background: swatch } : undefined}
      >
        {logo && on && <img src="/bb-logo.png" alt="" />}
      </span>
      {label}
    </span>
  )
}
