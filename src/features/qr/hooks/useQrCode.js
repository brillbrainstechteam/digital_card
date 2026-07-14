import { useEffect, useRef } from 'react'
import { createQrCodeInstance } from '../services/qrEngine'

// Render a fresh instance for every settings change so removed options,
// such as a gradient switched back to solid, cannot survive a deep merge.
export function useQrCode(settings, containerRef, { lockable = false } = {}) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false
    if (cancelRef.current) cancelRef.current()
    cancelRef.current = () => { cancelled = true }

    const instance = createQrCodeInstance(settings, { lockable })
    const temp = document.createElement('div')
    instance.append(temp)

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
  }, [settings, containerRef, lockable])
}
