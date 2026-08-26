import { useEffect, useRef } from 'react'
import { createQrCodeInstance } from '../services/qrEngine'

// qr-code-styling draws the center logo as a plain <image> with square
// corners — there's no library option for rounding it. Rounding it directly
// in the rendered SVG (rather than pre-rounding the uploaded file) means it
// stays correct however the logo's crop/size ratio changes.
function roundLogoCorners(svg) {
  const image = svg.querySelector('image')
  if (!image) return

  const x = Number.parseFloat(image.getAttribute('x')) || 0
  const y = Number.parseFloat(image.getAttribute('y')) || 0
  const width = Number.parseFloat(image.getAttribute('width')) || 0
  const height = Number.parseFloat(image.getAttribute('height')) || 0
  if (!width || !height) return

  const clipId = 'qr-logo-clip'
  let defs = svg.querySelector('defs')
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    svg.insertBefore(defs, svg.firstChild)
  }
  const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
  clipPath.setAttribute('id', clipId)
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('x', x)
  rect.setAttribute('y', y)
  rect.setAttribute('width', width)
  rect.setAttribute('height', height)
  rect.setAttribute('rx', Math.min(width, height) * 0.22)
  rect.setAttribute('ry', Math.min(width, height) * 0.22)
  clipPath.appendChild(rect)
  defs.appendChild(clipPath)
  image.setAttribute('clip-path', `url(#${clipId})`)
}

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
        roundLogoCorners(svg)
        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(svg)
      }
    })

    return () => { cancelled = true }
  }, [settings, containerRef, lockable])
}
