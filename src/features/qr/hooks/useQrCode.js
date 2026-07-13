import { useEffect, useRef } from 'react'
import { createQrCodeInstance } from '../services/qrEngine'
import { useQrDevModeEnabled } from '../services/qrAccess'

// Renders a live QR preview into `containerRef`. A fresh QRCodeStyling
// instance is created on every settings change (rather than calling the
// library's `.update()`) because qr-code-styling deep-merges options
// internally — omitting a field (e.g. `gradient`) on update does NOT clear
// a previously-set value, it just leaves the old one merged in. That was
// the cause of "gradient survives switching to a solid preset". Recreating
// the instance makes the current `settings` object the single source of
// truth for every render, with no leftover state from prior options.
//
// The render is done into a temp element first so the container stays
// occupied by the previous QR while the new one's image loads async.
// This eliminates the blank flash when the logo size slider is dragged.
export function useQrCode(settings, containerRef, { lockable = false } = {}) {
  const cancelRef = useRef(null)
  // Subscribed (not just read) so flipping the Developer Mode badge's
  // toggle rebuilds every lockable QR preview instantly — no reload.
  const devModeEnabled = useQrDevModeEnabled()

  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false
    if (cancelRef.current) cancelRef.current()
    cancelRef.current = () => { cancelled = true }

    const instance = createQrCodeInstance(settings, { lockable })
    const temp = document.createElement('div')
    instance.append(temp)

    // _svgDrawingPromise resolves once drawQR() finishes (image included).
    // Fall back to a microtask for the no-image path where it's synchronous.
    const renderDone = instance._svgDrawingPromise ?? Promise.resolve()
    renderDone.then(() => {
      if (cancelled || !containerRef.current) return
      const svg = temp.firstChild
      if (svg) {
        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(svg)
      }
    })

    return () => { cancelled = true }
  }, [settings, containerRef, lockable, devModeEnabled])
}
