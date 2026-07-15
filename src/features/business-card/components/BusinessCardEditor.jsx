import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Canvas, Textbox, Rect, Circle, Triangle, Line, FabricImage, Group,
  loadSVGFromString, util,
} from 'fabric'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  RotateCcw, Undo2, Redo2, Trash2, Copy, FlipHorizontal,
  Layers, Sliders, Grid2X2, Type, Image, QrCode,
  Square, Star, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ChevronUp, ChevronDown, Bold, Italic,
  Minus, Save, X, Eye, Check,
  Heart, Award, Briefcase, Globe, Camera, Coffee, Zap, Shield, Smile, MapPin, Sparkles,
} from 'lucide-react'
import { TEMPLATES, getPalette, getCardDimensions, getTemplate, CUSTOM_FABRIC_PROPS, PLACEHOLDER_TEXT, loadBackSide, addText, addLogo, addAddressFooter, f, isPlaceholder, computeBackQrRect } from '../bcTemplates'
import { normalizeLegacyOrigins, renderFaceThumbnail, waitForFonts } from '../canvasHelpers'
import { FONT_OPTIONS } from '../../digital-card/fontOptions'
import { CardPreviewScreen } from './CardPreviewScreen'
import { QRCode, createDefaultQrSettings, buildDestinationValue, renderQrToDataUrl } from '../../qr'

// ── Solid palette for background ─────────────────────────────
const BG_COLORS = [
  '#ffffff','#f8f7f3','#0d1117','#1f2d3d','#334155',
  '#3654ff','#d1495b','#2f6f4e','#7a4a2b','#c9a24b',
  '#f4a261','#c98ea6','#7c9eff','#0e7c86','#b45309',
]

