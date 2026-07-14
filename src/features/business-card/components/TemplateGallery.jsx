import { useState, useMemo, useEffect } from 'react'
import { ArrowLeft, Search, PlusSquare } from 'lucide-react'
import { TEMPLATES, TEMPLATE_CATEGORIES, getPalette } from '../bcTemplates'
import { renderTemplateThumbnail, renderTemplateBackThumbnail } from '../canvasHelpers'

const DEFAULT_SIZE = 'standard'

export function TemplateGallery({ profile, onBack, onCustomise, onSelectTemplate }) {
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('all')
  const [previewing, setPreviewing] = useState(null) // template being previewed in lightbox
  const [thumbs, setThumbs]     = useState({}) // id -> dataURL (front)
  const [backThumbs, setBackThumbs] = useState({}) // id -> dataURL (back)
  const [faceById, setFaceById] = useState({}) // id -> 'front' | 'back', hover toggle on each card

  const palette = getPalette(profile)

  const filtered = useMemo(() => {
    return TEMPLATES.filter((t) => {
      const matchCat = category === 'all' || t.category === category
      const q = search.toLowerCase()
      const matchSearch = !q || t.label.toLowerCase().includes(q) || t.category.includes(q)
      return matchCat && matchSearch
    })
  }, [search, category])

  // Render real-data thumbnails for visible templates (cached by id) — both
  // the front (tmpl.load) and each template's own actual back (tmpl.loadBack),
  // not a single shared mockup, so hovering/comparing templates shows what
  // that specific template's back really looks like.
  useEffect(() => {
    let cancelled = false
    filtered.forEach((tmpl) => {
      if (!thumbs[tmpl.id]) {
        renderTemplateThumbnail(tmpl, profile, palette, DEFAULT_SIZE)
          .then((url) => { if (!cancelled) setThumbs((prev) => ({ ...prev, [tmpl.id]: url })) })
          .catch((err) => console.error(`[TemplateGallery] front thumbnail failed for "${tmpl.id}":`, err))
      }
      if (!backThumbs[tmpl.id]) {
        renderTemplateBackThumbnail(tmpl, profile, palette, DEFAULT_SIZE)
          .then((url) => { if (!cancelled && url) setBackThumbs((prev) => ({ ...prev, [tmpl.id]: url })) })
          .catch((err) => console.error(`[TemplateGallery] back thumbnail failed for "${tmpl.id}":`, err))
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, profile])

  // The bulk effect above renders all 10+ templates' thumbnails in whatever
  // order they appear in `filtered`, so the one the user actually clicked
  // "compare" on can end up waiting behind several others still in flight —
  // the exact gap where the generic BackPreviewCard fallback below was
  // showing instead of the real design. Rendering the opened template's own
  // pair immediately (independent of that queue) closes that gap.
  useEffect(() => {
    if (!previewing) return
    let cancelled = false
    if (!thumbs[previewing.id]) {
      renderTemplateThumbnail(previewing, profile, palette, DEFAULT_SIZE)
        .then((url) => { if (!cancelled) setThumbs((prev) => ({ ...prev, [previewing.id]: url })) })
        .catch((err) => console.error(`[TemplateGallery] priority front thumbnail failed for "${previewing.id}":`, err))
    }
    if (!backThumbs[previewing.id]) {
      renderTemplateBackThumbnail(previewing, profile, palette, DEFAULT_SIZE)
        .then((url) => { if (!cancelled && url) setBackThumbs((prev) => ({ ...prev, [previewing.id]: url })) })
        .catch((err) => console.error(`[TemplateGallery] priority back thumbnail failed for "${previewing.id}":`, err))
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewing])

  function handleConfirmPreview() {
    if (!previewing) return
    onSelectTemplate(previewing.id, {
      orientation: previewing.orientation === 'vertical' ? 'vertical' : 'horizontal',
      size: DEFAULT_SIZE,
      includeQR: false,
      includeBack: false,
    })
  }

  return (
    <div className="bc-gallery-root">
      {/* Topbar */}
      <div className="bc-gallery-topbar">
        <button type="button" className="secondary-button" style={{ padding: '7px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>
        <h2>Choose a Template</h2>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, color: '#999', pointerEvents: 'none' }} />
          <input
            className="bc-gallery-search"
            style={{ paddingLeft: 30 }}
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Body */}
      <div className="bc-gallery-body">
        {/* Sidebar */}
        <aside className="bc-gallery-sidebar">
          <div className="bc-sidebar-section">
            <div className="bc-sidebar-title">Category</div>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                className={`bc-sidebar-btn${category === cat.key ? ' active' : ''}`}
                onClick={() => setCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Grid — Customise tile first, then real templates prefilled with entered details */}
        <div className="bc-gallery-main">
          <div className="bc-gallery-grid">
            {/* Customise tile — always first */}
            <div className="bc-tmpl-card bc-tmpl-customise" onClick={onCustomise}>
              <div className="bc-tmpl-customise-preview">
                <PlusSquare size={30} />
                <span>Customise</span>
              </div>
              <div className="bc-tmpl-info">
                <h4>Blank Canvas</h4>
                <span className="bc-tmpl-tag">Start from scratch</span>
              </div>
            </div>

            {filtered.map((tmpl) => {
              const face = faceById[tmpl.id] || 'front'
              return (
                <div
                  key={tmpl.id}
                  className="bc-tmpl-card"
                  onClick={() => setPreviewing(tmpl)}
                  onMouseEnter={() => setFaceById((prev) => ({ ...prev, [tmpl.id]: 'back' }))}
                  onMouseLeave={() => setFaceById((prev) => (prev[tmpl.id] ? { ...prev, [tmpl.id]: 'front' } : prev))}
                >
                  <div className="bc-tmpl-preview">
                    {face === 'back'
                      ? backThumbs[tmpl.id]
                        ? <img src={backThumbs[tmpl.id]} alt={`${tmpl.label} back`} />
                        : <div className="bc-lightbox-preview-loading"><span className="bc-spinner" /></div>
                      : thumbs[tmpl.id]
                        ? <img src={thumbs[tmpl.id]} alt={tmpl.label} />
                        : <div dangerouslySetInnerHTML={{ __html: tmpl.svgPreview(palette) }} />}
                  </div>
                  <div className="bc-tmpl-info">
                    <h4>{tmpl.label}</h4>
                    <span className="bc-tmpl-tag">{tmpl.category}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <p>No templates match your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bc-gallery-footer">
        <span style={{ fontSize: 13, color: 'var(--muted)', marginRight: 'auto' }}>
          {filtered.length} template{filtered.length !== 1 ? 's' : ''} available
        </span>
      </div>

      {/* Preview-before-choose lightbox — both sides shown side by side so
          the choice is made with the full card in view, not just the front. */}
      {previewing && (
        <div className="bc-lightbox-overlay" onClick={() => setPreviewing(null)}>
          <div className="bc-lightbox bc-lightbox--both" onClick={(e) => e.stopPropagation()}>
            <h3>{previewing.label}</h3>
            <span className="bc-lightbox-tag">{previewing.category}</span>
            <div className="bc-lightbox-cards">
              <div className="bc-lightbox-card-col">
                <div className="bc-lightbox-preview">
                  {thumbs[previewing.id]
                    ? <img src={thumbs[previewing.id]} alt={`${previewing.label} front`} />
                    : <div dangerouslySetInnerHTML={{ __html: previewing.svgPreview(palette) }} />}
                </div>
                <span className="bc-lightbox-card-label">Front</span>
              </div>
              <div className="bc-lightbox-card-col">
                <div className="bc-lightbox-preview">
                  {backThumbs[previewing.id]
                    ? <img src={backThumbs[previewing.id]} alt={`${previewing.label} back`} />
                    // Was BackPreviewCard — a generic, non-per-template mockup
                    // that looked like a real (wrong) design rather than a
                    // loading state. An honest spinner never misrepresents
                    // what the template actually looks like while its real
                    // back thumbnail (rendered above, on priority) finishes.
                    : (
                      <div className="bc-lightbox-preview-loading">
                        <span className="bc-spinner" />
                        <span>Rendering back design…</span>
                      </div>
                    )}
                </div>
                <span className="bc-lightbox-card-label">Back</span>
              </div>
            </div>
            <div className="bc-lightbox-actions">
              <button type="button" className="secondary-button" onClick={() => setPreviewing(null)}>
                Cancel
              </button>
              <button type="button" className="primary-button" onClick={handleConfirmPreview}>
                Use This Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
