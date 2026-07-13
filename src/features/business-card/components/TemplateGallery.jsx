import { useState, useMemo, useEffect } from 'react'
import { ArrowLeft, Search, PlusSquare } from 'lucide-react'
import { TEMPLATES, TEMPLATE_CATEGORIES, getPalette } from '../bcTemplates'
import { renderTemplateThumbnail, renderTemplateBackThumbnail } from '../canvasHelpers'

const DEFAULT_SIZE = 'standard'

// Same relative-luminance threshold the Fabric templates use for picking
// ink color against a given background — kept here too since this preview
// is plain HTML/CSS, not a Fabric render, so it can't reuse their palette.text.
function contrastInk(bg) {
  const hex = (bg || '#ffffff').replace('#', '')
  if (hex.length !== 6) return '#1a1a1a'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#1a1a1a' : '#ffffff'
}

// Loading-state placeholder only — shown for the instant before the real
// per-template back thumbnail (rendered from the template's own loadBack,
// see renderTemplateBackThumbnail in canvasHelpers.js) finishes generating.
// Every template's actual back differs in bg/ink/QR-side/accent-shape, so
// this generic mockup must never be the thing users compare templates by.
function BackPreviewCard({ profile, palette, orientation, large }) {
  const bg = palette.primary || '#1f2d3d'
  const ink = contrastInk(bg)
  return (
    <div
      className={`bc-back-preview${large ? ' bc-back-preview--lg' : ''}`}
      style={{ background: bg, color: ink, aspectRatio: orientation === 'vertical' ? '4/7' : '7/4' }}
    >
      <div className="bc-back-preview-accent" style={{ background: palette.accent }} />
      <div className="bc-back-preview-main">
        <div className="bc-back-preview-contact">
          <div className="bc-back-preview-name">{profile?.personName || 'Your Name'}</div>
          <div className="bc-back-preview-designation">{profile?.designation || 'Your Title'}</div>
          <div className="bc-back-preview-lines">
            <div>{profile?.phone || '+91 XXXXX XXXXX'}</div>
            <div>{profile?.email || 'email@example.com'}</div>
            <div>{profile?.website || 'www.example.com'}</div>
          </div>
        </div>
        <div className="bc-back-preview-qr">QR</div>
      </div>
    </div>
  )
}

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
          .catch(() => {})
      }
      if (!backThumbs[tmpl.id]) {
        renderTemplateBackThumbnail(tmpl, profile, palette, DEFAULT_SIZE)
          .then((url) => { if (!cancelled && url) setBackThumbs((prev) => ({ ...prev, [tmpl.id]: url })) })
          .catch(() => {})
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, profile])

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
                        : <BackPreviewCard profile={profile} palette={palette} orientation={tmpl.orientation} />
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
                    : <BackPreviewCard profile={profile} palette={palette} orientation={previewing.orientation} large />}
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
