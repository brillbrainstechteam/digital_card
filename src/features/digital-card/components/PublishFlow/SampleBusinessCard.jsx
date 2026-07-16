import { useEffect, useState } from 'react'
import { getTemplate, getPalette } from '../../../business-card/bcTemplates'
import {
  renderTemplateThumbnail, renderTemplateBackThumbnail, renderFaceThumbnail,
} from '../../../business-card/canvasHelpers'

const SETUP_SIZE = 'standard'
const DEFAULT_SETUP = { size: SETUP_SIZE, orientation: 'horizontal' }

// Renders via the same renderTemplateThumbnail/renderTemplateBackThumbnail
// helpers the real Business Card gallery uses (canvasHelpers.js) — not a
// second, hand-rolled Fabric render. One source of truth for what a
// template actually looks like, so this preview can never drift out of
// sync with the real editor/gallery (font-loading fixes, style updates,
// etc. all apply here automatically too).
export function SampleBusinessCard({ profile, templateId = 'corp-bright', savedFront, savedBack, setup }) {
  const [images, setImages] = useState({ front: null, back: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    // Prefer the user's saved design over a fresh template render. Rendering
    // the template unconditionally is what made this preview keep showing the
    // pre-edit card after someone edited and saved in the editor.
    const render = savedFront
      ? Promise.all([
          renderFaceThumbnail(savedFront, setup || DEFAULT_SETUP, 1),
          savedBack ? renderFaceThumbnail(savedBack, setup || DEFAULT_SETUP, 1) : Promise.resolve(null),
        ])
      : (() => {
          const template = getTemplate(templateId)
          const palette = getPalette(profile)
          return Promise.all([
            renderTemplateThumbnail(template, profile, palette, SETUP_SIZE),
            renderTemplateBackThumbnail(template, profile, palette, SETUP_SIZE),
          ])
        })()

    render.then(([front, back]) => {
      if (cancelled) return
      setImages({ front, back })
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [profile, templateId, savedFront, savedBack, setup])

  return (
    <div className="sample-bcard-wrap">
      <div className={`sample-bcard-flip-zone${loading ? ' sample-bcard-loading' : ''}`}>
        <div className="sample-bcard-flip">
          <div className="sample-bcard-face sample-bcard-template-face">
            {images.front && <img src={images.front} alt="Business card front" />}
          </div>
          <div className="sample-bcard-face sample-bcard-template-face sample-bcard-template-back">
            {images.back && <img src={images.back} alt="Business card back" />}
          </div>
        </div>
      </div>
      <p className="sample-bcard-hint">Built from the live Business Card templates. Hover to preview the back.</p>
    </div>
  )
}
