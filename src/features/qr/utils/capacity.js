// Pure payload/error-correction maths shared by the render engine and the
// scannability warnings. Kept dependency-free (no React, no qr-code-styling)
// so validation can import it without dragging the renderer along.

// Byte budget before a payload stops fitting comfortably in a scannable QR.
// Ported from the standalone contact-saver generator.
export const QR_CAPACITY_H = 1273 // 30% recovery — required when a centre logo is punched out
export const QR_CAPACITY_M = 2331 // no logo: far less dense, so cameras lock on faster

export function isStaticQr(settings) {
  return (settings?.qrType || 'static') === 'static'
}

// Dynamic QRs always encode a short /q/:slug URL, so density is never a
// problem and H (max redundancy) is free. Static QRs carry the whole payload,
// so H would make a long vCard unscannably dense — use H only when a logo
// actually needs the redundancy, otherwise M.
export function resolveErrorCorrectionLevel(settings) {
  const configured = settings?.errorCorrectionLevel
  if (configured && configured !== 'auto') return configured
  if (!isStaticQr(settings)) return 'H'
  return settings?.logo ? 'H' : 'M'
}

export function qrCapacityFor(settings) {
  return resolveErrorCorrectionLevel(settings) === 'H' ? QR_CAPACITY_H : QR_CAPACITY_M
}

// How full the QR is. Static payloads can genuinely overflow (a vCard with
// several phones, websites and a long address), so the UI can warn before the
// code becomes unreliable. Dynamic payloads are short links and never will.
export function qrPayloadUsage(settings, data) {
  const bytes = new TextEncoder().encode(String(data ?? '')).length
  const capacity = qrCapacityFor(settings)
  return {
    bytes,
    capacity,
    ratio: capacity > 0 ? bytes / capacity : 0,
    overCapacity: bytes > capacity,
    nearCapacity: bytes > capacity * 0.85,
  }
}
