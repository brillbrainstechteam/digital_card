import { useRef, useState, useCallback, useEffect } from 'react'
import { CardPreview } from './CardPreview'

const CIRCLE = 260

function PhotoCropper({ src, onConfirm, onCancel }) {
  const [imgSize, setImgSize] = useState(null)
  const [zoom, setZoom] = useState(100)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
      setZoom(100) // 100 = cover fit
      setPos({ x: 50, y: 50 })
    }
    img.src = src
  }, [src])

  // zoom=100 means the image just covers the circle (cover fit)
  // bgSizePct scales with zoom so the same % works at any container size
  const coverBgSize = imgSize ? (imgSize.w / Math.min(imgSize.w, imgSize.h)) * 100 : 100
  const bgSizePct = coverBgSize * (zoom / 100)

  // minimum zoom = full image visible (contain)
  const minZoom = imgSize
    ? Math.max(10, Math.floor((Math.min(imgSize.w, imgSize.h) / Math.max(imgSize.w, imgSize.h)) * 100))
    : 10

  const onPointerDown = useCallback((e) => {
    isDragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    setPos((p) => ({
      x: Math.max(0, Math.min(100, p.x - dx * 0.18)),
      y: Math.max(0, Math.min(100, p.y - dy * 0.18)),
    }))
  }, [])

  const onPointerUp = useCallback(() => { isDragging.current = false }, [])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    setZoom((z) => {
      const min = imgSize
        ? Math.max(10, Math.floor((Math.min(imgSize.w, imgSize.h) / Math.max(imgSize.w, imgSize.h)) * 100))
        : 10
      return Math.max(min, Math.min(300, z - e.deltaY * 0.15))
    })
  }, [imgSize])

  return (
    <div className="cropper-overlay">
      <div className="cropper-modal">
        <h3>Adjust profile photo</h3>
        <p className="cropper-hint">Drag to reposition · Scroll to zoom</p>
        <div
          className="cropper-circle"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: `${bgSizePct}%`,
            backgroundPosition: `${pos.x}% ${pos.y}%`,
            backgroundRepeat: 'no-repeat',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        />
        <label className="range-control cropper-zoom-slider">
          <span>Zoom <strong>{zoom}%</strong></span>
          <input
            type="range"
            min={minZoom}
            max={300}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <div className="cropper-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onConfirm({ bgSize: bgSizePct, positionX: pos.x, positionY: pos.y })}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'twitter', label: 'Twitter / X' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'telegram', label: 'Telegram' },
]

function Field({ label, value, onChange, multiline = false, colorControl = null }) {
  const Input = multiline ? 'textarea' : 'input'
  return (
    <div className="field">
      <span className="field-label-row">
        <span>{label}</span>
        {colorControl}
      </span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} rows={multiline ? 3 : undefined} />
    </div>
  )
}

function RangeControl({ label, value, min, max, suffix = '', onChange }) {
  return (
    <label className="range-control">
      <span>
        {label}
        <strong>{value}{suffix}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function normalizeHex(value) {
  const cleaned = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned
  return null
}

function InlineColorControl({ label, value, onChange }) {
  const color = normalizeHex(value) || '#000000'
  return (
    <label className="inline-color-control" title={`${label} color`}>
      <span>{label}</span>
      <input type="color" value={color} onChange={(event) => onChange(event.target.value)} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          const normalized = normalizeHex(event.target.value)
          if (normalized) onChange(normalized)
        }}
        aria-label={`${label} HEX color`}
      />
    </label>
  )
}

function SocialEditor({ social, onChange, onRemove, colorValue, onColorChange }) {
  const platform = SOCIAL_PLATFORMS.find((p) => p.key === social.platform)
  return (
    <div className="link-editor social-editor">
      <div className="link-head">
        <span className="social-platform-label">{platform?.label ?? social.platform}</span>
        <InlineColorControl label="Color" value={colorValue} onChange={onColorChange} />
        <button className="remove reorder" type="button" onClick={onRemove} aria-label="Remove">
          ×
        </button>
      </div>
      <input
        value={social.url}
        onChange={(e) => onChange({ url: e.target.value })}
        placeholder="https://"
      />
    </div>
  )
}

