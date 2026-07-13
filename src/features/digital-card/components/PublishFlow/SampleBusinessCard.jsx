import { useEffect, useRef, useState } from 'react'
import { StaticCanvas } from 'fabric'
import { getCardDimensions, getPalette, getTemplate } from '../../../business-card/bcTemplates'

const SETUP = { size: 'standard', orientation: 'horizontal' }

export function SampleBusinessCard({ profile, templateId = 'corp-minimal', onEdit }) {
  const frontRef = useRef(null)
  const backRef = useRef(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!frontRef.current || !backRef.current) return undefined
    const { w, h } = getCardDimensions(SETUP.size, SETUP.orientation)
    const template = getTemplate(templateId)
    const palette = getPalette(profile)
    const front = new StaticCanvas(frontRef.current, { width: w, height: h, renderOnAddRemove: false })
    const back = new StaticCanvas(backRef.current, { width: w, height: h, renderOnAddRemove: false })
    let cancelled = false

    Promise.all([
      template.load(front, profile, palette, w, h),
      template.loadBack?.(back, profile, palette, w, h),
    ]).then(() => {
      if (cancelled) return
      front.renderAll()
      back.renderAll()
      setLoading(false)
    })

    return () => {
      cancelled = true
      front.dispose()
      back.dispose()
    }
  }, [profile, templateId])

  return (
    <div className="sample-bcard-wrap">
      <div className={`sample-bcard-flip-zone${loading ? ' sample-bcard-loading' : ''}`}>
        <div className="sample-bcard-flip">
          <div className="sample-bcard-face sample-bcard-template-face"><canvas ref={frontRef} /></div>
          <div className="sample-bcard-face sample-bcard-template-face sample-bcard-template-back"><canvas ref={backRef} /></div>
        </div>
      </div>
      <p className="sample-bcard-hint">Built from the live Business Card templates. Hover to preview the back.</p>
      <button type="button" className="secondary-button sample-bcard-edit" onClick={onEdit}>
        Edit Business Card
      </button>
    </div>
  )
}
