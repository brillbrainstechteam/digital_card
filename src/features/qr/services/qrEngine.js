import QRCodeStyling from 'qr-code-styling'
import { isQrUnlocked, PREVIEW_QR_URL } from './qrAccess'
import { resolveErrorCorrectionLevel } from '../utils/capacity'

// The single QR "settings" schema used across the whole platform. Every
// consumer (QR Studio, Digital Card add-on, future Business Card add-on)
// reads and writes this same shape — that's what makes the module reusable
// without duplicating logic.
export { isStaticQr, resolveErrorCorrectionLevel, qrCapacityFor, qrPayloadUsage } from '../utils/capacity'

export function createDefaultQrSettings() {
  return {
    // 'static' | 'dynamic' — see QR_TYPES in utils/destinations.js
    qrType: 'static',
    destinationType: 'website',
    destinationFields: { url: '' },
    data: '',
    size: 320,
    margin: 12,
    // 'auto' resolves from the payload — see resolveErrorCorrectionLevel.
    // Hardcoding 'H' made every static QR maximally dense, which both wasted
    // half the byte budget and made long vCards hard for cameras to read.
    errorCorrectionLevel: 'auto',
    dotsType: 'extra-rounded',
    foreground: '#000000',
    background: '#ffffff',
    transparentBackground: false,
    gradient: null, // { type: 'linear' | 'radial', rotation, colors: [c1, c2] }
    logo: null, // data URL or object URL
    logoSizeRatio: 0.22,
    brandTheme: null, // { primary, accent, surface, ink } — set when opened from a Digital Card
  }
}

function buildGradient(gradient) {
  if (!gradient) return undefined
  const start = gradient.colors?.[0] || '#000000'
  const end = gradient.colors?.[1] || '#000000'
  const parse = (color) => color.match(/[a-f\d]{2}/gi)?.map((part) => parseInt(part, 16)) || [0, 0, 0]
  const toHex = (value) => Math.round(value).toString(16).padStart(2, '0')
  const from = parse(start)
  const to = parse(end)
  const blend = (amount) => `#${from.map((value, index) => toHex(value + (to[index] - value) * amount)).join('')}`
  return {
    type: gradient.type || 'linear',
    rotation: ((gradient.rotation ?? 0) * Math.PI) / 180,
    colorStops: [
      { offset: 0, color: start },
      { offset: 0.25, color: blend(0.25) },
      { offset: 0.5, color: blend(0.5) },
      { offset: 0.75, color: blend(0.75) },
      { offset: 1, color: end },
    ],
  }
}

// qr-code-styling gives every finder-pattern corner (the three "eyes") its
// own gradient, scoped to that corner's own tiny bounding box — not a
// shared sweep across the whole code. Applying our gradient object to
// cornersSquareOptions/cornersDotOptions the same way we do for dotsOptions
// therefore renders as three small, disconnected color blobs instead of
// one continuous gradient, which reads as broken. Using a flat color for
// the corners — the gradient's first stop — is what makes a gradient QR
// actually look like one coherent gradient (this is also how most
// branded-QR tools style it).
function cornerColorFor(gradient) {
  return gradient?.colors?.[0] || '#000000'
}

// Maps our reusable settings schema onto qr-code-styling's Options shape.
// This is the ONLY place that should know about qr-code-styling's API —
// swapping the underlying library later only requires changing this file.
//
// `lockable: true` is how a caller opts a QR into the preview-vs-real gate
// — it's used by every card-linked QR surface (the paid add-on: publish
// flow, card editor, My QR Codes, the public card view) but deliberately
// NOT by the standalone QR Studio, which is a free, unrestricted tool with
// no card/purchase attached. Whether a caller is rendering the live
// preview, saving to the backend, or generating a download, all of those
// paths funnel through here, so gating `data` in this one spot guarantees
// the real destination can never leak out before the QR add-on is
// unlocked by a confirmed purchase for anything that opts in.
export function buildQrCodeOptions(settings, { lockable = false } = {}) {
  const dotsGradient = buildGradient(settings.gradient)
  const unlocked = !lockable || isQrUnlocked({ purchased: settings.purchased })
  const data = unlocked ? (settings.data || ' ') : PREVIEW_QR_URL

  return {
    type: 'svg',
    width: settings.size,
    height: settings.size,
    margin: settings.margin,
    data, // qr-code-styling needs non-empty data to render a placeholder
    image: settings.logo || undefined,
    qrOptions: {
      errorCorrectionLevel: resolveErrorCorrectionLevel(settings),
    },
    imageOptions: {
      imageSize: settings.logoSizeRatio ?? 0.22,
      hideBackgroundDots: true,
      margin: 6,
      // Our logos are already data URLs, so we never need the library's
      // re-fetch-as-blob step. That step performs an XMLHttpRequest GET
      // against the image URL (even for data: URIs) to re-encode it, which
      // CSP's connect-src (no `data:` exception under helmet's default
      // policy) silently blocks in production — the logo would then never
      // render at all despite `image` being set correctly.
      saveAsBlob: false,
    },
    dotsOptions: dotsGradient
      ? { type: settings.dotsType || 'extra-rounded', gradient: dotsGradient }
      : { type: settings.dotsType || 'extra-rounded', color: settings.foreground },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: dotsGradient ? cornerColorFor(settings.gradient) : settings.foreground,
    },
    cornersDotOptions: {
      type: 'dot',
      color: dotsGradient ? cornerColorFor(settings.gradient) : settings.foreground,
    },
    backgroundOptions: settings.transparentBackground
      ? { color: 'rgba(0,0,0,0)' }
      : { color: settings.background },
  }
}

