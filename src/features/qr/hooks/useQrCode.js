import { useEffect, useRef } from 'react'
import { createQrCodeInstance } from '../services/qrEngine'

// Renders a live QR preview into `containerRef`. A fresh QRCodeStyling
// instance is created on every settings change (rather than calling the
// library's `.update()`) because qr-code-styling deep-merges options
// internally — omitting a field (e.g. `gradient`) on update does NOT clear
// a previously-set value, it just leaves the old one merged in. That was
// the cause of "gradient survives switching to a solid preset". Recreating
// the instance makes the current `settings` object the single source of
// truth for every render, with no leftover state from prior options.
export function useQrCode(settings, containerRef) {
  const instanceRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    instanceRef.current = createQrCodeInstance(settings)
    containerRef.current.innerHTML = ''
    instanceRef.current.append(containerRef.current)
  }, [settings, containerRef])

  useEffect(() => () => {
    instanceRef.current = null
  }, [])

  return instanceRef
}
