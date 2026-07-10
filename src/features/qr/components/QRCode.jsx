import { useRef } from 'react'
import { useQrCode } from '../hooks/useQrCode'

/**
 * The single reusable live-preview surface for a QR code. This is the
 * component that will later be dropped directly into the Digital Card and
 * Business Card editors — `<QRCode settings={...} />` — without any of the
 * generation logic being duplicated there.
 */
export function QRCode({ settings, size, className = '' }) {
  const containerRef = useRef(null)
  useQrCode(settings, containerRef)

  return (
    <div
      ref={containerRef}
      className={`qr-code-surface ${className}`}
      style={{ width: size ?? settings.size, height: size ?? settings.size }}
      aria-label="QR code preview"
    />
  )
}