function LinkEditor({ link, onChange, onRemove, onMove, isFirst, isLast }) {
  return (
    <div className="link-editor">
      <div className="link-head">
        <label className="switch">
          <input
            type="checkbox"
            checked={link.enabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
          />
          <span />
        </label>
        <div className="reorder">
          <button type="button" disabled={isFirst} onClick={() => onMove(-1)} aria-label="Move link up">
            ↑
          </button>
          <button type="button" disabled={isLast} onClick={() => onMove(1)} aria-label="Move link down">
            ↓
          </button>
          <button className="remove" type="button" onClick={onRemove} aria-label="Remove link">
            ×
          </button>
        </div>
      </div>
      <input value={link.label} onChange={(event) => onChange({ label: event.target.value })} placeholder="Button title" />
      <input value={link.subtitle} onChange={(event) => onChange({ subtitle: event.target.value })} placeholder="Description" />
      <input value={link.url} onChange={(event) => onChange({ url: event.target.value })} placeholder="https://" />
    </div>
  )
}

export function Studio({
  profile,
  setProfile,
  onLogoUpload,
  onLogoSettingChange,
  onCoverConfirm,
  paletteStatus,
  onReset,
  onPublicView,
  onSave,
  onShare,
  saveStatus,
  cardId,
  cardStatus,
  hasUnsavedChanges,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) {
  const uploadRef = useRef(null)
  const coverUploadRef = useRef(null)
  const [cropperSrc, setCropperSrc] = useState(null)
  const logoSettings = profile.logoSettings ?? {
    width: 108,
    offsetX: 0,
    offsetY: 0,
    removal: 38,
  }
  const coverSettings = profile.coverSettings ?? {
    height: 325,
    zoom: 100,
    positionX: 50,
    positionY: 35,
    fade: 62,
    shade: 24,
  }

  function updateProfile(field, value) {
    setProfile((current) => ({ ...current, [field]: value }))
  }

  function updateTheme(field, value) {
    setProfile((current) => ({
      ...current,
      theme: { ...current.theme, [field]: value },
    }))
  }

  function handleCoverFileSelect(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 4_000_000) return
    const reader = new FileReader()
    reader.onload = () => {
      // object-fit: cover in the cropper already fits the image perfectly at zoom=100
      setCropperSrc({ src: String(reader.result), initialZoom: 100 })
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function handleCropConfirm(cropSettings) {
    onCoverConfirm(cropperSrc.src, cropSettings)
    setCropperSrc(null)
  }

  function updateLink(id, values) {
    setProfile((current) => ({
      ...current,
      links: current.links.map((link) => (link.id === id ? { ...link, ...values } : link)),
    }))
  }

  function removeLink(id) {
    setProfile((current) => ({
      ...current,
      links: current.links.filter((link) => link.id !== id),
    }))
  }

  function addSocial(platform) {
    setProfile((current) => ({
      ...current,
      socials: [...current.socials, { platform, url: 'https://' }],
    }))
  }

  function updateSocial(index, values) {
    setProfile((current) => {
      const socials = current.socials.map((s, i) => (i === index ? { ...s, ...values } : s))
      return { ...current, socials }
    })
  }

  function removeSocial(index) {
    setProfile((current) => ({
      ...current,
      socials: current.socials.filter((_, i) => i !== index),
    }))
  }

  function moveLink(index, direction) {
    setProfile((current) => {
      const links = [...current.links]
      const target = index + direction
      if (target < 0 || target >= links.length) return current
      ;[links[index], links[target]] = [links[target], links[index]]
      return { ...current, links }
    })
  }

  return (
    <>
    {cropperSrc && (
      <PhotoCropper
        src={cropperSrc.src}
        initialZoom={cropperSrc.initialZoom}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropperSrc(null)}
      />
    )}
    <main className="studio">
      <section className="editor-panel">
        <div className="studio-heading">
          <div>
            <p className="eyebrow">Card studio</p>
            <h1>Design your card</h1>
          </div>
          <div className="studio-heading-actions">
            <button className="secondary-button save-card-button" type="button" onClick={onUndo} disabled={!canUndo}>
              Undo
            </button>
            <button className="secondary-button save-card-button" type="button" onClick={onRedo} disabled={!canRedo}>
              Redo
            </button>
            {onSave && (
              <button
                className="primary-button save-card-button"
                type="button"
                onClick={onSave}
                disabled={!cardId || saveStatus?.type === 'saving'}
                title={!cardId ? 'No card loaded from server' : ''}
              >
                {saveStatus?.type === 'saving' ? 'Saving...' : saveStatus?.type === 'saved' ? 'Saved!' : 'Save Card'}
              </button>
            )}
            {onShare && (
              <button
                className="secondary-button"
                type="button"
                onClick={onShare}
                disabled={cardStatus !== 'published'}
                title={cardStatus === 'published' ? 'Copy public link' : 'Publish the card before sharing'}
              >
                Share Card
              </button>
            )}
            <button className="text-button" type="button" onClick={onReset}>
              Reset sample
            </button>
          </div>
        </div>

        <section className="editor-section theme-box">
          <div className="editor-title">
            <h2>Logo theme</h2>
            <span className={`theme-status ${paletteStatus.type}`}>{paletteStatus.text}</span>
          </div>
          <div className="upload-row">
            <img src={profile.logo} alt="" />
            <div>
              <button className="secondary-button" type="button" onClick={() => uploadRef.current?.click()}>
                Upload logo
              </button>
              <p>Upload your brand logo. Its colors set the card theme automatically.</p>
            </div>
            <input
              ref={uploadRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={onLogoUpload}
              hidden
            />
          </div>
          <div className="logo-controls">
            <RangeControl
              label="Logo size"
              value={logoSettings.width ?? 100}
              min={30}
              max={100}
              suffix="%"
              onChange={(value) => onLogoSettingChange('width', value)}
            />
            <RangeControl
              label="Logo height"
              value={logoSettings.bandHeight ?? 130}
              min={70}
              max={240}
              suffix="px"
              onChange={(value) => onLogoSettingChange('bandHeight', value)}
            />
            <RangeControl
              label="Vertical position"
              value={logoSettings.offsetY}
              min={-40}
              max={40}
              suffix="px"
              onChange={(value) => onLogoSettingChange('offsetY', value)}
            />
          </div>
          <div className="palette-editor">
            <p className="palette-editor-label">Card canvas colors</p>
            <div className="inline-color-row">
              <InlineColorControl
                label="Card"
                value={profile.theme?.cardBackground || profile.palette.surface}
                onChange={(value) => updateTheme('cardBackground', value)}
              />
              <InlineColorControl
                label="Border"
                value={profile.theme?.borderColor || profile.palette.accent}
                onChange={(value) => updateTheme('borderColor', value)}
              />
            </div>
          </div>
        </section>

        <section className="editor-section cover-box">
          <div className="editor-title">
            <h2>Profile photo</h2>
            <button className="text-button" type="button" onClick={() => coverUploadRef.current?.click()}>
              Upload photo
            </button>
          </div>
          <div className="cover-upload-preview">
            <div className="cover-circle-preview">
              <img
                src={profile.coverImage}
                alt=""
                style={{
                  objectPosition: `${coverSettings.positionX}% ${coverSettings.positionY}%`,
                  transform: `scale(${coverSettings.zoom / 100})`,
                }}
              />
            </div>
            <p>After selecting a photo you can drag and zoom to crop it.</p>
            <input
              ref={coverUploadRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleCoverFileSelect}
              hidden
            />
          </div>
          <div className="logo-controls cover-controls">
            <RangeControl
              label="Vertical position"
              value={coverSettings.offsetY ?? 0}
              min={-60}
              max={0}
              suffix="px"
              onChange={(value) => setProfile((c) => ({
                ...c,
                coverSettings: { ...c.coverSettings, offsetY: value },
              }))}
            />
          </div>
        </section>

        <section className="editor-section">
          <h2>Profile</h2>
          <div className="field-grid">
            <Field
              label="Brand name"
              value={profile.brandName}
              onChange={(value) => updateProfile('brandName', value)}
              colorControl={(
                <InlineColorControl
                  label="Text"
                  value={profile.theme?.headingText || profile.palette.ink}
                  onChange={(value) => updateTheme('headingText', value)}
                />
              )}
            />
            <Field label="Handle" value={profile.handle} onChange={(value) => updateProfile('handle', value)} />
            <Field
              label="Tagline"
              value={profile.tagline}
              onChange={(value) => updateProfile('tagline', value)}
              colorControl={(
                <InlineColorControl
                  label="Text"
                  value={profile.theme?.taglineText || profile.palette.ink}
                  onChange={(value) => updateTheme('taglineText', value)}
                />
              )}
            />
            <Field
              label="Location"
              value={profile.location}
              onChange={(value) => updateProfile('location', value)}
              colorControl={(
                <InlineColorControl
                  label="Text"
                  value={profile.theme?.locationText || profile.palette.ink}
                  onChange={(value) => updateTheme('locationText', value)}
                />
              )}
            />
            <Field
              label="About"
              value={profile.about}
              onChange={(value) => updateProfile('about', value)}
              multiline
              colorControl={(
                <InlineColorControl
                  label="Text"
                  value={profile.theme?.aboutText || profile.palette.ink}
                  onChange={(value) => updateTheme('aboutText', value)}
                />
              )}
            />
          </div>
        </section>

        <section className="editor-section">
          <h2>Contact</h2>
          <div className="field-grid field-grid--two">
            <Field
              label="Email"
              value={profile.email}
              onChange={(value) => updateProfile('email', value)}
              colorControl={(
                <InlineColorControl
                  label="Button"
                  value={profile.theme?.emailButton || profile.theme?.primaryButton || profile.palette.primary}
                  onChange={(value) => updateTheme('emailButton', value)}
                />
              )}
            />
            <Field
              label="Phone"
              value={profile.phone}
              onChange={(value) => updateProfile('phone', value)}
              colorControl={(
                <InlineColorControl
                  label="Button"
                  value={profile.theme?.callButton || profile.theme?.primaryButton || profile.palette.primary}
                  onChange={(value) => updateTheme('callButton', value)}
                />
              )}
            />
            <Field
              label="Website"
              value={profile.website}
              onChange={(value) => updateProfile('website', value)}
              colorControl={(
                <InlineColorControl
                  label="Link"
                  value={profile.theme?.websiteButton || profile.palette.primary}
                  onChange={(value) => updateTheme('websiteButton', value)}
                />
              )}
            />
            <Field
              label="WhatsApp"
              value={profile.whatsapp}
              onChange={(value) => updateProfile('whatsapp', value)}
              colorControl={(
                <InlineColorControl
                  label="Button"
                  value={profile.theme?.whatsappButton || profile.theme?.primaryButton || profile.palette.primary}
                  onChange={(value) => updateTheme('whatsappButton', value)}
                />
              )}
            />
          </div>
          <div className="inline-color-row inline-color-row--section">
            <InlineColorControl
              label="Save Contact"
              value={profile.theme?.saveContactButton || profile.palette.accent}
              onChange={(value) => updateTheme('saveContactButton', value)}
            />
          </div>
        </section>

        <section className="editor-section">
          <h2>Branding</h2>
          <label className="toggle-row branding-toggle">
            <div>
              <strong>Powered by Brillbrains Consultants</strong>
              <small>Available in Premium Subscription.</small>
            </div>
            <div className="branding-color-controls">
              <InlineColorControl
                label="Text"
                value={profile.theme?.footerText || profile.palette.ink}
                onChange={(value) => updateTheme('footerText', value)}
              />
            </div>
            <span className="switch">
              <input type="checkbox" checked disabled readOnly />
              <span />
            </span>
          </label>
        </section>

        <section className="editor-section">
          <div className="editor-title">
            <h2>Socials</h2>
            <select
              className="social-platform-picker"
              value=""
              onChange={(e) => { if (e.target.value) { addSocial(e.target.value); e.target.value = '' } }}
            >
              <option value="">+ Add social</option>
              {SOCIAL_PLATFORMS.filter(
                (p) => !profile.socials.some((s) => s.platform === p.key)
              ).map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="links-editor">
            {profile.socials.map((social, index) => (
              <SocialEditor
                key={social.platform}
                social={social}
                onChange={(values) => updateSocial(index, values)}
                onRemove={() => removeSocial(index)}
                colorValue={profile.theme?.[`${social.platform}Button`] || profile.theme?.primaryButton || profile.palette.primary}
                onColorChange={(value) => updateTheme(`${social.platform}Button`, value)}
              />
            ))}
          </div>
        </section>
      </section>

      <aside className="preview-panel">
        <div className="preview-toolbar">
          <span>{hasUnsavedChanges ? 'Live preview - Unsaved changes' : 'Live preview'}</span>
          <button className="secondary-button" type="button" onClick={onPublicView}>
            Open public view
          </button>
        </div>
        <CardPreview profile={profile} />
      </aside>
    </main>
    </>
  )
}
