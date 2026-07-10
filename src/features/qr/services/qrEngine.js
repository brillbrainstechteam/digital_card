import QRCodeStyling from 'qr-code-styling'

// The single QR "settings" schema used across the whole platform. Every
// consumer (QR Studio, Digital Card add-on, future Business Card add-on)
// reads and writes this same shape — that's what makes the module reusable
// without duplicating logic.
export function createDefaultQrSettings() {
  return {
    destinationType: 'website',
    destinationFields: { url: '' },
    data: '',
    size: 320,
    margin: 12,
    errorCorrectionLevel: 'H',
    dotsType: 'square',
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
  return {
    type: gradient.type || 'linear',
    rotation: ((gradient.rotation ?? 0) * Math.PI) / 180,
    colorStops: [
      { offset: 0, color: gradient.colors?.[0] || '#000000' },
      { offset: 1, color: gradient.colors?.[1] || '#000000' },
    ],
  }
}

// Maps our reusable settings schema onto qr-code-styling's Options shape.
// This is the ONLY place that should know about qr-code-styling's API —
// swapping the underlying library later only requires changing this file.
export function buildQrCodeOptions(settings) {
  const dotsGradient = buildGradient(settings.gradient)

  return {
    type: 'svg',
    width: settings.size,
    height: settings.size,
    margin: settings.margin,
    data: settings.data || ' ', // qr-code-styling needs non-empty data to render a placeholder
    image: settings.logo || undefined,
    qrOptions: {
      errorCorrectionLevel: settings.errorCorrectionLevel || 'H',
    },
    imageOptions: {
      imageSize: settings.logoSizeRatio ?? 0.22,
      hideBackgroundDots: true,
      margin: 4,
    },
    dotsOptions: dotsGradient
      ? { type: settings.dotsType || 'square', gradient: dotsGradient }
      : { type: settings.dotsType || 'square', color: settings.foreground },
    cornersSquareOptions: dotsGradient
      ? { type: 'square', gradient: dotsGradient }
      : { type: 'square', color: settings.foreground },
    cornersDotOptions: dotsGradient
      ? { type: 'square', gradient: dotsGradient }
      : { type: 'square', color: settings.foreground },
    backgroundOptions: settings.transparentBackground
      ? { color: 'rgba(0,0,0,0)' }
      : { color: settings.background },
  }
}

export function createQrCodeInstance(settings) {
  return new QRCodeStyling(buildQrCodeOptions(settings))
}

// Renders a fresh, offscreen instance and returns the raw Blob for the
// requested format. Used for downloads so the visible preview instance is
// never mutated by export concerns.
export async function renderQrToBlob(settings, extension) {
  const instance = new QRCodeStyling(buildQrCodeOptions(settings))
  return instance.getRawData(extension)
}

export async function downloadQrCode(settings, { extension, fileName = 'qr-code' }) {
  if (extension === 'pdf') return downloadQrAsPdf(settings, fileName)
  const instance = new QRCodeStyling(buildQrCodeOptions(settings))
  return instance.download({ name: fileName, extension })
}

async function downloadQrAsPdf(settings, fileName) {
  const { jsPDF } = await import('jspdf')
  // Render at a high fixed resolution regardless of the on-screen preview
  // size so the exported PDF is always crisp.
  const exportSettings = { ...settings, size: 1024 }
  const blob = await renderQrToBlob(exportSettings, 'png')
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