export function createQrCodeInstance(settings, { lockable = false } = {}) {
  return new QRCodeStyling(buildQrCodeOptions(settings, { lockable }))
}

// Mirrors the logo-rounding clip applied to the live preview (see
// useQrCode.js) onto an exported SVG's raw markup. PNG/PDF exports rasterize
// the logo inside qr-code-styling's own canvas render with no hook to
// intercept it, so this only covers the 'svg' download format.
function roundLogoCornersInSvgMarkup(svgText) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const svg = doc.documentElement
  const image = svg.querySelector('image')
  if (!image) return svgText

  const x = Number.parseFloat(image.getAttribute('x')) || 0
  const y = Number.parseFloat(image.getAttribute('y')) || 0
  const width = Number.parseFloat(image.getAttribute('width')) || 0
  const height = Number.parseFloat(image.getAttribute('height')) || 0
  if (!width || !height) return svgText

  const clipId = 'qr-logo-clip-export'
  let defs = svg.querySelector('defs')
  if (!defs) {
    defs = doc.createElementNS('http://www.w3.org/2000/svg', 'defs')
    svg.insertBefore(defs, svg.firstChild)
  }
  const clipPath = doc.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
  clipPath.setAttribute('id', clipId)
  const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('x', x)
  rect.setAttribute('y', y)
  rect.setAttribute('width', width)
  rect.setAttribute('height', height)
  rect.setAttribute('rx', Math.min(width, height) * 0.22)
  rect.setAttribute('ry', Math.min(width, height) * 0.22)
  clipPath.appendChild(rect)
  defs.appendChild(clipPath)
  image.setAttribute('clip-path', `url(#${clipId})`)

  return new XMLSerializer().serializeToString(svg)
}

// Renders a fresh, offscreen instance and returns the raw Blob for the
// requested format. Used for downloads so the visible preview instance is
// never mutated by export concerns.
export async function renderQrToBlob(settings, extension, { lockable = false } = {}) {
  const instance = new QRCodeStyling(buildQrCodeOptions(settings, { lockable }))
  const blob = await instance.getRawData(extension)
  if (extension !== 'svg' || !blob || !settings.logo) return blob
  const svgText = await blob.text()
  return new Blob([roundLogoCornersInSvgMarkup(svgText)], { type: 'image/svg+xml' })
}

// Renders a fresh, offscreen instance and returns a data URL — for
// consumers that need to embed the QR as an actual image somewhere other
// than a live <QRCode> preview (e.g. dropping a real, scannable QR onto a
// Fabric.js canvas in the Business Card editor) rather than triggering a
// file download.
export async function renderQrToDataUrl(settings, extension = 'png', { lockable = false } = {}) {
  const blob = await renderQrToBlob(settings, extension, { lockable })
  return blobToDataUrl(blob)
}

function triggerBlobDownload(blob, fileName, extension) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}.${extension}`
  link.click()
  URL.revokeObjectURL(url)
}

export async function downloadQrCode(settings, { extension, fileName = 'qr-code', lockable = false } = {}) {
  if (extension === 'pdf') return downloadQrAsPdf(settings, fileName, { lockable })
  // SVG goes through renderQrToBlob (not instance.download) so the exported
  // markup also gets the logo-corner rounding applied to the live preview.
  if (extension === 'svg') {
    const blob = await renderQrToBlob(settings, extension, { lockable })
    return triggerBlobDownload(blob, fileName, extension)
  }
  const instance = new QRCodeStyling(buildQrCodeOptions(settings, { lockable }))
  return instance.download({ name: fileName, extension })
}

async function downloadQrAsPdf(settings, fileName, { lockable = false } = {}) {
  const { jsPDF } = await import('jspdf')
  // Render at a high fixed resolution regardless of the on-screen preview
  // size so the exported PDF is always crisp.
  const exportSettings = { ...settings, size: 1024 }
  const blob = await renderQrToBlob(exportSettings, 'png', { lockable })
  const dataUrl = await blobToDataUrl(blob)
  const pdf = new jsPDF({ unit: 'pt', format: [360, 360] })
  pdf.addImage(dataUrl, 'PNG', 20, 20, 320, 320)
  pdf.save(`${fileName}.pdf`)
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read generated QR image.'))
    reader.readAsDataURL(blob)
  })
}
