import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Canvas, Textbox, Rect, Circle, Triangle, Line, FabricImage, Group,
  loadSVGFromString, util,
} from 'fabric'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  RotateCcw, Undo2, Redo2, Trash2, Copy, FlipHorizontal,
  Layers, Sliders, Grid2X2, Type, Image, QrCode,
  Square, Star, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown,
  Minus, Plus, Download, Printer, Save, X,
} from 'lucide-react'
import { TEMPLATES, getPalette, getCardDimensions, getTemplate } from './bcTemplates'
import { normalizeLegacyOrigins, renderFaceThumbnail } from './canvasHelpers'

// ── Fonts available ──────────────────────────────────────────
const FONTS = [
  'Inter', 'Georgia', 'Poppins', 'Playfair Display',
  'Roboto', 'Montserrat', 'Lato', 'Open Sans', 'Raleway', 'Oswald',
]

// ── Solid palette for background ─────────────────────────────
const BG_COLORS = [
  '#ffffff','#f8f7f3','#0d1117','#1f2d3d','#334155',
  '#3654ff','#d1495b','#2f6f4e','#7a4a2b','#c9a24b',
  '#f4a261','#c98ea6','#7c9eff','#0e7c86','#b45309',
]

// ── QR code via free public API ───────────────────────────────
function getQRUrl(text) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text || 'https://example.com')}&format=png&margin=4`
}

// ── Label from object ─────────────────────────────────────────
function objLabel(obj) {
  if (!obj) return 'Object'
  if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') return `Text: ${String(obj.text || '').slice(0, 16)}`
  if (obj.type === 'rect') return 'Rectangle'
  if (obj.type === 'circle') return 'Circle'
  if (obj.type === 'triangle') return 'Triangle'
  if (obj.type === 'line') return 'Line'
  if (obj.type === 'image') return 'Image'
  if (obj.type === 'group') return isQRPlaceholderObj(obj) ? 'QR Placeholder' : 'Group'
  return obj.type || 'Object'
}

// Detected by content (a group containing a Textbox reading "QR"), not a
// custom flag — custom properties aren't preserved by the default
// canvas.toJSON()/loadFromJSON() round-trip used everywhere else in this
// editor (undo/redo, face switching, save), but standard object types and
// their built-in properties always are.
function isQRPlaceholderObj(obj) {
  return obj?.type === 'group' && Array.isArray(obj._objects) &&
    obj._objects.some((o) => (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') && o.text === 'QR')
}

const LEFT_PANELS = [
  { key: 'templates', label: 'Templates', Icon: Grid2X2 },
  { key: 'text',      label: 'Text',      Icon: Type },
  { key: 'shapes',    label: 'Shapes',    Icon: Square },
  { key: 'images',    label: 'Images',    Icon: Image },
  { key: 'qr',        label: 'QR Code',   Icon: QrCode },
  { key: 'layers',    label: 'Layers',    Icon: Layers },
]

export function BusinessCardEditor({ selection, profile, onBack, onSave, onExit }) {
  const { templateId, setup, savedFront, savedBack } = selection
  const { w, h } = getCardDimensions(setup.size, setup.orientation)

  const canvasElRef = useRef(null)
  const fabricRef   = useRef(null)

  const [activeFace, setActiveFace] = useState('front')
  const [hasBack, setHasBack]       = useState(!!savedBack || setup.includeBack || false)
  const [faceData, setFaceData]     = useState({ front: null, back: savedBack || null })
  const [removeBackConfirm, setRemoveBackConfirm] = useState(false)

  const [activePanel, setActivePanel]   = useState(null)
  const [selectedObj, setSelectedObj]   = useState(null)
  const [zoom, setZoom]                 = useState(1)
  const [showOpacity, setShowOpacity]   = useState(false)

  // History per face
  const [history, setHistory]   = useState({ front: [], back: [] })
  const [histIdx, setHistIdx]   = useState({ front: -1, back: -1 })
  const [isRestoring, setIsRestoring] = useState(false)

  // Layers
  const [layers, setLayers] = useState([])

  // Text props (synced from selected object)
  const [textProps, setTextProps] = useState({
    fontFamily: 'Inter', fontSize: 16, fontWeight: 'normal',
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
    })
    fabricRef.current = cv

    if (savedFront) {
      // Reopening an existing card — restore exactly what was last saved
      // instead of regenerating from the template (which would discard edits).
      await cv.loadFromJSON(JSON.parse(savedFront))
      normalizeLegacyOrigins(cv)
    } else {
      // Load template (blank/Customise mode has no template)
      const tmpl = templateId === 'blank' ? null : getTemplate(templateId)
      if (tmpl) {
        await tmpl.load(cv, profile, palette, w, h)
      } else {
        cv.backgroundColor = '#ffffff'
      }

      // Add QR if enabled
      if (setup.includeQR) {
        const qrSrc = profile.website || profile.slug || 'https://example.com'
        await addQRToCanvas(cv, qrSrc, w, h)
      }
    }

    cv.renderAll()
    snapshot('front', cv)
    syncLayers(cv)

    // Events
    cv.on('selection:created', (e) => onObjSelect(e.selected?.[0]))
    cv.on('selection:updated', (e) => onObjSelect(e.selected?.[0]))
    cv.on('selection:cleared',  () => setSelectedObj(null))
    cv.on('object:modified',    () => {
      if (!isRestoring) { snapshot(activeFace, cv); syncLayers(cv) }
      const obj = cv.getActiveObject()
      if (obj) readProps(obj)
    })
    cv.on('object:added',   () => syncLayers(cv))
    cv.on('object:removed', () => syncLayers(cv))
  }, []) // eslint-disable-line

  useEffect(() => {
    initCanvas()
    return () => {
      fabricRef.current?.dispose()
      fabricRef.current = null
    }
  }, [initCanvas])

  // ── Helpers ────────────────────────────────────────────────
  async function addQRToCanvas(cv, url, cw, ch) {
    try {
      const qrImg = await FabricImage.fromURL(getQRUrl(url), { crossOrigin: 'anonymous' })
      qrImg.scaleToWidth(80)
      qrImg.set({ left: cw - 96, top: ch - 96, selectable: true, originX: 'left', originY: 'top' })
      cv.add(qrImg)
    } catch (_) {}
  }

  function cv() { return fabricRef.current }

  function syncLayers(canvas) {
    if (!canvas) return
    setLayers([...canvas.getObjects()].reverse())
  }

  function snapshot(face, canvas) {
    if (!canvas || isRestoring) return
    const json = JSON.stringify(canvas.toJSON())
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
        fill:        typeof obj.fill === 'string' ? obj.fill : '#000000',
        textAlign:   obj.textAlign   || 'left',
        charSpacing: obj.charSpacing || 0,
        lineHeight:  obj.lineHeight  || 1.2,
        underline:   obj.underline   || false,
        shadow:      !!obj.shadow,
        outline:     !!obj.stroke,
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

  // ── Switch face ────────────────────────────────────────────
  async function switchFace(newFace) {
    if (newFace === activeFace || !fabricRef.current) return
    // Save current face JSON
    const currentJson = JSON.stringify(fabricRef.current.toJSON())
    setFaceData((prev) => ({ ...prev, [activeFace]: currentJson }))
    // Load new face
    const savedJson = faceData[newFace]
    if (savedJson) {
      setIsRestoring(true)
      await fabricRef.current.loadFromJSON(JSON.parse(savedJson))
      normalizeLegacyOrigins(fabricRef.current)
      fabricRef.current.renderAll()
      setIsRestoring(false)
    } else {
      fabricRef.current.clear()
      fabricRef.current.backgroundColor = '#ffffff'
      fabricRef.current.renderAll()
      snapshot(newFace, fabricRef.current)
    }
    setActiveFace(newFace)
    setSelectedObj(null)
    syncLayers(fabricRef.current)
  }

  // ── Back side management ───────────────────────────────────
  // Works for every card, template-based or blank — back side is purely an
  // editor-session concept, independent of how the front was created.
  function addBackSide() {
    setHasBack(true)
    switchFace('back')
  }

  function removeBackSide() {
    setFaceData((prev) => ({ ...prev, back: null }))
    setHistory((prev) => ({ ...prev, back: [] }))
    setHistIdx((prev) => ({ ...prev, back: -1 }))
    setHasBack(false)
    if (activeFace === 'back') {
      setActiveFace('front')
      if (fabricRef.current && faceData.front) {
        fabricRef.current.loadFromJSON(JSON.parse(faceData.front)).then(() => {
          normalizeLegacyOrigins(fabricRef.current)
          fabricRef.current.renderAll()
          syncLayers(fabricRef.current)
        })
      }
    }
    setRemoveBackConfirm(false)
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
      await addQRToCanvas(fabricRef.current, profile.website || '', w, h)
    }
    fabricRef.current.renderAll()
    snapshot(activeFace, fabricRef.current)
    syncLayers(fabricRef.current)
    setSelectedObj(null)
  }

  // ── Delete ─────────────────────────────────────────────────
  function deleteSelected() {
    const obj = fabricRef.current?.getActiveObject()
    if (!obj || !fabricRef.current) return
    fabricRef.current.remove(obj)
    fabricRef.current.discardActiveObject()
    fabricRef.current.renderAll()
    setSelectedObj(null)
    snapshot(activeFace, fabricRef.current)
  }

  // ── Duplicate ──────────────────────────────────────────────
  function duplicate() {
    const obj = fabricRef.current?.getActiveObject()
    if (!obj || !fabricRef.current) return
    obj.clone().then((cloned) => {
      cloned.set({ left: obj.left + 14, top: obj.top + 14 })
      fabricRef.current.add(cloned)
      fabricRef.current.setActiveObject(cloned)
      fabricRef.current.renderAll()
      snapshot(activeFace, fabricRef.current)
    })
  }

  // ── Flip ───────────────────────────────────────────────────
  function flip() {
    const obj = fabricRef.current?.getActiveObject()
    if (!obj || !fabricRef.current) return
    obj.set('flipX', !obj.flipX)
    fabricRef.current.renderAll()
    snapshot(activeFace, fabricRef.current)
  }

  // ── Text prop update ───────────────────────────────────────
  function updateText(key, value) {
    const obj = fabricRef.current?.getActiveObject()
    if (!obj || !fabricRef.current) return
    obj.set(key, value)
    fabricRef.current.renderAll()
    setTextProps((p) => ({ ...p, [key]: value }))
    snapshot(activeFace, fabricRef.current)
  }

  // ── Shape prop update ──────────────────────────────────────
  function updateShape(key, value) {
    const obj = fabricRef.current?.getActiveObject()
    if (!obj || !fabricRef.current) return
    obj.set(key, value)
    fabricRef.current.renderAll()
    setShapeProps((p) => ({ ...p, [key]: value }))
    snapshot(activeFace, fabricRef.current)
  }

  // ── Common prop update ────────────────────────────────────
  function updateCommon(key, value) {
    const obj = fabricRef.current?.getActiveObject()
    if (!obj || !fabricRef.current) return
    const num = parseFloat(value)
    if (key === 'width')  obj.set('scaleX', num / obj.width)
    else if (key === 'height') obj.set('scaleY', num / obj.height)
    else obj.set(key, num)
    fabricRef.current.renderAll()
    setCommonProps((p) => ({ ...p, [key]: value }))
  }

  // ── Opacity (top bar) ─────────────────────────────────────
  function setObjOpacity(val) {
    const obj = fabricRef.current?.getActiveObject()
    if (!obj || !fabricRef.current) return
    obj.set('opacity', parseFloat(val))
    fabricRef.current.renderAll()
    setCommonProps((p) => ({ ...p, opacity: val }))
  }

  // ── Bring/Send ────────────────────────────────────────────
  function bringForward() {
    const obj = fabricRef.current?.getActiveObject()
    if (!obj || !fabricRef.current) return
    fabricRef.current.bringObjectForward(obj)
    fabricRef.current.renderAll()
    syncLayers(fabricRef.current)
  }
  function sendBackward() {
    const obj = fabricRef.current?.getActiveObject()
    if (!obj || !fabricRef.current) return
    fabricRef.current.sendObjectBackwards(obj)
    fabricRef.current.renderAll()
    syncLayers(fabricRef.current)
  }

  // ── Add text ──────────────────────────────────────────────
  function addText(style) {
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
  function insertDetailText(value, fontSize = 14) {
    if (!fabricRef.current || !value) return
    const t = new Textbox(value, {
      left: 40, top: 40,
      fontSize, fontWeight: '600',
      fontFamily: 'Inter, sans-serif',
      fill: palette.textDark || '#1a1a1a',
      width: 220,
      originX: 'left', originY: 'top',
    })
    fabricRef.current.add(t)
    fabricRef.current.setActiveObject(t)
    fabricRef.current.renderAll()
    snapshot(activeFace, fabricRef.current)
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
    fabricRef.current?.renderAll()
    syncLayers(fabricRef.current)
  }
  function toggleLock(obj) {
    const locked = !obj.selectable
    obj.set({ selectable: !locked, evented: !locked, lockMovementX: locked, lockMovementY: locked })
    fabricRef.current?.renderAll()
    syncLayers(fabricRef.current)
  }
  function selectFromLayer(obj) {
    if (!fabricRef.current) return
    fabricRef.current.setActiveObject(obj)
    fabricRef.current.renderAll()
    onObjSelect(obj)
  }

  // ── QR placeholder (visual only — no real QR generation yet) ──────
  // Same insertion pattern as addShape/uploadImage: create a standard
  // Fabric object, add it, select it, render, snapshot. Fully draggable,
  // resizable and deletable via the existing canvas controls — nothing
  // QR-specific about how Fabric treats it.
  function addQRPlaceholder() {
    if (!fabricRef.current) return
    const size = 80
    const box = new Rect({
      width: size, height: size, fill: '#ffffff',
      stroke: '#c9c5bb', strokeWidth: 1.5,
      originX: 'left', originY: 'top',
    })
    const label = new Textbox('QR', {
      width: size, top: size / 2 - 9,
      fontSize: 13, fontWeight: '700', fill: '#9a968d',
      textAlign: 'center', fontFamily: 'Inter, sans-serif',
      originX: 'left', originY: 'top',
    })
    const group = new Group([box, label], {
      left: w / 2 - size / 2, top: h / 2 - size / 2,
      originX: 'left', originY: 'top',
    })
    fabricRef.current.add(group)
    fabricRef.current.setActiveObject(group)
    fabricRef.current.renderAll()
    snapshot(activeFace, fabricRef.current)
  }

  function removeQRPlaceholder() {
    if (!fabricRef.current) return
    const obj = fabricRef.current.getObjects().find(isQRPlaceholderObj)
    if (!obj) return
    fabricRef.current.remove(obj)
    fabricRef.current.discardActiveObject()
    fabricRef.current.renderAll()
    setSelectedObj(null)
    snapshot(activeFace, fabricRef.current)
  }

  function toggleQRPlaceholder() {
    if (qrExists) removeQRPlaceholder()
    else addQRPlaceholder()
  }

  // ── Save ──────────────────────────────────────────────────
  async function handleSave() {
    if (!fabricRef.current) return
    // Save current face
    const currentJson = JSON.stringify(fabricRef.current.toJSON())
    const updatedFaceData = { ...faceData, [activeFace]: currentJson }
    const finalFront = updatedFaceData.front || currentJson
    const finalBack  = hasBack ? (updatedFaceData.back || null) : null

    const frontImg = activeFace === 'front'
      ? fabricRef.current.toDataURL({ format: 'png', multiplier: 3 })
      : await renderFaceThumbnail(finalFront, setup, 3)

    onSave({
      templateId,
      setup: { ...setup, includeBack: hasBack },
      frontJson: finalFront,
      backJson:  finalBack,
      frontImg,
    })
  }

  // ── Export ────────────────────────────────────────────────
  function exportPNG() {
    if (!fabricRef.current) return
    const url = fabricRef.current.toDataURL({ format: 'png', multiplier: 3 })
    const a = document.createElement('a')
    a.href = url
    a.download = `business-card-${activeFace}.png`
    a.click()
  }

  // ── Zoom ──────────────────────────────────────────────────
  const zoomIn  = () => setZoom((z) => Math.min(3, parseFloat((z + 0.1).toFixed(1))))
  const zoomOut = () => setZoom((z) => Math.max(0.3, parseFloat((z - 0.1).toFixed(1))))

  const canUndo = histIdx[activeFace] > 0
  const canRedo = histIdx[activeFace] < (history[activeFace]?.length || 0) - 1
  const qrExists = layers.some(isQRPlaceholderObj)

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
            onClick={onExit}
            title="Exit without saving — back to your business cards"
          >
            <X size={14} /> Exit
          </button>
        )}
        <button type="button" className="secondary-button" style={{ padding: '7px 14px', fontSize: 13 }} onClick={onBack}>
          ← Gallery
        </button>
        <button
          type="button"
          className="primary-button"
          style={{ padding: '7px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={handleSave}
        >
          <Save size={14} /> Save
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
                    <button key={k} type="button" className="bce-text-style-btn" onClick={() => addText(k)}>
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
                          onClick={() => insertDetailText(profile[key], size)}
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

              {/* QR — visual placeholder only, no real QR generation yet */}
              {activePanel === 'qr' && (
                <div className="bce-lsec">
                  <div className="bce-lsec-label">QR Code</div>
                  <div className="bce-qr-placeholder-box">
                    <QrCode size={26} color="var(--muted)" />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: '10px 0 14px' }}>
                    QR code will link to your digital card
                  </p>
                  <button
                    type="button"
                    className={qrExists ? 'secondary-button' : 'primary-button'}
                    style={{ width: '100%', fontSize: 13, marginBottom: 10 }}
                    onClick={toggleQRPlaceholder}
                  >
                    {qrExists ? 'Remove QR' : `Add to ${activeFace === 'back' ? 'Back' : 'Front'}`}
                  </button>
                  <p className="bce-qr-coming-soon">Placeholder only — no QR generated yet</p>
                </div>
              )}

              {/* Layers */}
              {activePanel === 'layers' && (
                <div className="bce-lsec">
                  <div className="bce-lsec-label">Layers ({layers.length})</div>
                  {layers.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>No objects yet.</p>}
                  {layers.map((obj, i) => (
                    <div
                      key={i}
                      className={`bce-layer-item${selectedObj === obj ? ' active' : ''}`}
                      onClick={() => selectFromLayer(obj)}
                    >
                      <span className="bce-layer-name">{objLabel(obj)}</span>
                      <button type="button" className="bce-layer-action" onClick={(e) => { e.stopPropagation(); toggleVisibility(obj) }}>
                        {obj.visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button type="button" className="bce-layer-action" onClick={(e) => { e.stopPropagation(); toggleLock(obj) }}>
                        {obj.selectable === false ? <Lock size={12} /> : <Unlock size={12} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="bce-canvas-area" onClick={() => setShowOpacity(false)}>
          <div className="bce-canvas-wrap" style={{ transform: `scale(${zoom})` }}>
            <canvas ref={canvasElRef} />
          </div>
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
                <h3>{isText ? 'Edit Text' : 'Edit Shape'}</h3>
                <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12 }} onClick={() => setSelectedObj(null)}>
                  ✕
                </button>
              </div>
              <div className="bce-rp-body">

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
                        {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="bce-rp-row">
                      <span className="bce-rp-key">Size</span>
                      <button type="button" className="bce-zoom-btn" style={{ width: 28, height: 28 }} onClick={() => updateText('fontSize', Math.max(6, textProps.fontSize - 1))}>−</button>
                      <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{textProps.fontSize}</span>
                      <button type="button" className="bce-zoom-btn" style={{ width: 28, height: 28 }} onClick={() => updateText('fontSize', textProps.fontSize + 1)}>+</button>
                    </div>
                    <div className="bce-rp-row">
                      <span className="bce-rp-key">Weight</span>
                      <select className="bce-select" value={textProps.fontWeight} onChange={(e) => updateText('fontWeight', e.target.value)}>
                        {['normal','500','600','700','800','bold'].map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
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
                {!isText && selectedObj && (
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
                  </div>
                )}

                {/* Background color picker */}
                {!isText && activePanel === 'shapes' && (
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
        {/* Left: actions */}
        <button
          type="button"
          className="secondary-button"
          style={{ padding: '7px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={handleSave}
        >
          <Save size={13} /> Save Progress
        </button>
        <button
          type="button"
          className="secondary-button"
          style={{ padding: '7px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={exportPNG}
        >
          <Download size={13} /> Download
        </button>
        <button
          type="button"
          className="secondary-button"
          style={{ padding: '7px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => window.print()}
        >
          <Printer size={13} /> Print
        </button>

        <div className="bce-bottombar-space" />

        {/* Center: face tabs */}
        <div className="bce-face-tabs">
          <button
            type="button"
            className={`bce-face-tab${activeFace === 'front' ? ' active' : ''}`}
            onClick={() => switchFace('front')}
          >
            Front Side
          </button>
          {hasBack && (
            <button
              type="button"
              className={`bce-face-tab${activeFace === 'back' ? ' active' : ''}`}
              onClick={() => switchFace('back')}
            >
              Back Side
            </button>
          )}
        </div>

        {hasBack ? (
          <button
            type="button"
            className="secondary-button"
            style={{ padding: '7px 14px', fontSize: 13 }}
            onClick={() => setRemoveBackConfirm(true)}
          >
            Remove Back Side
          </button>
        ) : (
          <button
            type="button"
            className="secondary-button"
            style={{ padding: '7px 14px', fontSize: 13 }}
            onClick={addBackSide}
          >
            + Add Back Side
          </button>
        )}

        <div className="bce-bottombar-space" />

        {/* Right: zoom */}
        <div className="bce-zoom-row">
          <button type="button" className="bce-zoom-btn" onClick={zoomOut}>−</button>
          <span className="bce-zoom-val">{Math.round(zoom * 100)}%</span>
          <button type="button" className="bce-zoom-btn" onClick={zoomIn}>+</button>
        </div>
      </div>

      {removeBackConfirm && (
        <div className="bc-confirm-overlay">
          <div className="bc-confirm-box">
            <h3>Remove Back Side?</h3>
            <p>This will permanently delete everything on the back of this card.</p>
            <div className="bc-confirm-actions">
              <button type="button" className="secondary-button" onClick={() => setRemoveBackConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="primary-button danger-button" onClick={removeBackSide}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