// Recognizes a QR object either by its elementType tag (real QR images
// inserted via addQRPlaceholder are tagged 'qrCode'; template-generated
// ones are tagged 'qr') or, for legacy/untagged data, by content — a group
// containing a Textbox reading "QR" (the old static placeholder look).
// Works on both live Fabric objects (children under `_objects`) and plain
// serialized JSON (children under `objects`) so it can be reused for the
// inactive face's Elements list, which only has parsed JSON to read.
function isQRPlaceholderObj(obj) {
  if (obj?.elementType === 'qr' || obj?.elementType === 'qrCode') return true
  const children = obj?._objects || obj?.objects
  return obj?.type === 'group' && Array.isArray(children) &&
    children.some((o) => (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') && o.text === 'QR')
}

const isTextType = (t) => t === 'textbox' || t === 'i-text' || t === 'text'

// Infers the elementType of an UNTAGGED object by matching its rendered
// content against the profile values / placeholder strings the templates
// draw from. Needed for cards saved before elementType tagging existed
// (their JSON has no custom props), so the Elements panel can still map
// "the textbox that says email@example.com" to the Email toggle no matter
// which of the 10 templates produced it, or how that template combined /
// uppercased the fields. Reads only plain props (type, text), so it works
// on live Fabric objects and parsed JSON alike.
function inferElementType(obj, profile) {
  if (obj.elementType) return obj.elementType
  if (isQRPlaceholderObj(obj)) return 'qr'
  // Legacy template-loaded images were only ever the profile logo — any
  // image the user adds today gets tagged 'customImage' at creation.
  if (obj.type === 'image') return 'logo'
  if (!isTextType(obj.type)) return null
  const text = String(obj.text || '').trim().toLowerCase()
  if (!text) return null
  const val = (key) => String(profile?.[key] || PLACEHOLDER_TEXT[key] || '').trim().toLowerCase()
  const has = (key) => { const v = val(key); return !!v && text.includes(v) }
  // Combined lines first (e.g. Dark Premium's "TITLE · COMPANY" and
  // "phone · email"), then exact single-field matches, then containment.
  if (has('designation') && has('companyName')) return 'designationCompany'
  if (has('phone') && has('email')) return 'phoneEmail'
  const singles = ['personName', 'designation', 'companyName', 'phone', 'email', 'website', 'location', 'tagline']
  for (const key of singles) if (text === val(key)) return key
  for (const key of singles) if (has(key)) return key
  return null
}

const LEFT_PANELS = [
  { key: 'templates', label: 'Templates', Icon: Grid2X2 },
  { key: 'text',      label: 'Text',      Icon: Type },
  { key: 'shapes',    label: 'Shapes',    Icon: Square },
  { key: 'images',    label: 'Images',    Icon: Image },
  { key: 'qr',        label: 'QR Code',   Icon: QrCode },
  { key: 'elements',  label: 'Elements',  Icon: Layers },
]

// Canonical field rows shown in the Elements panel — a fixed checklist of
// standard business-card fields rather than a raw object dump, so a toggle
// always means the same thing regardless of which template built the card.
// `match` lists every elementType tag that satisfies the row; some templates
// combine two fields into one tagged object (e.g. designation + company name
// sharing a single 'designationCompany' textbox), so toggling either row
// then toggles that same shared object. No "Motif Icon" row — that system
// doesn't exist yet (no industry field, no per-template icon), deferred by
// user decision rather than built as a stub.
// Front is brand identity only; back is personal contact + QR — the two
// sides now have fixed, distinct field sets rather than overlapping ones.
const FRONT_ELEMENT_ROWS = [
  { key: 'logo',         label: 'Logo',          match: ['logo'] },
  { key: 'companyName',  label: 'Company Name',  match: ['companyName', 'designationCompany'], profileKey: 'companyName' },
  { key: 'tagline',      label: 'Tagline',       match: ['tagline'] },
  { key: 'address',      label: 'Address',       match: ['address'], profileKey: 'address' },
  { key: 'accentShape',  label: 'Accent Shape',  match: ['accentShape'] },
]
const BACK_ELEMENT_ROWS = [
  { key: 'personName',   label: 'Name',          match: ['personName'], alwaysOn: true },
  { key: 'designation',  label: 'Designation',   match: ['designation', 'designationCompany'], profileKey: 'designation' },
  { key: 'phone',        label: 'Phone',         match: ['phone', 'phoneEmail'], profileKey: 'phone' },
  { key: 'email',        label: 'Email',         match: ['email', 'phoneEmail'], profileKey: 'email' },
  { key: 'website',      label: 'Website',       match: ['website'], profileKey: 'website' },
  { key: 'qr',           label: 'QR Code',       match: ['qr', 'qrCode'] },
  { key: 'accentShape',  label: 'Decorative Accent', match: ['accentShape'] },
]

// elementTypes created via the "+ Add Element" menu (Issue 4) — not part of
// the fixed canonical checklist above (those are singular business-card
// fields), so they're surfaced as their own extra rows, one per object,
// below the canonical list.
const CUSTOM_ELEMENT_LABELS = {
  customText:   'Text Block',
  socialHandle: 'Social Handle',
  divider:      'Divider Line',
  customImage:  'Image',
  sticker:      'Icon/Sticker',
  decorativeShape: 'Decorative Shape',
  accentShape:  'Accent Shape',
  motifIcon:    'Motif Icon',
}

// What the QR code should link to once the QR Generation module is wired
// in — UI/state only for now, see qrDestination/qrCustomLink and the TODO
// in addQRPlaceholder(). 'saveContact' is the sensible default for a
// physical business card (scan → save the person to your phone).
const QR_DESTINATIONS = [
  { key: 'saveContact', label: 'Save Contact' },
  { key: 'digitalCard',  label: 'Digital Card' },
  { key: 'website',      label: 'Website' },
  { key: 'customLink',   label: 'Custom Link' },
]

const STICKER_ICONS = [
  { key: 'star', Icon: Star },
  { key: 'heart', Icon: Heart },
  { key: 'award', Icon: Award },
  { key: 'briefcase', Icon: Briefcase },
  { key: 'globe', Icon: Globe },
  { key: 'camera', Icon: Camera },
  { key: 'coffee', Icon: Coffee },
  { key: 'zap', Icon: Zap },
  { key: 'shield', Icon: Shield },
  { key: 'smile', Icon: Smile },
  { key: 'mapPin', Icon: MapPin },
  { key: 'sparkles', Icon: Sparkles },
]

export function BusinessCardEditor({ selection, profile, cardId, onBack, onSave, onExit, onDiscardNew }) {
  const { templateId, setup, savedFront, savedBack } = selection
  const { w, h } = getCardDimensions(setup.size, setup.orientation)

  const canvasElRef = useRef(null)
  const canvasAreaRef = useRef(null)
  const fabricRef   = useRef(null)
  // View Both mode: a second, genuinely live Fabric canvas for whichever
  // face `fabricRef` isn't currently showing, so both sides are truly
  // interactive at once (not static thumbnails). `fabricRef` always
  // represents `activeFace`; this one always represents the other face.
  const secondaryCanvasElRef = useRef(null)
  const secondaryFabricRef   = useRef(null)
  // Mirrors `activeFace` into a ref so Fabric event handlers registered
  // once at canvas-creation time (closures) can read the *current* value
  // instead of whatever it was when the listener was attached.
  const activeFaceRef = useRef('front')
  // True while the canvas is being set programmatically (initial load, face
  // switch to an already-saved face) — object:added/removed events during
  // that window must NOT count as "the user made an unsaved edit". Uses a
  // ref rather than state so the always-current value is visible inside
  // Fabric event handlers, which close over state from whenever cv.on(...)
  // was registered and would otherwise see a stale value forever.
  const suppressDirtyRef = useRef(true)

  const [activeFace, setActiveFace] = useState('front')
  // Every card has both sides by default — no session-level toggle for it.
  const hasBack = true
  // Seeded from savedFront/savedBack on mount (both, not just back) — an
  // existing card opened and previewed/saved without ever switching faces
  // or making an edit would otherwise have faceData.front stuck at null,
  // making the front look "missing" (e.g. in the Preview screen) even
  // though it's right there on the live canvas.
  const [faceData, setFaceData]     = useState({ front: savedFront || null, back: savedBack || null })
  const [viewingBoth, setViewingBoth] = useState(false)
  // Which face currently has the active selection while in View Both —
  // null when nothing is selected on either card. Drives the Properties
  // panel's "Front · X" / "Back · X" title, the Elements panel's
  // FRONT/BACK highlight, and the active-card border.
  const [viewBothSelectedFace, setViewBothSelectedFace] = useState(null)

  // ── Save / exit tracking (manual save only — no auto-save) ─
  // hasBeenSaved: whether this card has ever been written to the DB, from
  // this session or a previous one (savedFront present on mount means it
  // was already saved before we got here).
  const [hasBeenSaved, setHasBeenSaved]         = useState(!!savedFront)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [exitDialog, setExitDialog]             = useState(null) // { scenario: 'new'|'existing', pendingAction: fn, purpose: 'exit'|'preview' } | null
  const [showPreview, setShowPreview]           = useState(false)

  const [activePanel, setActivePanel]   = useState(null)
  // QR destination — UI/state only for now. TODO: once the QR generation
  // module exists, pass { qrDestination, qrCustomLink } into it to produce
  // the real encoded QR image in place of the placeholder box.
  const [qrDestination, setQrDestination] = useState('saveContact') // 'saveContact' | 'digitalCard' | 'website' | 'customLink'
  const [qrCustomLink, setQrCustomLink]   = useState('')
  const [addMenuFace, setAddMenuFace]   = useState(null) // 'front' | 'back' | null — which section's "+ Add Element" popover is open
  const [iconGridFace, setIconGridFace] = useState(null) // 'front' | 'back' | null — icon/sticker sub-picker
  const [selectedObj, setSelectedObj]   = useState(null)
  const [zoom, setZoom]                 = useState(1)
  const [showOpacity, setShowOpacity]   = useState(false)

  // History per face
  const [history, setHistory]   = useState({ front: [], back: [] })
  const [histIdx, setHistIdx]   = useState({ front: -1, back: -1 })
  const [isRestoring, setIsRestoring] = useState(false)

  // Layers — write-only: kept in sync (syncLayers below) for a future
  // Layers-panel UI, but nothing currently reads the list back out.
  const [, setLayers] = useState([])

  // Text props (synced from selected object)
  const [textProps, setTextProps] = useState({
    fontFamily: 'Inter', fontSize: 16, fontWeight: 'normal', fontStyle: 'normal',
    fill: '#000000', textAlign: 'left', charSpacing: 0, lineHeight: 1.2,
    underline: false, shadow: false, outline: false,
  })

  // Shape props
  const [shapeProps, setShapeProps] = useState({
    fill: '#334155', stroke: '', strokeWidth: 0, opacity: 1,
    rx: 0,
  })

  // Common props
  const [commonProps, setCommonProps] = useState({
    left: 0, top: 0, width: 0, height: 0, angle: 0, opacity: 1,
  })

  const palette = getPalette(profile)

  // ── Canvas init ────────────────────────────────────────────
  const initCanvas = useCallback(async () => {
    if (!canvasElRef.current || fabricRef.current) return
    const cv = new Canvas(canvasElRef.current, {
      width: w,
      height: h,
      preserveObjectStacking: true,
      enableRetinaScaling: true,
    })
    // Fabric's own retina scaling only matches the screen's DPR (often 1x,
    // or as low as ~1.25x here) — sharp for a canvas shown at its native
    // logical size, but the card is then enlarged further on top via the
    // .bce-canvas-wrap CSS `transform: scale(zoom)` control (the deliberate
    // "make the card bigger on screen" zoom feature, not a bug to remove).
    // CSS-scaling a texture beyond the pixel density it was rasterized at
    // always blurs, backing-store resolution notwithstanding, so the
    // backing store needs headroom beyond the raw DPR to stay sharp once
    // that zoom is applied. Re-run Fabric's own backing-store sizing
    // (setDimensions reads getRetinaScaling() fresh) with a boosted floor
    // instead of trying to resize on every zoom-slider tick.
    cv.getRetinaScaling = () => Math.max(window.devicePixelRatio || 1, 2)
    cv.setDimensions({ width: w, height: h })
    fabricRef.current = cv

    if (savedFront) {
      // Reopening an existing card — restore exactly what was last saved
      // instead of regenerating from the template (which would discard edits).
      await cv.loadFromJSON(JSON.parse(savedFront))
      normalizeLegacyOrigins(cv)
      retagUntaggedObjects(cv)
    } else {
      // Load template (blank/Customise mode has no template)
      const tmpl = templateId === 'blank' ? null : getTemplate(templateId)
      if (tmpl) {
        await tmpl.load(cv, profile, palette, w, h)
      } else {
        await loadBlankFrontSide(cv)
      }

      // Add QR if enabled
      if (setup.includeQR) {
        await addQRToCanvas(cv, w, h)
      }
    }

    // Canvas text rasterizes with whatever webfont is already loaded at
    // renderAll() time and won't repaint itself once one finishes
    // downloading — wait so a template's Google Font (Playfair Display,
    // Montserrat, Poppins, etc.) doesn't silently render as the browser
    // default on a cold page load.
    await waitForFonts()
    cv.renderAll()
    snapshot('front', cv)
    syncLayers(cv)

    // Both sides must be populated with real data immediately on load —
    // the back is never left blank until the user manually visits it.
    // Built on a detached, off-DOM canvas so it doesn't disturb the live
    // front canvas or require creating the secondary live canvas early.
    if (!savedBack) {
      const tempEl = document.createElement('canvas')
      const tmp = new Canvas(tempEl, { width: w, height: h })
      await populateBackSide(tmp)
      tmp.renderAll()
      const backJson = JSON.stringify(tmp.toObject(CUSTOM_FABRIC_PROPS))
      tmp.dispose()
      setFaceData((prev) => ({ ...prev, back: backJson }))
    }

    // Events — this canvas always represents `activeFaceRef.current`
    // (read via ref, not the closed-over `activeFace`, since this handler
    // is registered once at creation time and must stay correct across
    // later face switches).
    cv.on('selection:created', (e) => { setViewBothSelectedFace(activeFaceRef.current); onObjSelect(e.selected?.[0]) })
    cv.on('selection:updated', (e) => { setViewBothSelectedFace(activeFaceRef.current); onObjSelect(e.selected?.[0]) })
    cv.on('selection:cleared',  () => setSelectedObj(null))
    cv.on('object:modified',    () => {
      if (!isRestoring) { snapshot(activeFaceRef.current, cv); syncLayers(cv) }
      const obj = cv.getActiveObject()
      if (obj) readProps(obj)
      markDirty()
    })
    cv.on('object:added',   () => { syncLayers(cv); markDirty() })
    cv.on('object:removed', () => { syncLayers(cv); markDirty() })

    // Fit the card to ~72% of the available canvas area instead of always
    // opening at 100% (actual pixel size), which left the card looking tiny
    // in a sea of grey — especially on standard-size horizontal cards.
    const area = canvasAreaRef.current
    if (area) {
      const fitByHeight = (area.clientHeight * 0.72) / h
      const fitByWidth  = (area.clientWidth * 0.72) / w
      const fitZoom = Math.min(fitByHeight, fitByWidth, 2)
      if (fitZoom > 0) setZoom(Math.max(0.3, parseFloat(fitZoom.toFixed(2))))
    }

    // Everything above (template load / restore of a saved card) doesn't
    // count as a user edit — only start tracking dirt from here on.
    suppressDirtyRef.current = false
  }, []) // eslint-disable-line

  function markDirty() {
    if (suppressDirtyRef.current) return
    setHasUnsavedChanges(true)
  }

  useEffect(() => { activeFaceRef.current = activeFace }, [activeFace])

  // Which canvas / face an editing action should target: normally always
  // `fabricRef`/`activeFace`, but in View Both mode it follows whichever
  // card the user actually selected something on — so the toolbar
  // (Delete/Opacity/Layer/Flip/Duplicate) and the Properties panel act on
  // the right side regardless of which one is "the" active face.
  function getActiveCanvas() {
    if (viewingBoth && viewBothSelectedFace && viewBothSelectedFace !== activeFace) {
      return secondaryFabricRef.current
    }
    return fabricRef.current
  }
  function getActiveEditFace() {
    return (viewingBoth && viewBothSelectedFace) || activeFace
  }

  useEffect(() => {
    initCanvas()
    return () => {
      fabricRef.current?.dispose()
      fabricRef.current = null
    }
  }, [initCanvas])

  // Guards actual tab close/refresh (native browser dialog) and same-app
  // link clicks (sidebar nav etc.) — same pattern StudioPage.jsx uses for
  // the Digital Card editor's unsaved-changes guard, reused here for
  // consistency rather than introducing a different mechanism (e.g.
  // React Router's useBlocker, which nothing else in the app uses yet).
  useEffect(() => {
    const needsConfirm = () => !hasBeenSaved || hasUnsavedChanges

    function handleBeforeUnload(event) {
      if (!needsConfirm()) return
      event.preventDefault()
      event.returnValue = ''
    }

    function handleDocumentClick(event) {
      if (!needsConfirm()) return
      const anchor = event.target.closest?.('a[href]')
      if (!anchor) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return
      event.preventDefault()
      requestExit(() => { window.location.href = anchor.href })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleDocumentClick, true)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleDocumentClick, true)
    }
  }, [hasBeenSaved, hasUnsavedChanges])

  // ── Helpers ────────────────────────────────────────────────
  // Used for the Setup dialog's "Include QR" toggle on a fresh Customise
  // canvas — generates the same real, scannable QR (via features/qr) as
  // addQRPlaceholder, rather than an external QR API.
  async function addQRToCanvas(cv, cw, ch) {
    try {
      const qrValue = buildQrValue()
      const dataUrl = await renderQrToDataUrl({
        ...createDefaultQrSettings(),
        data: qrValue,
        size: 240,
        margin: 8,
      })
      const qrImg = await FabricImage.fromURL(dataUrl)
      qrImg.scaleToWidth(60)
      // Same bottom-right placement as addQRPlaceholder — 20px margin off
      // both edges, computed from the canvas dimensions.
      qrImg.set({ left: cw - 80, top: ch - 80, selectable: true, originX: 'left', originY: 'top' })
      qrImg.elementType = 'qrCode'
      cv.add(qrImg)
    } catch {
      // QR generation failed — leave the canvas without it.
    }
  }

  function syncLayers(canvas) {
    if (!canvas) return
    setLayers([...canvas.getObjects()].reverse())
  }

  function snapshot(face, canvas) {
    if (!canvas || isRestoring) return
    const json = JSON.stringify(canvas.toObject(CUSTOM_FABRIC_PROPS))
    setHistory((prev) => {
      const arr = [...prev[face].slice(0, histIdx[face] + 1), json].slice(-50)
      return { ...prev, [face]: arr }
    })
    setHistIdx((prev) => ({ ...prev, [face]: Math.min(prev[face] + 1, 49) }))
  }

  function onObjSelect(obj) {
    if (!obj) { setSelectedObj(null); return }
    setSelectedObj(obj)
    readProps(obj)
  }

  function readProps(obj) {
    setCommonProps({
      left:    Math.round(obj.left    || 0),
      top:     Math.round(obj.top     || 0),
      width:   Math.round(obj.getScaledWidth()),
      height:  Math.round(obj.getScaledHeight()),
      angle:   Math.round(obj.angle   || 0),
      opacity: obj.opacity ?? 1,
    })
    if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
      setTextProps({
        fontFamily:  obj.fontFamily  || 'Inter',
        fontSize:    obj.fontSize    || 16,
        fontWeight:  obj.fontWeight  || 'normal',
        fontStyle:   obj.fontStyle   || 'normal',
        fill:        typeof obj.fill === 'string' ? obj.fill : '#000000',
        textAlign:   obj.textAlign   || 'left',
        charSpacing: obj.charSpacing || 0,
        lineHeight:  obj.lineHeight  || 1.2,
        underline:   obj.underline   || false,
        shadow:      !!obj.shadow,
        outline:     !!obj.stroke,
      })
    } else if (obj.type === 'image') {
      setShapeProps({
        fill: '', stroke: '', strokeWidth: 0,
        opacity: obj.opacity ?? 1,
        rx: obj.clipPath?.rx || 0,
      })
    } else {
      setShapeProps({
        fill:        typeof obj.fill === 'string' ? obj.fill : '#334155',
        stroke:      obj.stroke      || '',
        strokeWidth: obj.strokeWidth || 0,
        opacity:     obj.opacity     ?? 1,
        rx:          obj.rx          || 0,
      })
    }
  }

  const isText = selectedObj &&
    (selectedObj.type === 'textbox' || selectedObj.type === 'i-text' || selectedObj.type === 'text')

  // Change 5 — which property controls to show for the selected object.
  const elementKind = !selectedObj ? null
    : isText ? 'text'
    : selectedObj.type === 'image' ? 'image'
    : selectedObj.type === 'group' ? (isQRPlaceholderObj(selectedObj) ? 'qr' : 'group')
    : 'shape'

  // ── Switch face ────────────────────────────────────────────
  async function switchFace(newFace) {
    if (newFace === activeFace || !fabricRef.current) return
    const currentJson = JSON.stringify(fabricRef.current.toObject(CUSTOM_FABRIC_PROPS))
    setFaceData((prev) => ({ ...prev, [activeFace]: currentJson }))
    // Load new face
    const savedJson = faceData[newFace]
    if (savedJson) {
      // Re-displaying a face that was already built earlier in this
      // session (not a new edit) — object:added events during the reload
      // shouldn't flip hasUnsavedChanges.
      suppressDirtyRef.current = true
      setIsRestoring(true)
      await fabricRef.current.loadFromJSON(JSON.parse(savedJson))
      normalizeLegacyOrigins(fabricRef.current)
      retagUntaggedObjects(fabricRef.current)
      fabricRef.current.renderAll()
      setIsRestoring(false)
      suppressDirtyRef.current = false
    } else if (newFace === 'back') {
      await populateBackSide(fabricRef.current)
      fabricRef.current.renderAll()
      snapshot(newFace, fabricRef.current)
    } else {
      const tmpl = templateId === 'blank' ? null : getTemplate(templateId)
      fabricRef.current.clear()
      if (tmpl) await tmpl.load(fabricRef.current, profile, palette, w, h)
      else await loadBlankFrontSide(fabricRef.current)
      fabricRef.current.renderAll()
      snapshot(newFace, fabricRef.current)
    }
    setActiveFace(newFace)
    setSelectedObj(null)
    syncLayers(fabricRef.current)
  }

  // Stamps inferred elementType tags onto untagged objects right after a
  // canvas loads from saved JSON, so legacy cards (saved before tagging
  // existed) behave identically to new ones from here on — the Elements
  // panel matches them, and the next save persists the tags for good.
  function retagUntaggedObjects(canvas) {
    if (!canvas) return
    canvas.getObjects().forEach((obj) => {
      if (obj.elementType) return
      const inferred = inferElementType(obj, profile)
      if (inferred) obj.elementType = inferred
    })
  }

  // Finds a live Fabric object tagged with a given elementType — used to
  // pull the front's heading font when auto-populating a fresh back side.
  function findObjectByElementType(canvas, elementType) {
    return canvas?.getObjects().find((o) => o.elementType === elementType)
  }

  // Several templates (Dark Premium, Vertical Dark, ...) paint their
  // background with a full-bleed Rect object instead of canvas.backgroundColor
  // (which those templates leave unset). To carry "the same background" over
  // to a fresh back side we need to check both: prefer an explicit
  // canvas.backgroundColor, else fall back to a bottom-most, non-interactive
  // rect that covers the whole canvas with a plain color fill, else the
  // template's palette primary color.
  function getEffectiveBackground(canvas) {
    if (canvas.backgroundColor && typeof canvas.backgroundColor === 'string') return canvas.backgroundColor
    const bottom = canvas.getObjects()[0]
    if (bottom && bottom.type === 'rect' && bottom.selectable === false && typeof bottom.fill === 'string') {
      const coversFull = (bottom.left || 0) <= 1 && (bottom.top || 0) <= 1 &&
        bottom.getScaledWidth() >= canvas.width * 0.9 && bottom.getScaledHeight() >= canvas.height * 0.9
      if (coversFull) return bottom.fill
    }
    return palette.primary || '#ffffff'
  }

  // Picks the palette's own ink color (its light `text` for dark backgrounds,
  // its dark `textDark` for light backgrounds) using the standard
  // relative-luminance threshold — same two ink values every template
  // already uses, not an independently invented color.
  function contrastInk(bgColor) {
    const hex = (bgColor || '#ffffff').replace('#', '')
    if (hex.length !== 6) return palette.textDark || '#1a1a1a'
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.55 ? (palette.textDark || '#1a1a1a') : (palette.text || '#ffffff')
  }

  // Shared by the initial back auto-populate and by manually re-adding a
  // tagline later from the Elements panel. Centered, front's heading font,
  // ink color sourced from the palette.
  function addTaglineObject(canvas, frontFont) {
    const bg = getEffectiveBackground(canvas)
    const ink = contrastInk(bg)
    const tagline = profile?.tagline || profile?.companyName || ''
    if (!tagline) return
    const tw = w - 80
    const hasCompanySubline = profile?.companyName && profile.companyName !== tagline
    const t = new Textbox(tagline, {
      left: (w - tw) / 2,
      top: hasCompanySubline ? h / 2 - 26 : h / 2 - 15,
      width: tw,
      fontSize: 24, fontWeight: '700',
      fill: ink,
      fontFamily: (frontFont || 'Georgia') + ', serif',
      textAlign: 'center',
      charSpacing: 40, // ~1-2px tracking at this size
      originX: 'left', originY: 'top',
    })
    t.elementType = 'tagline'
    canvas.add(t)

    // Smaller, lighter company-name sub-line — gives the back more content
    // without competing with the tagline. Reuses the 'companyName'
    // elementType the Elements panel's BACK section already lists.
    if (hasCompanySubline) {
      const c = new Textbox(profile.companyName, {
        left: (w - tw) / 2,
        top: h / 2 + 16,
        width: tw,
        fontSize: 14, fontWeight: '400',
        fill: ink,
        opacity: 0.7,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        originX: 'left', originY: 'top',
      })
      c.elementType = 'companyName'
      canvas.add(c)
    }
  }

  // Customise/blank canvas has no template to delegate to — front shows a
  // centered logo + company name placeholder, back a plain contact layout,
  // matching the same content model every real template follows.
  async function loadBlankFrontSide(canvas) {
    canvas.backgroundColor = palette.primary || '#f8f7f3'
    const logoSize = 80
    await addLogo(canvas, profile, w / 2 - logoSize / 2, h * 0.14, logoSize)
    addText(canvas, f(profile, 'companyName'), {
      left: 20, top: h * 0.14 + logoSize + 16, fontSize: 27, fontWeight: '800',
      fill: palette.text || '#ffffff', fontFamily: 'Georgia, serif',
      textAlign: 'center', width: w - 40,
      opacity: isPlaceholder(profile, 'companyName') ? 0.4 : 1,
      elementType: 'companyName',
    })
    addText(canvas, f(profile, 'tagline'), {
      left: 20, top: h * 0.14 + logoSize + 54, fontSize: 13, fontStyle: 'italic',
      fill: palette.text || '#ffffff', fontFamily: 'Inter, sans-serif',
      textAlign: 'center', width: w - 40, opacity: 0.78,
      elementType: 'tagline',
    })
    addAddressFooter(canvas, profile, w, h, { ink: palette.text || '#ffffff' })
  }

  async function loadBlankBackSide(canvas) {
    await loadBackSide(canvas, profile, palette, w, h, {
      bg: '#ffffff', ink: palette.textDark || '#1a1a1a', accentColor: palette.accent, qrSide: 'right', accentShape: 'circle',
    })
  }

  // Populates a freshly created back side using the template's own
  // `loadBack()` (personal contact info + QR, per the fixed back content
  // model) when a real template is selected. Falls back to a generic
  // contact layout for the blank/Customise canvas, which has no template
  // to delegate to.
  async function populateBackSide(canvas) {
    canvas.clear()
    const tmpl = templateId === 'blank' ? null : getTemplate(templateId)
    if (tmpl?.loadBack) {
      await tmpl.loadBack(canvas, profile, palette, w, h)
    } else {
      await loadBlankBackSide(canvas)
    }
  }

  // Finds the front's heading font wherever it currently lives (the live
  // canvas if front is active, else the saved front JSON) — used when
  // manually re-adding a tagline that was never auto-created or was removed.
  function getFrontHeadingFont() {
    if (activeFace === 'front') return findObjectByElementType(fabricRef.current, 'personName')?.fontFamily
    const json = faceData.front
    if (!json) return null
    try {
      const obj = (JSON.parse(json).objects || []).find((o) => inferElementType(o, profile) === 'personName')
      return obj?.fontFamily
    } catch { return null }
  }

  // ── View Both ─────────────────────────────────────────────
  // Both cards are genuinely live, interactive Fabric canvases — `fabricRef`
  // keeps representing `activeFace` exactly as it does outside View Both;
  // a second canvas (secondaryFabricRef) is created for the other face.
  // The actual Fabric.Canvas is instantiated in the effect below, once the
  // secondary <canvas> DOM node exists — entering here just flips the flag.
  function enterViewBoth() {
    setViewingBoth(true)
  }

  // Syncs the secondary canvas's current content back into faceData (so
  // nothing typed/moved while in View Both is lost) and tears it down.
  function exitViewBoth() {
    const sc = secondaryFabricRef.current
    if (sc) {
      const secondaryFace = activeFace === 'front' ? 'back' : 'front'
      setFaceData((prev) => ({ ...prev, [secondaryFace]: JSON.stringify(sc.toObject(CUSTOM_FABRIC_PROPS)) }))
      sc.dispose()
      secondaryFabricRef.current = null
    }
    setViewBothSelectedFace(null)
    setViewingBoth(false)
  }

  // Creates/destroys the secondary live canvas as View Both is entered/left.
  useEffect(() => {
    if (!viewingBoth) return
    if (!secondaryCanvasElRef.current || secondaryFabricRef.current) return
    let cancelled = false
    const secondaryFace = activeFace === 'front' ? 'back' : 'front'
    ;(async () => {
      const sc = new Canvas(secondaryCanvasElRef.current, {
        width: w, height: h, preserveObjectStacking: true, enableRetinaScaling: true,
      })
      sc.getRetinaScaling = () => Math.max(window.devicePixelRatio || 1, 2)
      sc.setDimensions({ width: w, height: h })
      const json = faceData[secondaryFace]
      if (json) {
        await sc.loadFromJSON(JSON.parse(json))
        normalizeLegacyOrigins(sc)
        retagUntaggedObjects(sc)
      }
      if (cancelled) { sc.dispose(); return }
      sc.renderAll()
      sc.on('selection:created', (e) => { setViewBothSelectedFace(secondaryFace); onObjSelect(e.selected?.[0]) })
      sc.on('selection:updated', (e) => { setViewBothSelectedFace(secondaryFace); onObjSelect(e.selected?.[0]) })
      sc.on('selection:cleared',  () => setSelectedObj(null))
      sc.on('object:modified',    () => {
        snapshot(secondaryFace, sc)
        const obj = sc.getActiveObject()
        if (obj) readProps(obj)
        markDirty()
      })
      sc.on('object:added',   () => markDirty())
      sc.on('object:removed', () => markDirty())
      secondaryFabricRef.current = sc
    })()
    return () => { cancelled = true }
  }, [viewingBoth]) // eslint-disable-line

  // Jumps to single-face editing for whichever card the user clicked the
  // "Front Side"/"Back Side" tab for — exitViewBoth() already syncs the
  // secondary canvas's edits into faceData first, so switchFace() (a no-op
  // if that face is already what `fabricRef` shows) always sees the latest.
  function goToFaceFromBoth(face) {
    exitViewBoth()
    switchFace(face)
  }

  // ── Undo / Redo ────────────────────────────────────────────
  async function undo() {
    const face = activeFace
    const idx  = histIdx[face]
    if (idx <= 0 || !fabricRef.current) return
    const newIdx = idx - 1
    setHistIdx((p) => ({ ...p, [face]: newIdx }))
    setIsRestoring(true)
    await fabricRef.current.loadFromJSON(JSON.parse(history[face][newIdx]))
    fabricRef.current.renderAll()
    setIsRestoring(false)
    syncLayers(fabricRef.current)
    setSelectedObj(null)
  }

  async function redo() {
    const face = activeFace
    const idx  = histIdx[face]
    const arr  = history[face]
    if (idx >= arr.length - 1 || !fabricRef.current) return
    const newIdx = idx + 1
    setHistIdx((p) => ({ ...p, [face]: newIdx }))
    setIsRestoring(true)
    await fabricRef.current.loadFromJSON(JSON.parse(arr[newIdx]))
    fabricRef.current.renderAll()
    setIsRestoring(false)
    syncLayers(fabricRef.current)
    setSelectedObj(null)
  }

  // ── Reset ──────────────────────────────────────────────────
  async function resetCanvas() {
    if (!fabricRef.current) return
    const tmpl = templateId === 'blank' ? null : getTemplate(templateId)
    fabricRef.current.clear()
    fabricRef.current.backgroundColor = '#ffffff'
    if (tmpl) await tmpl.load(fabricRef.current, profile, palette, w, h)
    if (setup.includeQR) {
      await addQRToCanvas(fabricRef.current, w, h)
    }
    fabricRef.current.renderAll()
    snapshot(activeFace, fabricRef.current)
    syncLayers(fabricRef.current)
    setSelectedObj(null)
  }

  // ── Delete ─────────────────────────────────────────────────
  // From here down, toolbar/property actions target getActiveCanvas() —
  // normally fabricRef, but in View Both mode whichever card the user last
  // selected something on — so Delete/Opacity/Layer/Flip/Duplicate and every
  // Properties panel edit apply to the right side regardless of which one
  // is "the" active face.
  function deleteSelected() {
    const cv2 = getActiveCanvas()
    const obj = cv2?.getActiveObject()
    if (!obj || !cv2) return
    cv2.remove(obj)
    cv2.discardActiveObject()
    cv2.renderAll()
    setSelectedObj(null)
    snapshot(getActiveEditFace(), cv2)
  }

  // ── Duplicate ──────────────────────────────────────────────
  function duplicate() {
    const cv2 = getActiveCanvas()
    const obj = cv2?.getActiveObject()
    if (!obj || !cv2) return
    obj.clone().then((cloned) => {
      cloned.set({ left: obj.left + 14, top: obj.top + 14 })
      cv2.add(cloned)
      cv2.setActiveObject(cloned)
      cv2.renderAll()
      snapshot(getActiveEditFace(), cv2)
    })
  }

  // ── Flip ───────────────────────────────────────────────────
  function flip() {
    const cv2 = getActiveCanvas()
    const obj = cv2?.getActiveObject()
    if (!obj || !cv2) return
    obj.set('flipX', !obj.flipX)
    cv2.renderAll()
    snapshot(getActiveEditFace(), cv2)
  }

  // ── Text prop update ───────────────────────────────────────
  function updateText(key, value) {
    const cv2 = getActiveCanvas()
    const obj = cv2?.getActiveObject()
    if (!obj || !cv2) return
    obj.set(key, value)
    cv2.renderAll()
    setTextProps((p) => ({ ...p, [key]: value }))
    snapshot(getActiveEditFace(), cv2)
  }

  // ── Shape prop update ──────────────────────────────────────
  function updateShape(key, value) {
    const cv2 = getActiveCanvas()
    const obj = cv2?.getActiveObject()
    if (!obj || !cv2) return
    obj.set(key, value)
    cv2.renderAll()
    setShapeProps((p) => ({ ...p, [key]: value }))
    snapshot(getActiveEditFace(), cv2)
  }

  // ── Common prop update ────────────────────────────────────
  function updateCommon(key, value) {
    const cv2 = getActiveCanvas()
    const obj = cv2?.getActiveObject()
    if (!obj || !cv2) return
    const num = parseFloat(value)
    if (key === 'width')  obj.set('scaleX', num / obj.width)
    else if (key === 'height') obj.set('scaleY', num / obj.height)
    else obj.set(key, num)
    cv2.renderAll()
    setCommonProps((p) => ({ ...p, [key]: value }))
  }

  // ── Opacity (top bar) ─────────────────────────────────────
  function setObjOpacity(val) {
    const cv2 = getActiveCanvas()
    const obj = cv2?.getActiveObject()
    if (!obj || !cv2) return
    obj.set('opacity', parseFloat(val))
    cv2.renderAll()
    setCommonProps((p) => ({ ...p, opacity: val }))
  }

  // ── Bring/Send ────────────────────────────────────────────
  function bringForward() {
    const cv2 = getActiveCanvas()
    const obj = cv2?.getActiveObject()
    if (!obj || !cv2) return
    cv2.bringObjectForward(obj)
    cv2.renderAll()
    syncLayers(cv2)
  }
  function sendBackward() {
    const cv2 = getActiveCanvas()
    const obj = cv2?.getActiveObject()
    if (!obj || !cv2) return
    cv2.sendObjectBackwards(obj)
    cv2.renderAll()
    syncLayers(cv2)
  }

  // ── Add text ──────────────────────────────────────────────
  // Named distinctly from the imported bcTemplates `addText` canvas helper
  // (used by loadBlankFrontSide below) — a same-named local function
  // declaration here would get hoisted to the top of this component's
  // scope and silently shadow that import for the entire component body,
  // breaking every call to the real helper.
  function addTextPreset(style) {
    if (!fabricRef.current) return
    const presets = {
      heading:  { text: 'Heading',    size: 28, weight: '800' },
      sub:      { text: 'Subheading', size: 18, weight: '600' },
      body:     { text: 'Body text',  size: 13, weight: 'normal' },
      caption:  { text: 'Caption',    size: 10, weight: 'normal' },
    }
    const p = presets[style] || presets.body
    const t = new Textbox(p.text, {
      left: 40, top: 40,
      fontSize: p.size, fontWeight: p.weight,
      fontFamily: 'Inter, sans-serif',
      fill: palette.textDark || '#1a1a1a',
      width: 200,
      originX: 'left', originY: 'top',
    })
    fabricRef.current.add(t)
    fabricRef.current.setActiveObject(t)
    fabricRef.current.renderAll()
    snapshot(activeFace, fabricRef.current)
  }

  // ── Insert entered detail as text ──────────────────────────
  function insertDetailText(value, fontSize = 14, elementType, face = activeFace, cv2 = null) {
    const canvas = cv2 || fabricRef.current
    if (!canvas || !value) return
    const t = new Textbox(value, {
      left: 40, top: 40,
      fontSize, fontWeight: '600',
      fontFamily: 'Inter, sans-serif',
      fill: palette.textDark || '#1a1a1a',
      width: 220,
      originX: 'left', originY: 'top',
    })
    if (elementType) t.elementType = elementType
    canvas.add(t)
    canvas.setActiveObject(t)
    canvas.renderAll()
    snapshot(face, canvas)
  }

  // ── Add shape ─────────────────────────────────────────────
  function addShape(type) {
    if (!fabricRef.current) return
    const fill = palette.primary
    let shape
    const origin = { originX: 'left', originY: 'top' }
    if (type === 'rect')    shape = new Rect({ left: 60, top: 60, width: 120, height: 80, fill, rx: 0, ...origin })
    if (type === 'rounded') shape = new Rect({ left: 60, top: 60, width: 120, height: 80, fill, rx: 12, ...origin })
    if (type === 'circle')  shape = new Circle({ left: 60, top: 60, radius: 50, fill, ...origin })
    if (type === 'tri')     shape = new Triangle({ left: 60, top: 60, width: 100, height: 90, fill, ...origin })
    if (type === 'line')    shape = new Line([0, 0, 160, 0], { left: 40, top: 80, stroke: fill, strokeWidth: 3, ...origin })
    if (shape) {
      fabricRef.current.add(shape)
      fabricRef.current.setActiveObject(shape)
      fabricRef.current.renderAll()
      snapshot(activeFace, fabricRef.current)
    }
  }

  // ── Upload image ──────────────────────────────────────────
  async function uploadImage(file) {
    if (!file || !fabricRef.current) return
    const url = URL.createObjectURL(file)
    const img  = await FabricImage.fromURL(url)
    img.scaleToWidth(Math.min(120, w / 3))
    img.set({ left: 40, top: 40, originX: 'left', originY: 'top' })
    fabricRef.current.add(img)
    fabricRef.current.setActiveObject(img)
    fabricRef.current.renderAll()
    snapshot(activeFace, fabricRef.current)
  }

  // ── Set background color ──────────────────────────────────
  function setBackground(color) {
    if (!fabricRef.current) return
    fabricRef.current.backgroundColor = color
    fabricRef.current.renderAll()
    snapshot(activeFace, fabricRef.current)
  }

  // ── Layer toggle ──────────────────────────────────────────
  function toggleVisibility(obj) {
    obj.set('visible', !obj.visible)
    // Render whichever canvas this object actually belongs to (not
    // necessarily fabricRef — in View Both mode it may be the secondary/
    // inactive-face canvas) rather than assuming the primary one.
    const owner = obj.canvas || fabricRef.current
    owner?.renderAll()
    if (owner === fabricRef.current) syncLayers(owner)
  }

  // ── Elements panel (Change 4) ──────────────────────────────
  // The active face's objects come from live Fabric objects (`layers`,
  // already kept in sync). The inactive face has no live canvas, so its
  // objects are read straight from the saved JSON string in `faceData` —
  // this is what lets both FRONT and BACK sections render at once
  // regardless of which face is currently being edited.
  function getFaceObjects(face) {
    if (face === activeFace) {
      // Read straight off the live Fabric canvas (not the `layers` snapshot
      // state) so a toggle's checked state can never drift from what's
      // actually rendered — `layers` is kept in sync for other UI (the
      // active-object highlight) but the canvas itself is the
      // single source of truth for visibility.
      const objs = fabricRef.current ? fabricRef.current.getObjects() : []
      return { live: true, list: objs.map((obj) => ({ obj })) }
    }
    // In View Both mode the "other" face is ALSO a live canvas (the
    // secondary one), not static JSON — read it the same way.
    if (viewingBoth && secondaryFabricRef.current) {
      const objs = secondaryFabricRef.current.getObjects()
      return { live: true, list: objs.map((obj) => ({ obj })) }
    }
    const json = faceData[face]
    if (!json) return null
    let parsed
    try { parsed = JSON.parse(json) } catch { return { live: false, list: [] } }
    const objs = parsed.objects || []
    return { live: false, list: objs.map((obj, idx) => ({ obj, idx })) }
  }

  // Builds the canonical checklist rows for a face. Each row finds the
  // first object matching its elementType(s); rows for fields not yet on
  // canvas still render (unchecked) so the user can add them.
  function buildElementRows(face, rowDefs) {
    const data = getFaceObjects(face)
    if (data === null) return null
    return rowDefs.map((def) => {
      const found = data.list.find(({ obj }) => def.match.includes(inferElementType(obj, profile)))
      return {
        ...def,
        exists: !!found,
        visible: found ? found.obj.visible !== false : false,
        obj: found?.obj,
        idx: found?.idx,
        live: data.live,
        canAdd: def.key === 'qr' ? true
          : def.key === 'logo' ? !!profile?.logo
          : def.key === 'tagline' ? !!(profile?.tagline || profile?.companyName)
          : def.profileKey ? !!profile?.[def.profileKey]
          : false,
      }
    })
  }

  function toggleInactiveVisibility(face, idx) {
    const json = faceData[face]
    if (!json) return
    const parsed = JSON.parse(json)
    const obj = parsed.objects?.[idx]
    if (!obj) return
    obj.visible = obj.visible === false ? true : false
    setFaceData((prev) => ({ ...prev, [face]: JSON.stringify(parsed) }))
  }

  // A row's checkbox does double duty: if the field already exists on
  // canvas, toggling flips object.visible (hide, never delete). If it
  // doesn't exist yet, checking it ON creates it from the entered details.
  function toggleObjectVisibility(row, face) {
    if (row.live) toggleVisibility(row.obj)
    else toggleInactiveVisibility(face, row.idx)
  }

  // Clicking an Elements-panel row's NAME (not its switch) selects that
  // object on canvas — same as clicking it directly — so its selection
  // handles and Properties panel appear. No-op for hidden/missing rows.
  // A row from the inactive face has no live object yet (`row.obj` is a
  // plain JSON literal from faceData, not a Fabric instance); switching
  // face first reconstructs fresh Fabric objects via loadFromJSON, so the
  // matching live object has to be re-resolved afterwards rather than
  // reusing `row.obj` directly.
  async function selectRowOnCanvas(row, face) {
    if (!row.exists || !row.visible) return
    // Outside View Both, the inactive face has no live canvas yet — switch
    // to it first. In View Both both faces are already live, so selecting
    // should just focus the right one, never navigate away from either.
    if (!viewingBoth && face !== activeFace) await switchFace(face)
    let obj = row.obj
    if (!row.live) {
      const data = getFaceObjects(face)
      if (row.match) {
        obj = data?.list.find(({ obj }) => row.match.includes(inferElementType(obj, profile)))?.obj
      } else {
        obj = fabricRef.current?.getObjects()[row.idx]
      }
    }
    if (!obj) return
    const ownerCanvas = obj.canvas || fabricRef.current
    if (!ownerCanvas) return
    ownerCanvas.setActiveObject(obj)
    ownerCanvas.renderAll()
    if (viewingBoth) setViewBothSelectedFace(face)
    onObjSelect(obj)
  }

  async function handleRowToggle(row, face) {
    if (row.alwaysOn) return
    if (row.exists) {
      toggleObjectVisibility(row, face)
      return
    }
    if (!row.canAdd) return
    const cv2 = await resolveFaceCanvas(face)
    createElementForRow(row, face, cv2)
  }

  function createElementForRow(row, face, cv2) {
    if (!cv2) return
    if (row.key === 'qr') { addQRPlaceholder(face, cv2); return }
    if (row.key === 'logo') { addProfileLogo(face, cv2); return }
    if (row.key === 'tagline') {
      addTaglineObject(cv2, getFrontHeadingFont())
      cv2.renderAll()
      snapshot(face, cv2)
      return
    }
    if (row.profileKey && profile?.[row.profileKey]) {
      const sizes = { personName: 20, designation: 13, companyName: 13, phone: 12, email: 12, website: 12 }
      insertDetailText(profile[row.profileKey], sizes[row.key] || 13, row.key, face, cv2)
    }
  }

  // Inserts the profile's own logo — distinct from the generic "Images"
  // panel upload, which adds arbitrary images without an elementType tag.
  async function addProfileLogo(face = activeFace, cv2 = null) {
    const canvas = cv2 || await resolveFaceCanvas(face)
    if (!canvas || !profile?.logo) return
    try {
      const img = await FabricImage.fromURL(profile.logo, { crossOrigin: 'anonymous' })
      img.scaleToWidth(60)
      img.set({ left: w - 90, top: 18, originX: 'left', originY: 'top' })
      img.elementType = 'logo'
      canvas.add(img)
      canvas.setActiveObject(img)
      canvas.renderAll()
      snapshot(face, canvas)
    } catch {
      // Logo failed to load — leave the canvas without it.
    }
  }

  // ── "+ Add Element" menu (Issue 4) ─────────────────────────
  // Resolves the live canvas for `face` without ever repointing which
  // physical canvas (fabricRef vs the secondary) represents which face —
  // calling switchFace() while View Both is active would reload fabricRef
  // with a different face's content while the secondary canvas keeps
  // showing what it had, desyncing which slot's label matches its actual
  // content. Outside View Both this still switches faces exactly as before.
  async function resolveFaceCanvas(face) {
    if (viewingBoth) {
      return face === activeFace ? fabricRef.current : secondaryFabricRef.current
    }
    if (face !== activeFace) await switchFace(face)
    return fabricRef.current
  }

  async function addTextBlock(face) {
    const cv2 = await resolveFaceCanvas(face)
    if (!cv2) return
    const t = new Textbox('Text', {
      left: w / 2 - 60, top: h / 2 - 12, width: 120,
      fontSize: 16, fontWeight: '500',
      fill: palette.textDark || '#1a1a1a',
      fontFamily: 'Inter, sans-serif', textAlign: 'center',
      originX: 'left', originY: 'top',
    })
    t.elementType = 'customText'
    cv2.add(t)
    cv2.setActiveObject(t)
    cv2.renderAll()
    snapshot(face, cv2)
  }

  async function addSocialHandle(face) {
    const cv2 = await resolveFaceCanvas(face)
    if (!cv2) return
    const t = new Textbox('@yourhandle', {
      left: w / 2 - 60, top: h / 2 - 10, width: 120,
      fontSize: 13, fontWeight: '600',
      fill: palette.primary || '#1a1a1a',
      fontFamily: 'Inter, sans-serif', textAlign: 'center',
      originX: 'left', originY: 'top',
    })
    t.elementType = 'socialHandle'
    cv2.add(t)
    cv2.setActiveObject(t)
    cv2.renderAll()
    snapshot(face, cv2)
  }

  async function addDivider(face) {
    const cv2 = await resolveFaceCanvas(face)
    if (!cv2) return
    const line = new Line([0, 0, 140, 0], {
      left: w / 2 - 70, top: h / 2,
      stroke: palette.primary || '#334155', strokeWidth: 2,
      originX: 'left', originY: 'top',
    })
    line.elementType = 'divider'
    cv2.add(line)
    cv2.setActiveObject(line)
    cv2.renderAll()
    snapshot(face, cv2)
  }

  async function addCustomImage(face, file) {
    if (!file) return
    const cv2 = await resolveFaceCanvas(face)
    if (!cv2) return
    const url = URL.createObjectURL(file)
    const img = await FabricImage.fromURL(url)
    img.scaleToWidth(Math.min(120, w / 3))
    img.set({ left: w / 2 - 60, top: h / 2 - 40, originX: 'left', originY: 'top' })
    img.elementType = 'customImage'
    cv2.add(img)
    cv2.setActiveObject(img)
    cv2.renderAll()
    snapshot(face, cv2)
  }

  // Renders a Lucide icon to SVG markup and parses it into real Fabric
  // objects (grouped if the icon has multiple paths) — this is what makes
  // it draggable/resizable/recolorable like any other canvas object rather
  // than a static image.
  async function addStickerIcon(face, Icon) {
    const cv2 = await resolveFaceCanvas(face)
    if (!cv2) return
    const svgMarkup = renderToStaticMarkup(<Icon size={64} color={palette.primary || '#1a1a1a'} strokeWidth={1.5} />)
    const { objects, options } = await loadSVGFromString(svgMarkup)
    const parsed = (objects || []).filter(Boolean)
    if (parsed.length === 0) return
    const obj = parsed.length > 1 ? util.groupSVGElements(parsed, options) : parsed[0]
    obj.set({ left: w / 2 - 24, top: h / 2 - 24, originX: 'left', originY: 'top' })
    obj.elementType = 'sticker'
    cv2.add(obj)
    cv2.setActiveObject(obj)
    cv2.renderAll()
    snapshot(face, cv2)
  }

  // Extra Elements-panel rows for anything added via "+ Add Element" — one
  // row per object (unlike the canonical rows, several of the same custom
  // type can coexist, e.g. two text blocks), always toggle-only since they
  // already exist once added.
  function buildCustomRows(face) {
    const data = getFaceObjects(face)
    if (data === null) return []
    const canonicalTypes = new Set((face === 'back' ? BACK_ELEMENT_ROWS : FRONT_ELEMENT_ROWS).flatMap((def) => def.match))
    return data.list
      .filter(({ obj }) => obj.elementType && CUSTOM_ELEMENT_LABELS[obj.elementType] && !canonicalTypes.has(obj.elementType))
      .map(({ obj, idx }, i) => ({
        key: `custom-${face}-${i}`,
        label: CUSTOM_ELEMENT_LABELS[obj.elementType],
        exists: true,
        visible: obj.visible !== false,
        obj, idx, live: data.live, canAdd: false,
      }))
  }

  // ── QR placeholder (visual only — no real QR generation yet) ──────
  // Same insertion pattern as addShape/uploadImage: create a standard
  // Fabric object, add it, select it, render, snapshot. Fully draggable,
  // resizable and deletable via the existing canvas controls — nothing
  // QR-specific about how Fabric treats it.
  // `face` is passed explicitly by callers that just awaited switchFace()
  // — the activeFace closure variable is stale at that point — and decides
  // both the default position and which history bucket the snapshot lands in.
  // Turns the selected destination + profile details into the exact string
  // that gets encoded into the QR (reusing features/qr's own destination
  // builder — vCard generation, URL schemes, etc. — instead of duplicating
  // that logic here). 'saveContact' is the default: scanning it saves the
  // person straight to the visitor's phone contacts, which is what most
  // people actually want from a physical business card's QR.
  function buildQrValue() {
    if (qrDestination === 'customLink') {
      return buildDestinationValue('custom', { value: qrCustomLink })
    }
    if (qrDestination === 'website') {
      return buildDestinationValue('website', { url: profile.website || '' })
    }
    if (qrDestination === 'digitalCard') {
      // No linked Digital Card URL is available from within the Business
      // Card editor — fall back to the website field (or the custom link,
      // if one was entered) rather than fabricating a URL.
      return buildDestinationValue('digitalCard', { url: qrCustomLink || profile.website || '' })
    }
    return buildDestinationValue('saveContact', {
      fullName: profile.personName || '',
      companyName: profile.companyName || '',
      designation: profile.designation || '',
      phone: profile.phone || '',
      email: profile.email || '',
      website: profile.website || '',
      address: profile.address || '',
    })
  }

  // Memoized so the QR panel's live preview only rebuilds its qr-code-styling
  // instance when the encoded value actually changes — not on every one of
  // this editor's frequent re-renders (canvas selection, history, etc.),
  // which otherwise cancels each render's in-flight SVG draw before it
  // finishes and leaves the preview permanently blank.
  const panelQrValue = useMemo(
    () => buildQrValue(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qrDestination, qrCustomLink, profile],
  )
  const panelQrSettings = useMemo(
    () => ({ ...createDefaultQrSettings(), data: panelQrValue, size: 96 }),
    [panelQrValue],
  )

  async function addQRPlaceholder(face = activeFace, cv2 = null) {
    const canvas = cv2 || fabricRef.current
    if (!canvas) return
    // On the back, restore the QR to wherever the current template's own
    // loadBack() would have placed it (side-by-side with the contact block,
    // or stacked, per that template's layout) rather than a generic spot —
    // otherwise "Remove from Back" + "Add to Back" visibly relocates it.
    // The front has no template-owned QR to match, so it keeps a fixed
    // bottom-right corner default.
    const backRect = face === 'back' && templateId !== 'blank'
      ? computeBackQrRect(templateId, w, h)
      : null
    const size = backRect ? backRect.size : 70
    const pos = backRect
      ? { left: backRect.left, top: backRect.top }
      : face === 'back'
        ? { left: w / 2 - size / 2, top: h - 90 }
        : { left: w - 90, top: h - 90 }

    const qrValue = buildQrValue()
    if (qrValue) {
      try {
        const dataUrl = await renderQrToDataUrl({
          ...createDefaultQrSettings(),
          data: qrValue,
          size: 240,
          margin: 8,
        })
        const img = await FabricImage.fromURL(dataUrl)
        img.set({ left: pos.left, top: pos.top, originX: 'left', originY: 'top' })
        img.scaleToWidth(size)
        img.elementType = 'qrCode'
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()
        snapshot(face, canvas)
        return
      } catch {
        // QR generation failed (e.g. the qr-code-styling library couldn't
        // render offscreen) — fall through to the static placeholder below
        // so the user still gets something to position, rather than nothing.
      }
    }

    const box = new Rect({
      width: size, height: size, fill: '#ffffff',
      stroke: '#9a968d', strokeWidth: 1.5,
      originX: 'left', originY: 'top',
    })
    const label = new Textbox('QR', {
      width: size, top: size / 2 - 7,
      fontSize: 11, fontWeight: '700', fill: '#9a968d',
      textAlign: 'center', fontFamily: 'Inter, sans-serif',
      originX: 'left', originY: 'top',
    })
    const group = new Group([box, label], {
      left: pos.left, top: pos.top,
      originX: 'left', originY: 'top',
    })
    group.elementType = 'qrCode'
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.renderAll()
    snapshot(face, canvas)
  }

  // Per-face existence check (read-only — never switches the active face,
  // unlike resolveFaceCanvas) so the QR panel can label its two buttons
  // "Add to Front"/"Remove from Front" and "Add to Back"/"Remove from Back"
  // independently of which face is currently being edited.
  function faceHasQR(face) {
    const data = getFaceObjects(face)
    if (!data) return false
    return data.list.some(({ obj }) => isQRPlaceholderObj(obj))
  }

  // Toggles the QR placeholder on a specific face regardless of which face
  // is currently active — resolveFaceCanvas switches to it first if needed
  // (same navigation behavior every other "+ Add Element" action uses).
  async function toggleQRForFace(face) {
    const canvas = await resolveFaceCanvas(face)
    if (!canvas) return
    const obj = canvas.getObjects().find(isQRPlaceholderObj)
    if (obj) {
      canvas.remove(obj)
      canvas.discardActiveObject()
      canvas.renderAll()
      setSelectedObj(null)
      snapshot(face, canvas)
    } else {
      await addQRPlaceholder(face, canvas)
    }
  }

  // Moves the selected QR placeholder to the other face: remove here,
  // switch (creating the back side first if needed), add a fresh one there.
  // The QR is just a placeholder box, so recreating it is equivalent to
  // moving it — there's no unique state to carry across.
  async function moveQRToFace(targetFace) {
    const sourceCanvas = getActiveCanvas()
    const obj = sourceCanvas?.getActiveObject()
    const sourceFace = getActiveEditFace()
    if (!obj || !sourceCanvas || targetFace === sourceFace) return
    sourceCanvas.remove(obj)
    sourceCanvas.discardActiveObject()
    sourceCanvas.renderAll()
    setSelectedObj(null)
    const targetCanvas = await resolveFaceCanvas(targetFace)
    await addQRPlaceholder(targetFace, targetCanvas)
  }

  // ── Change 5 property helpers ──────────────────────────────
  // Replaces an image's source while keeping its displayed position/size.
  async function replaceImage(file) {
    const cv2 = getActiveCanvas()
    const obj = cv2?.getActiveObject()
    if (!file || !obj || obj.type !== 'image' || !cv2) return
    const targetW = obj.getScaledWidth()
    const targetH = obj.getScaledHeight()
    const { left, top, angle, opacity, elementType, originX, originY } = obj
    const url = URL.createObjectURL(file)
    const newImg = await FabricImage.fromURL(url)
    newImg.set({ left, top, angle, opacity, originX, originY })
    newImg.scaleToWidth(targetW)
    if (newImg.getScaledHeight() < targetH) newImg.scaleToHeight(targetH)
    if (elementType) newImg.elementType = elementType
    cv2.remove(obj)
    cv2.add(newImg)
    cv2.setActiveObject(newImg)
    cv2.renderAll()
    onObjSelect(newImg)
    snapshot(getActiveEditFace(), cv2)
  }

  // Rounds an image's corners via a clipPath (Fabric images have no native
  // rx/ry like Rect does).
  function updateImageCornerRadius(val) {
    const cv2 = getActiveCanvas()
    const obj = cv2?.getActiveObject()
    if (!obj || obj.type !== 'image' || !cv2) return
    const num = parseFloat(val)
    obj.clipPath = num > 0
      ? new Rect({ width: obj.width, height: obj.height, rx: num, ry: num, originX: 'center', originY: 'center' })
      : null
    cv2.renderAll()
    setShapeProps((p) => ({ ...p, rx: num }))
    snapshot(getActiveEditFace(), cv2)
  }

  // Uniform scale slider shared by QR and generic group/sticker elements.
  function updateUniformScale(val) {
    const cv2 = getActiveCanvas()
    const obj = cv2?.getActiveObject()
    if (!obj || !cv2) return
    const scale = parseFloat(val)
    obj.set({ scaleX: scale, scaleY: scale })
    cv2.renderAll()
    snapshot(getActiveEditFace(), cv2)
  }

  // Recolors every fillable child of a group (e.g. a decorative icon/sticker).
  function recolorGroup(color) {
    const cv2 = getActiveCanvas()
    const obj = cv2?.getActiveObject()
    if (!obj || obj.type !== 'group' || !cv2) return
    obj.getObjects().forEach((child) => { if ('fill' in child) child.set('fill', color) })
    cv2.renderAll()
    snapshot(getActiveEditFace(), cv2)
  }

  // ── Save ──────────────────────────────────────────────────
  // Pure save — writes the current canvas to the DB via the parent's
  // onSave, but does not navigate anywhere. Callers decide what happens
  // next (the plain Save button exits to the gallery list same as before;
  // the exit-confirmation dialog's "Save & Exit" continues on to whichever
  // navigation the user actually triggered).
  async function handleSave() {
    if (!fabricRef.current) return
    // Save current face
    const currentJson = JSON.stringify(fabricRef.current.toObject(CUSTOM_FABRIC_PROPS))
    let updatedFaceData = { ...faceData, [activeFace]: currentJson }
    // In View Both mode the other face is a second live canvas that was
    // never written back to faceData yet (that only happens on exit) —
    // capture it too so a save from View Both never loses those edits.
    if (viewingBoth && secondaryFabricRef.current) {
      const secondaryFace = activeFace === 'front' ? 'back' : 'front'
      updatedFaceData = {
        ...updatedFaceData,
        [secondaryFace]: JSON.stringify(secondaryFabricRef.current.toObject(CUSTOM_FABRIC_PROPS)),
      }
    }
    setFaceData(updatedFaceData)
    const finalFront = updatedFaceData.front || currentJson
    const finalBack  = hasBack ? (updatedFaceData.back || null) : null

    const frontImg = activeFace === 'front'
      ? fabricRef.current.toDataURL({ format: 'png', quality: 1, multiplier: 3 })
      : await renderFaceThumbnail(finalFront, setup, 3)

    await onSave({
      templateId,
      setup: { ...setup, includeBack: hasBack },
      frontJson: finalFront,
      backJson:  finalBack,
      frontImg,
    })
    setHasBeenSaved(true)
    setHasUnsavedChanges(false)
  }

  // Gate for Exit / Gallery / Preview / any away-navigation: a brand-new
  // card that's never been saved always confirms (regardless of whether
  // anything was actually edited — an empty card row already exists in the
  // DB and shouldn't linger there unconfirmed); an already-saved card only
  // confirms if there are edits since the last save. `purpose` only
  // changes the dialog's wording — Preview needs "save before previewing"
  // phrasing rather than "save before exiting", since pendingAction opens
  // the in-editor preview rather than navigating away.
  function requestExit(pendingAction, purpose = 'exit') {
    if (!hasBeenSaved) {
      setExitDialog({ scenario: 'new', pendingAction, purpose })
      return
    }
    if (hasUnsavedChanges) {
      setExitDialog({ scenario: 'existing', pendingAction, purpose })
      return
    }
    pendingAction()
  }

  // Preview always needs the latest saved state (it reads frontJson/backJson
  // from the DB, not the live canvas), so unsaved edits must be saved first
  // — reuses the same save/discard/keep-editing dialog as Exit and Gallery.
  function handlePreviewClick() {
    requestExit(() => setShowPreview(true), 'preview')
  }

  async function confirmSaveAndExit() {
    const { pendingAction } = exitDialog
    setExitDialog(null)
    await handleSave()
    pendingAction()
  }

  async function confirmDiscard() {
    const { scenario, pendingAction } = exitDialog
    setExitDialog(null)
    if (scenario === 'new') {
      // Never saved — delete the empty card row so it doesn't show up as a
      // blank draft in the Business Cards list. onDiscardNew owns the
      // delete + navigate (it always goes to the list, regardless of
      // whether Exit or Gallery triggered this).
      await onDiscardNew?.()
    } else {
      // Existing card — nothing was ever written since the last save, so
      // there's nothing to revert in the DB; just leave.
      pendingAction()
    }
  }

  function confirmKeepEditing() {
    setExitDialog(null)
  }

  // ── Export ────────────────────────────────────────────────
  // ── Zoom ──────────────────────────────────────────────────
  const zoomIn  = () => setZoom((z) => Math.min(3, parseFloat((z + 0.1).toFixed(1))))
  const zoomOut = () => setZoom((z) => Math.max(0.3, parseFloat((z - 0.1).toFixed(1))))

  const canUndo = histIdx[activeFace] > 0
  const canRedo = histIdx[activeFace] < (history[activeFace]?.length || 0) - 1

  // "+ Add Element" popover — a button that expands into the five element
  // types, plus a nested icon grid for the Icon/Sticker option.
  function renderAddElementMenu(face) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="secondary-button"
          style={{ width: '100%', fontSize: 12, marginTop: 8 }}
          onClick={() => { setAddMenuFace(addMenuFace === face ? null : face); setIconGridFace(null) }}
        >
          + Add Element
        </button>
        {addMenuFace === face && (
          <div className="bce-add-menu">
            <button type="button" onClick={() => { addTextBlock(face); setAddMenuFace(null) }}>Text Block</button>
            <button type="button" onClick={() => { addSocialHandle(face); setAddMenuFace(null) }}>Social Handle</button>
            <button type="button" onClick={() => { addDivider(face); setAddMenuFace(null) }}>Divider Line</button>
            <label className="bce-add-menu-item">
              Image
              <input
                type="file" accept="image/*" hidden
                onChange={(e) => { addCustomImage(face, e.target.files?.[0]); e.target.value = ''; setAddMenuFace(null) }}
              />
            </label>
            <button type="button" onClick={() => { setIconGridFace(face); setAddMenuFace(null) }}>Icon / Sticker</button>
          </div>
        )}
        {iconGridFace === face && (
          <div className="bce-icon-grid-pop">
            <div className="bce-icon-grid">
              {STICKER_ICONS.map(({ key, Icon }) => (
                <button key={key} type="button" onClick={() => { addStickerIcon(face, Icon); setIconGridFace(null) }}>
                  <Icon size={18} />
                </button>
              ))}
            </div>
            <button type="button" className="text-button" style={{ width: '100%', marginTop: 6, fontSize: 12 }} onClick={() => setIconGridFace(null)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    )
  }

  // Reads whichever face is currently live straight off its Fabric canvas
  // (not out of `faceData` state) so the preview can never show blank/stale
  // content for the active face regardless of React state-update timing —
  // faceData is only used as a fallback for the face that ISN'T currently
  // live (the inactive face outside View Both). This mirrors handleSave's
  // own capture logic exactly, so what Preview shows always matches what a
  // save right now would persist.
  function currentFaceJson(face) {
    if (face === activeFace && fabricRef.current) {
      return JSON.stringify(fabricRef.current.toObject(CUSTOM_FABRIC_PROPS))
    }
    if (viewingBoth && secondaryFabricRef.current) {
      const secondaryFace = activeFace === 'front' ? 'back' : 'front'
      if (face === secondaryFace) {
        return JSON.stringify(secondaryFabricRef.current.toObject(CUSTOM_FABRIC_PROPS))
      }
    }
    return faceData[face] || null
  }

  if (showPreview) {
    return (
      <CardPreviewScreen
        card={{
          id: cardId,
          title: getTemplate(templateId)?.label || 'Business Card',
          businessCard: {
            frontJson: currentFaceJson('front'),
            backJson: hasBack ? currentFaceJson('back') : null,
            setup: { ...setup, includeBack: hasBack },
          },
        }}
        onClose={() => setShowPreview(false)}
        onEdit={() => setShowPreview(false)}
      />
    )
  }

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════
  return (
    <div className="bce-root">

      {/* ── Top Toolbar ─────────────────────────────────── */}
      <div className="bce-topbar">
        {/* Left actions */}
        <button type="button" className="bce-tb-btn" onClick={resetCanvas} title="Reset template">
          <RotateCcw size={14} /> Reset
        </button>
        <button type="button" className="bce-tb-btn" onClick={undo} disabled={!canUndo} title="Undo">
          <Undo2 size={14} /> Undo
        </button>
        <button type="button" className="bce-tb-btn" onClick={redo} disabled={!canRedo} title="Redo">
          <Redo2 size={14} /> Redo
        </button>
        <button type="button" className="bce-tb-btn" onClick={deleteSelected} disabled={!selectedObj} title="Delete">
          <Trash2 size={14} /> Delete
        </button>

        <div className="bce-topbar-sep" />

        {/* Center context actions */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="bce-tb-btn"
            disabled={!selectedObj}
            onClick={() => setShowOpacity((s) => !s)}
            title="Opacity"
          >
            <Sliders size={14} /> Opacity
          </button>
          {showOpacity && selectedObj && (
            <div className="bce-opacity-pop">
              <label>Opacity</label>
              <input
                type="range" min="0" max="1" step="0.01"
                value={commonProps.opacity}
                style={{ flex: 1, accentColor: 'var(--navy)' }}
                onChange={(e) => { setObjOpacity(e.target.value); setCommonProps((p) => ({ ...p, opacity: e.target.value })) }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', minWidth: 28 }}>
                {Math.round(commonProps.opacity * 100)}%
              </span>
            </div>
          )}
        </div>

        <button type="button" className="bce-tb-btn" disabled={!selectedObj} onClick={bringForward} title="Bring forward">
          <Layers size={14} /> Layer ↑
        </button>
        <button type="button" className="bce-tb-btn" disabled={!selectedObj} onClick={flip} title="Flip horizontal">
          <FlipHorizontal size={14} /> Flip
        </button>
        <button type="button" className="bce-tb-btn" disabled={!selectedObj} onClick={duplicate} title="Duplicate">
          <Copy size={14} /> Duplicate
        </button>

        <div className="bce-topbar-space" />

        {/* Right: exit / back / save */}
        {onExit && (
          <button
            type="button"
            className="secondary-button"
            style={{ padding: '7px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => requestExit(onExit)}
            title="Exit — back to your business cards"
          >
            <X size={14} /> Exit
          </button>
        )}
        <button type="button" className="secondary-button" style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => requestExit(onBack)}>
          ← Gallery
        </button>
      </div>

      {/* ── Editor Body ───────────────────────────────────── */}
      <div className="bce-body">

        {/* Left icon rail */}
        <nav className="bce-rail" onClick={() => setShowOpacity(false)}>
          {LEFT_PANELS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className={`bce-rail-btn${activePanel === key ? ' active' : ''}`}
              onClick={() => setActivePanel(activePanel === key ? null : key)}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </nav>

        {/* Left expanded panel */}
        {activePanel && (
          <div className="bce-lpanel">
            <div className="bce-lpanel-head">{LEFT_PANELS.find((p) => p.key === activePanel)?.label}</div>
            <div className="bce-lpanel-body">

              {/* Templates */}
              {activePanel === 'templates' && (
                <div className="bce-lsec">
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
                    Switch template. Current edits will be lost.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        style={{
                          border: '1.5px solid ' + (t.id === templateId ? 'var(--navy)' : 'var(--line)'),
                          borderRadius: 9,
                          overflow: 'hidden',
                          background: '#fff',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        onClick={onBack}
                      >
                        <div dangerouslySetInnerHTML={{ __html: t.svgPreview(palette) }} style={{ display: 'block', lineHeight: 0 }} />
                        <div style={{ padding: '6px', fontSize: 9, fontWeight: 700, color: 'var(--navy)' }}>{t.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Text */}
              {activePanel === 'text' && (
                <div className="bce-lsec">
                  <div className="bce-lsec-label">Add Text</div>
                  {[
                    { k: 'heading', label: 'Heading',    size: 24 },
                    { k: 'sub',     label: 'Subheading', size: 17 },
                    { k: 'body',    label: 'Body',        size: 13 },
                    { k: 'caption', label: 'Caption',     size: 10 },
                  ].map(({ k, label, size }) => (
                    <button key={k} type="button" className="bce-text-style-btn" onClick={() => addTextPreset(k)}>
                      <strong style={{ fontSize: size, lineHeight: 1 }}>{label}</strong>
                      <small>Click to add</small>
                    </button>
                  ))}

                  {[
                    { key: 'personName',  label: 'Name' },
                    { key: 'designation', label: 'Designation' },
                    { key: 'companyName', label: 'Company' },
                    { key: 'phone',       label: 'Phone' },
                    { key: 'email',       label: 'Email' },
                    { key: 'website',     label: 'Website' },
                    { key: 'location',    label: 'Location' },
                  ].filter(({ key }) => profile?.[key]).length > 0 && (
                    <>
                      <div className="bce-lsec-label" style={{ marginTop: 16 }}>Insert Your Details</div>
                      {[
                        { key: 'personName',  label: 'Name',        size: 20 },
                        { key: 'designation', label: 'Designation', size: 13 },
                        { key: 'companyName', label: 'Company',     size: 13 },
                        { key: 'phone',       label: 'Phone',       size: 12 },
                        { key: 'email',       label: 'Email',       size: 12 },
                        { key: 'website',     label: 'Website',     size: 12 },
                        { key: 'location',    label: 'Location',    size: 12 },
                      ].filter(({ key }) => profile?.[key]).map(({ key, label, size }) => (
                        <button
                          key={key}
                          type="button"
                          className="bce-text-style-btn"
                          onClick={() => insertDetailText(profile[key], size, key)}
                        >
                          <strong style={{ fontSize: 13 }}>{label}</strong>
                          <small>{profile[key]}</small>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Shapes */}
              {activePanel === 'shapes' && (
                <div className="bce-lsec">
                  <div className="bce-lsec-label">Shapes</div>
                  <div className="bce-tool-grid">
                    {[
                      { k: 'rect',    label: 'Rectangle', Icon: Square },
                      { k: 'rounded', label: 'Rounded',   Icon: Square },
                      { k: 'circle',  label: 'Circle',    Icon: () => <span style={{ fontSize: 18 }}>◯</span> },
                      { k: 'tri',     label: 'Triangle',  Icon: () => <span style={{ fontSize: 16 }}>△</span> },
                      { k: 'line',    label: 'Line',       Icon: Minus },
                    ].map(({ k, label, Icon: I }) => (
                      <button key={k} type="button" className="bce-tool" onClick={() => addShape(k)}>
                        <I size={18} />{label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Images */}
              {activePanel === 'images' && (
                <div className="bce-lsec">
                  <div className="bce-lsec-label">Upload Image</div>
                  <label className="bce-upload-zone">
                    <Image size={24} color="var(--muted)" />
                    <p>Click to upload<br />(PNG, JPG, SVG)</p>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => { uploadImage(e.target.files?.[0]); e.target.value = '' }}
                    />
                  </label>
                </div>
              )}

              {/* QR — live preview generated by features/qr's own engine
                  (same module the QR Studio and Digital Card use), reusing
                  buildDestinationValue for the actual encoded payload
                  (vCard for Save Contact, URL schemes for the others) —
                  see buildQrValue() / addQRPlaceholder(). */}
              {activePanel === 'qr' && (
                <div className="bce-lsec">
                  <div className="bce-lsec-label">QR Code</div>
                  <div className="bce-qr-placeholder-box">
                    {panelQrValue
                      ? <QRCode settings={panelQrSettings} size={96} />
                      : <QrCode size={26} color="var(--muted)" />}
                  </div>

                  <p className="bce-qr-section-label">Links to</p>
                  <div className="bce-qr-dest-options">
                    {QR_DESTINATIONS.map(({ key, label }) => (
                      <label key={key} className="bce-qr-dest-option">
                        <input
                          type="radio"
                          name="qrDestination"
                          value={key}
                          checked={qrDestination === key}
                          onChange={() => setQrDestination(key)}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>

                  {qrDestination === 'customLink' && (
                    <input
                      type="text"
                      className="bce-input"
                      style={{ width: '100%', marginTop: 8, marginBottom: 4 }}
                      placeholder="https://..."
                      value={qrCustomLink}
                      onChange={(e) => setQrCustomLink(e.target.value)}
                    />
                  )}

                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: '10px 0 14px' }}>
                    {qrDestination === 'saveContact'
                      ? 'Scanning this saves your contact details straight to the visitor’s phone.'
                      : 'QR code will link to your ' + (qrDestination === 'website' ? 'website' : qrDestination === 'digitalCard' ? 'digital card' : 'custom link') + '.'}
                  </p>

                  <button
                    type="button"
                    className={faceHasQR('front') ? 'secondary-button' : 'primary-button'}
                    style={{ width: '100%', fontSize: 13, marginBottom: 8 }}
                    onClick={() => toggleQRForFace('front')}
                  >
                    {faceHasQR('front') ? 'Remove from Front' : 'Add to Front'}
                  </button>
                  <button
                    type="button"
                    className={faceHasQR('back') ? 'secondary-button' : 'primary-button'}
                    style={{ width: '100%', fontSize: 13, marginBottom: 10 }}
                    onClick={() => toggleQRForFace('back')}
                  >
                    {faceHasQR('back') ? 'Remove from Back' : 'Add to Back'}
                  </button>
                </div>
              )}

              {/* Elements — canonical FRONT + BACK checklists, always both visible */}
              {activePanel === 'elements' && (
                <div className="bce-lsec">
                  <div className={`bce-lsec-label${viewingBoth && viewBothSelectedFace === 'front' ? ' active-face' : ''}`}>FRONT</div>
                  {buildElementRows('front', FRONT_ELEMENT_ROWS).map((row) => (
                    <div
                      key={row.key}
                      className={`bce-layer-item${row.live && selectedObj && selectedObj === row.obj ? ' active' : ''}`}
                      style={{ opacity: !row.exists && !row.canAdd ? 0.45 : row.exists && !row.visible ? 0.6 : 1 }}
                    >
                      <span
                        className="bce-layer-name"
                        style={{ cursor: row.exists && row.visible ? 'pointer' : 'default' }}
                        onClick={() => selectRowOnCanvas(row, 'front')}
                      >
                        {row.label}
                      </span>
                      <label className="bc-switch" title={row.exists && row.visible ? 'Hide on canvas' : 'Show on canvas'}>
                        <input
                          type="checkbox"
                          checked={row.exists && row.visible}
                          disabled={!row.exists && !row.canAdd}
                          onChange={() => handleRowToggle(row, 'front')}
                        />
                        <span className="bc-switch-track" />
                      </label>
                    </div>
                  ))}
                  {buildCustomRows('front').map((row) => (
                    <div
                      key={row.key}
                      className={`bce-layer-item${row.live && selectedObj && selectedObj === row.obj ? ' active' : ''}`}
                      style={{ opacity: row.visible ? 1 : 0.6 }}
                    >
                      <span
                        className="bce-layer-name"
                        style={{ cursor: row.visible ? 'pointer' : 'default' }}
                        onClick={() => selectRowOnCanvas(row, 'front')}
                      >
                        {row.label}
                      </span>
                      <label className="bc-switch" title={row.visible ? 'Hide on canvas' : 'Show on canvas'}>
                        <input type="checkbox" checked={row.visible} onChange={() => toggleObjectVisibility(row, 'front')} />
                        <span className="bc-switch-track" />
                      </label>
                    </div>
                  ))}
                  {renderAddElementMenu('front')}

                  <div className={`bce-lsec-label${viewingBoth && viewBothSelectedFace === 'back' ? ' active-face' : ''}`} style={{ marginTop: 18 }}>BACK</div>
                  {buildElementRows('back', BACK_ELEMENT_ROWS).map((row) => (
                        <div
                          key={row.key}
                          className={`bce-layer-item${row.live && selectedObj && selectedObj === row.obj ? ' active' : ''}`}
                          style={{ opacity: !row.exists && !row.canAdd ? 0.45 : row.exists && !row.visible ? 0.6 : 1 }}
                        >
                          <span
                            className="bce-layer-name"
                            style={{ cursor: row.exists && row.visible ? 'pointer' : 'default' }}
                            onClick={() => selectRowOnCanvas(row, 'back')}
                          >
                            {row.label}
                          </span>
                          <label className="bc-switch" title={row.alwaysOn ? 'Always shown' : row.exists && row.visible ? 'Hide on canvas' : 'Show on canvas'}>
                            <input
                              type="checkbox"
                              checked={row.exists && row.visible}
                              disabled={row.alwaysOn || (!row.exists && !row.canAdd)}
                              onChange={() => handleRowToggle(row, 'back')}
                            />
                            <span className="bc-switch-track" />
                          </label>
                        </div>
                      ))}
                      {buildCustomRows('back').map((row) => (
                        <div
                          key={row.key}
                          className={`bce-layer-item${row.live && selectedObj && selectedObj === row.obj ? ' active' : ''}`}
                          style={{ opacity: row.visible ? 1 : 0.6 }}
                        >
                          <span
                            className="bce-layer-name"
                            style={{ cursor: row.visible ? 'pointer' : 'default' }}
                            onClick={() => selectRowOnCanvas(row, 'back')}
                          >
                            {row.label}
                          </span>
                          <label className="bc-switch" title={row.visible ? 'Hide on canvas' : 'Show on canvas'}>
                            <input type="checkbox" checked={row.visible} onChange={() => toggleObjectVisibility(row, 'back')} />
                            <span className="bc-switch-track" />
                          </label>
                        </div>
                      ))}
                  {renderAddElementMenu('back')}
                </div>
              )}

            </div>
          </div>
        )}

        {/* Canvas — both faces are genuinely live/interactive in View Both.
            `canvasElRef`'s <canvas> and `secondaryCanvasElRef`'s <canvas>
            always render in the same two JSX slots (never conditionally
            mounted/unmounted) — only their CSS order/scale/visibility
            change — because moving a <canvas> to a different position in
            the React tree would unmount and recreate the DOM node Fabric
            is bound to, breaking the live canvas it wraps. */}
        <div className="bce-canvas-area" ref={canvasAreaRef} onClick={() => setShowOpacity(false)}>
          {(() => {
            const secondaryFace = activeFace === 'front' ? 'back' : 'front'
            return (
              <>
                <div
                  className="bce-vb-slot"
                  style={{ order: viewingBoth ? (activeFace === 'front' ? 0 : 1) : 0 }}
                >
                  <div className="bce-canvas-wrap" style={{ transform: `scale(${viewingBoth ? zoom * 0.62 : zoom})` }}>
                    <canvas ref={canvasElRef} />
                  </div>
                  {viewingBoth && <span className="bce-vb-slot-label">{activeFace === 'front' ? 'Front' : 'Back'}</span>}
                </div>
                <div
                  className="bce-vb-slot"
                  style={{ order: activeFace === 'front' ? 1 : 0, display: viewingBoth ? 'flex' : 'none' }}
                >
                  <div className="bce-canvas-wrap" style={{ transform: `scale(${zoom * 0.62})` }}>
                    <canvas ref={secondaryCanvasElRef} />
                  </div>
                  {viewingBoth && <span className="bce-vb-slot-label">{secondaryFace === 'front' ? 'Front' : 'Back'}</span>}
                </div>
              </>
            )
          })()}
        </div>

        {/* Right properties panel */}
        <div className="bce-rpanel">
          {!selectedObj ? (
            <>
              <div className="bce-rp-title"><h3>Properties</h3></div>
              <div className="bce-rp-empty">
                <div className="bce-rp-empty-icon">👆</div>
                <p>Click any element on the canvas to edit its properties here.</p>
              </div>
            </>
          ) : (
            <>
              <div className="bce-rp-title">
                <h3>
                  {viewingBoth && viewBothSelectedFace ? (viewBothSelectedFace === 'front' ? 'Front · ' : 'Back · ') : ''}
                  {{ text: 'Edit Text', image: 'Edit Image', qr: 'Edit QR Code', group: 'Edit Group' }[elementKind] || 'Edit Shape'}
                </h3>
                <button
                  type="button"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12 }}
                  onClick={() => {
                    // Must clear Fabric's own active object too, not just React
                    // state — otherwise its selection-handle chrome (corner
                    // squares, rotation handle) keeps rendering on every
                    // renderAll() even though the panel shows "nothing selected".
                    const cv2 = getActiveCanvas()
                    cv2?.discardActiveObject()
                    cv2?.renderAll()
                    setSelectedObj(null)
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="bce-rp-body">

                {/* Opacity — shared by every element kind */}
                <div className="bce-rp-section">
                  <div className="bce-rp-label">Opacity</div>
                  <div className="bce-rp-row">
                    <input
                      type="range" min="0" max="1" step="0.01"
                      value={commonProps.opacity}
                      className="bce-slider"
                      onChange={(e) => setObjOpacity(e.target.value)}
                    />
                    <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 32, textAlign: 'right' }}>
                      {Math.round((commonProps.opacity ?? 1) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Text name input (for text objects) */}
                {isText && (
                  <div className="bce-rp-section">
                    <textarea
                      style={{
                        width: '100%', border: '1px solid var(--line)', borderRadius: 9,
                        padding: '8px 10px', fontSize: 13, fontFamily: 'inherit',
                        color: 'var(--navy)', resize: 'none', outline: 'none', height: 56, lineHeight: 1.4,
                      }}
                      value={selectedObj?.text || ''}
                      onChange={(e) => {
                        selectedObj.set('text', e.target.value)
                        fabricRef.current?.renderAll()
                        setTextProps((p) => ({ ...p }))
                      }}
                      onBlur={() => snapshot(activeFace, fabricRef.current)}
                    />
                  </div>
                )}

                {/* Font */}
                {isText && (
                  <div className="bce-rp-section">
                    <div className="bce-rp-label">Font</div>
                    <div className="bce-rp-row">
                      <select
                        className="bce-select"
                        value={textProps.fontFamily}
                        onChange={(e) => updateText('fontFamily', e.target.value)}
                      >
                        {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                    <div className="bce-rp-row">
                      <span className="bce-rp-key">Size</span>
                      <button type="button" className="bce-zoom-btn" style={{ width: 28, height: 28 }} onClick={() => updateText('fontSize', Math.max(6, textProps.fontSize - 1))}>−</button>
                      <input
                        className="bce-input-sm" type="number" style={{ flex: 1, textAlign: 'center' }}
                        value={textProps.fontSize}
                        onChange={(e) => updateText('fontSize', parseInt(e.target.value, 10) || textProps.fontSize)}
                      />
                      <button type="button" className="bce-zoom-btn" style={{ width: 28, height: 28 }} onClick={() => updateText('fontSize', textProps.fontSize + 1)}>+</button>
                    </div>
                    <div className="bce-rp-row">
                      <span className="bce-rp-key">Style</span>
                      <button
                        type="button"
                        className={`bce-align-btn${['bold', '700', '800', '900'].includes(String(textProps.fontWeight)) ? ' active' : ''}`}
                        onClick={() => updateText('fontWeight', ['bold', '700', '800', '900'].includes(String(textProps.fontWeight)) ? 'normal' : 'bold')}
                        title="Bold"
                      >
                        <Bold size={14} />
                      </button>
                      <button
                        type="button"
                        className={`bce-align-btn${textProps.fontStyle === 'italic' ? ' active' : ''}`}
                        onClick={() => updateText('fontStyle', textProps.fontStyle === 'italic' ? 'normal' : 'italic')}
                        title="Italic"
                      >
                        <Italic size={14} />
                      </button>
                    </div>
                    <div className="bce-rp-row">
                      <span className="bce-rp-key">Color</span>
                      <input
                        type="color"
                        className="bce-color-btn"
                        value={textProps.fill.startsWith('#') ? textProps.fill : '#000000'}
                        onChange={(e) => updateText('fill', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Text alignment */}
                {isText && (
                  <div className="bce-rp-section">
                    <div className="bce-rp-label">Alignment</div>
                    <div className="bce-align-row">
                      {[
                        { key: 'left',    Icon: AlignLeft },
                        { key: 'center',  Icon: AlignCenter },
                        { key: 'right',   Icon: AlignRight },
                        { key: 'justify', Icon: AlignJustify },
                      ].map(({ key, Icon: I }) => (
                        <button
                          key={key}
                          type="button"
                          className={`bce-align-btn${textProps.textAlign === key ? ' active' : ''}`}
                          onClick={() => updateText('textAlign', key)}
                        >
                          <I size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Text spacing */}
                {isText && (
                  <div className="bce-rp-section">
                    <div className="bce-rp-label">Spacing</div>
                    <div className="bce-rp-row">
                      <span className="bce-rp-key">Letter</span>
                      <input
                        type="range" min="-100" max="500" step="5"
                        value={textProps.charSpacing}
                        className="bce-slider"
                        onChange={(e) => updateText('charSpacing', parseInt(e.target.value, 10))}
                      />
                      <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 24, textAlign: 'right' }}>{textProps.charSpacing}</span>
                    </div>
                    <div className="bce-rp-row">
                      <span className="bce-rp-key">Line</span>
                      <input
                        type="range" min="0.5" max="3" step="0.1"
                        value={textProps.lineHeight}
                        className="bce-slider"
                        onChange={(e) => updateText('lineHeight', parseFloat(e.target.value))}
                      />
                      <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 24, textAlign: 'right' }}>{textProps.lineHeight}</span>
                    </div>
                  </div>
                )}

                {/* Text effects */}
                {isText && (
                  <div className="bce-rp-section">
                    <div className="bce-rp-label">Effects</div>
                    <div className="bce-toggle-row">
                      <span>Curved text</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Coming soon</span>
                    </div>
                    <div className="bce-toggle-row">
                      <span>Outline</span>
                      <label className="bc-switch">
                        <input type="checkbox" checked={!!selectedObj?.stroke} onChange={(e) => updateText('stroke', e.target.checked ? (palette.primary || '#000') : '')} />
                        <span className="bc-switch-track" />
                      </label>
                    </div>
                    <div className="bce-toggle-row">
                      <span>Shadow</span>
                      <label className="bc-switch">
                        <input
                          type="checkbox"
                          checked={!!selectedObj?.shadow}
                          onChange={(e) => {
                            selectedObj.set('shadow', e.target.checked ? { color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 2, offsetY: 2 } : null)
                            fabricRef.current?.renderAll()
                            snapshot(activeFace, fabricRef.current)
                          }}
                        />
                        <span className="bc-switch-track" />
                      </label>
                    </div>
                    <div className="bce-toggle-row">
                      <span>Underline</span>
                      <label className="bc-switch">
                        <input type="checkbox" checked={textProps.underline} onChange={(e) => updateText('underline', e.target.checked)} />
                        <span className="bc-switch-track" />
                      </label>
                    </div>
                  </div>
                )}

                {/* Shape fill/stroke */}
                {elementKind === 'shape' && (
                  <div className="bce-rp-section">
                    <div className="bce-rp-label">Fill & Stroke</div>
                    <div className="bce-rp-row">
                      <span className="bce-rp-key">Fill</span>
                      <input
                        type="color"
                        className="bce-color-btn"
                        value={shapeProps.fill.startsWith('#') ? shapeProps.fill : '#334155'}
                        onChange={(e) => updateShape('fill', e.target.value)}
                      />
                    </div>
                    <div className="bce-rp-row">
                      <span className="bce-rp-key">Stroke</span>
                      <input
                        type="color"
                        className="bce-color-btn"
                        value={(shapeProps.stroke || '#000000').startsWith('#') ? (shapeProps.stroke || '#000000') : '#000000'}
                        onChange={(e) => updateShape('stroke', e.target.value)}
                      />
                      <input
                        className="bce-input-sm"
                        type="number" min="0" max="20"
                        value={shapeProps.strokeWidth}
                        onChange={(e) => updateShape('strokeWidth', parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                    {selectedObj?.type === 'rect' && (
                      <div className="bce-rp-row">
                        <span className="bce-rp-key">Corner radius</span>
                        <input
                          type="range" min="0" max="50" step="1"
                          value={shapeProps.rx}
                          className="bce-slider"
                          onChange={(e) => updateShape('rx', parseInt(e.target.value, 10))}
                        />
                        <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 24, textAlign: 'right' }}>{shapeProps.rx}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Image controls */}
                {elementKind === 'image' && (
                  <div className="bce-rp-section">
                    <div className="bce-rp-label">Image</div>
                    <label className="bce-upload-zone" style={{ padding: '10px 8px', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Replace Image</span>
                      <input
                        type="file" accept="image/*" hidden
                        onChange={(e) => { replaceImage(e.target.files?.[0]); e.target.value = '' }}
                      />
                    </label>
                    <div className="bce-rp-row">
                      <span className="bce-rp-key">Corner radius</span>
                      <input
                        type="range" min="0" max="50" step="1"
                        value={shapeProps.rx}
                        className="bce-slider"
                        onChange={(e) => updateImageCornerRadius(e.target.value)}
                      />
                      <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 24, textAlign: 'right' }}>{shapeProps.rx}</span>
                    </div>
                  </div>
                )}

                {/* QR controls */}
                {elementKind === 'qr' && (
                  <div className="bce-rp-section">
                    <div className="bce-rp-label">QR Code</div>
                    <div className="bce-rp-row">
                      <span className="bce-rp-key">Size</span>
                      <input
                        type="range" min="0.5" max="2.5" step="0.05"
                        value={selectedObj.scaleX || 1}
                        className="bce-slider"
                        onChange={(e) => updateUniformScale(e.target.value)}
                      />
                    </div>
                    <div className="bce-rp-row" style={{ gap: 6 }}>
                      <button type="button" className="secondary-button" style={{ flex: 1, fontSize: 12 }} disabled={activeFace === 'front'} onClick={() => moveQRToFace('front')}>
                        Add to Front
                      </button>
                      <button type="button" className="secondary-button" style={{ flex: 1, fontSize: 12 }} disabled={activeFace === 'back'} onClick={() => moveQRToFace('back')}>
                        Add to Back
                      </button>
                    </div>
                  </div>
                )}

                {/* Generic group / sticker controls (e.g. a future motif icon) */}
                {elementKind === 'group' && (
                  <div className="bce-rp-section">
                    <div className="bce-rp-label">Group</div>
                    <div className="bce-rp-row">
                      <span className="bce-rp-key">Color</span>
                      <input type="color" className="bce-color-btn" onChange={(e) => recolorGroup(e.target.value)} />
                    </div>
                    <div className="bce-rp-row">
                      <span className="bce-rp-key">Size</span>
                      <input
                        type="range" min="0.3" max="3" step="0.05"
                        value={selectedObj.scaleX || 1}
                        className="bce-slider"
                        onChange={(e) => updateUniformScale(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Background color picker */}
                {elementKind === 'shape' && activePanel === 'shapes' && (
                  <div className="bce-rp-section">
                    <div className="bce-rp-label">Background</div>
                    <div className="bce-palette">
                      {BG_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="bce-swatch"
                          style={{ background: c, border: c === '#ffffff' ? '2px solid #e5e3dd' : undefined }}
                          onClick={() => setBackground(c)}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Position & Size */}
                <div className="bce-rp-section">
                  <div className="bce-rp-label">Position & Size</div>
                  <div className="bce-rp-row">
                    <span className="bce-rp-key">X</span>
                    <input className="bce-input-sm" type="number" value={commonProps.left} onChange={(e) => updateCommon('left', e.target.value)} />
                    <span className="bce-rp-key" style={{ textAlign: 'right' }}>Y</span>
                    <input className="bce-input-sm" type="number" value={commonProps.top} onChange={(e) => updateCommon('top', e.target.value)} />
                  </div>
                  <div className="bce-rp-row">
                    <span className="bce-rp-key">W</span>
                    <input className="bce-input-sm" type="number" value={commonProps.width} onChange={(e) => updateCommon('width', e.target.value)} />
                    <span className="bce-rp-key" style={{ textAlign: 'right' }}>H</span>
                    <input className="bce-input-sm" type="number" value={commonProps.height} onChange={(e) => updateCommon('height', e.target.value)} />
                  </div>
                  <div className="bce-rp-row">
                    <span className="bce-rp-key">Angle</span>
                    <input className="bce-input-sm" type="number" value={commonProps.angle} onChange={(e) => updateCommon('angle', e.target.value)} />
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 3 }}>°</span>
                  </div>
                </div>

                {/* Arrange */}
                <div className="bce-rp-section">
                  <div className="bce-rp-label">Arrange</div>
                  <div className="bce-arrange-row">
                    <button type="button" className="bce-arrange-btn" onClick={bringForward} title="Bring forward"><ChevronUp size={13} /></button>
                    <button type="button" className="bce-arrange-btn" onClick={sendBackward} title="Send backward"><ChevronDown size={13} /></button>
                    <button type="button" className="bce-arrange-btn" onClick={duplicate} title="Duplicate"><Copy size={13} /></button>
                    <button type="button" className="bce-arrange-btn del" onClick={deleteSelected} title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Bar ────────────────────────────────────── */}
      <div className="bce-bottombar">
        {/* Left: actions. "Saved" shows only when this exact design is
            actually persisted — i.e. the card was opened with savedFront
            from the DB (hasBeenSaved) and hasn't been touched since. A
            brand-new card, or one whose template was just swapped via the
            gallery, has nothing written yet (handleSelectTemplate passes no
            savedFront), so it correctly offers Save Progress instead. */}
        {hasBeenSaved && !hasUnsavedChanges ? (
          <span className="bce-saved-indicator">
            <Check size={13} /> Saved
          </span>
        ) : (
          <button
            type="button"
            className="secondary-button"
            style={{ padding: '7px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleSave}
          >
            <Save size={13} /> Save Progress
          </button>
        )}
        {/* No Download here: exporting is gated on purchase, and the editor
            is only reachable for cards that haven't been bought yet (see
            BusinessCardFlow's route guard). Downloads live on the preview
            screen, which unlocks them once the card is owned. */}
        <button
          type="button"
          className="secondary-button"
          style={{ padding: '7px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={handlePreviewClick}
        >
          <Eye size={13} /> Preview
        </button>

        <div className="bce-bottombar-space" />

        {/* Center: face tabs */}
        <div className="bce-face-tabs">
          <button
            type="button"
            className={`bce-face-tab${!viewingBoth && activeFace === 'front' ? ' active' : ''}`}
            onClick={() => goToFaceFromBoth('front')}
          >
            Front Side
          </button>
          <button
            type="button"
            className={`bce-face-tab${!viewingBoth && activeFace === 'back' ? ' active' : ''}`}
            onClick={() => goToFaceFromBoth('back')}
          >
            Back Side
          </button>
          <button
            type="button"
            className={`bce-face-tab${viewingBoth ? ' active' : ''}`}
            onClick={() => (viewingBoth ? exitViewBoth() : enterViewBoth())}
          >
            View Both
          </button>
        </div>

        <div className="bce-bottombar-space" />

        {/* Right: zoom */}
        <div className="bce-zoom-row">
          <button type="button" className="bce-zoom-btn" onClick={zoomOut}>−</button>
          <span className="bce-zoom-val">{Math.round(zoom * 100)}%</span>
          <button type="button" className="bce-zoom-btn" onClick={zoomIn}>+</button>
        </div>
      </div>

      {exitDialog && (
        <div className="bc-confirm-overlay">
          <div className="bc-confirm-box">
            {exitDialog.purpose === 'preview' ? (
              exitDialog.scenario === 'new' ? (
                <>
                  <h3>Save your card?</h3>
                  <p>You haven't saved this card yet. Save it before previewing?</p>
                </>
              ) : (
                <>
                  <h3>Unsaved changes</h3>
                  <p>Preview shows your last saved version. Save your changes first to preview them?</p>
                </>
              )
            ) : exitDialog.scenario === 'new' ? (
              <>
                <h3>Save your card?</h3>
                <p>You haven't saved this card yet. Would you like to save it before leaving?</p>
              </>
            ) : (
              <>
                <h3>Unsaved changes</h3>
                <p>You have unsaved changes. Your card will show the last saved version.</p>
              </>
            )}
            <div className="bc-confirm-actions">
              <button type="button" className="secondary-button" onClick={confirmKeepEditing}>
                Keep Editing
              </button>
              <button type="button" className="primary-button danger-button" onClick={confirmDiscard}>
                {exitDialog.scenario === 'new' ? 'Discard' : 'Discard Changes'}
              </button>
              <button type="button" className="primary-button" onClick={confirmSaveAndExit}>
                {exitDialog.purpose === 'preview' ? 'Save & Preview' : 'Save & Exit'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
