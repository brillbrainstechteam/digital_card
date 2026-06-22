import { useRef } from 'react'
import { CardPreview } from './CardPreview'
import { blankLink } from '../data'

function Field({ label, value, onChange, multiline = false }) {
  const Input = multiline ? 'textarea' : 'input'
  return (
    <label className="field">
      <span>{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} rows={multiline ? 3 : undefined} />
    </label>
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
  onCoverUpload,
  onCoverSettingChange,
  paletteStatus,
  onReset,
  onPublicView,
}) {
  const uploadRef = useRef(null)
  const coverUploadRef = useRef(null)
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
    <main className="studio">
      <section className="editor-panel">
        <div className="studio-heading">
          <div>
            <p className="eyebrow">Card studio</p>
            <h1>Design your card</h1>
          </div>
          <button className="text-button" type="button" onClick={onReset}>
            Reset sample
          </button>
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
          <div className="swatches" aria-label="Detected brand colors">
            {Object.entries(profile.palette).map(([name, color]) => (
              <div key={name}>
                <span style={{ backgroundColor: color }} />
                <small>{name}</small>
              </div>
            ))}
          </div>
          <div className="logo-controls">
            <RangeControl
              label="Logo size"
              value={logoSettings.width}
              min={60}
              max={300}
              suffix="px"
              onChange={(value) => onLogoSettingChange('width', value)}
            />
            <RangeControl
              label="Horizontal position"
              value={logoSettings.offsetX}
              min={-90}
              max={90}
              suffix="px"
              onChange={(value) => onLogoSettingChange('offsetX', value)}
            />
            <RangeControl
              label="Vertical position"
              value={logoSettings.offsetY}
              min={-40}
              max={40}
              suffix="px"
              onChange={(value) => onLogoSettingChange('offsetY', value)}
            />
            <RangeControl
              label="Remove image background"
              value={logoSettings.removal}
              min={0}
              max={110}
              onChange={(value) => onLogoSettingChange('removal', value)}
            />
            <p className="control-note">
              Optional: remove a solid box behind a logo. Use 0 for transparent SVG logos.
            </p>
          </div>
        </section>

        <section className="editor-section cover-box">
          <div className="editor-title">
            <h2>Cover image</h2>
            <button className="text-button" type="button" onClick={() => coverUploadRef.current?.click()}>
              Upload image
            </button>
          </div>
          <div className="cover-upload-preview">
            <img src={profile.coverImage} alt="" />
            <p>
              This is the large visual behind the top of your card. It fades into the theme
              background below.
            </p>
            <input
              ref={coverUploadRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={onCoverUpload}
              hidden
            />
          </div>
          <div className="logo-controls cover-controls">
            <RangeControl
              label="Image height"
              value={coverSettings.height}
              min={210}
              max={430}
              suffix="px"
              onChange={(value) => onCoverSettingChange('height', value)}
            />
            <RangeControl
              label="Image zoom"
              value={coverSettings.zoom}
              min={100}
              max={180}
              suffix="%"
              onChange={(value) => onCoverSettingChange('zoom', value)}
            />
            <RangeControl
              label="Horizontal focus"
              value={coverSettings.positionX}
              min={0}
              max={100}
              suffix="%"
              onChange={(value) => onCoverSettingChange('positionX', value)}
            />
            <RangeControl
              label="Vertical focus"
              value={coverSettings.positionY}
              min={0}
              max={100}
              suffix="%"
              onChange={(value) => onCoverSettingChange('positionY', value)}
            />
            <RangeControl
              label="Fade depth"
              value={coverSettings.fade}
              min={30}
              max={88}
              suffix="%"
              onChange={(value) => onCoverSettingChange('fade', value)}
            />
            <RangeControl
              label="Dark overlay"
              value={coverSettings.shade}
              min={0}
              max={70}
              suffix="%"
              onChange={(value) => onCoverSettingChange('shade', value)}
            />
          </div>
        </section>

        <section className="editor-section">
          <h2>Profile</h2>
          <div className="field-grid">
            <Field label="Brand name" value={profile.brandName} onChange={(value) => updateProfile('brandName', value)} />
            <Field label="Handle" value={profile.handle} onChange={(value) => updateProfile('handle', value)} />
            <Field label="Tagline" value={profile.tagline} onChange={(value) => updateProfile('tagline', value)} />
            <Field label="Location" value={profile.location} onChange={(value) => updateProfile('location', value)} />
            <Field label="About" value={profile.about} onChange={(value) => updateProfile('about', value)} multiline />
          </div>
        </section>

        <section className="editor-section">
          <h2>Contact</h2>
          <div className="field-grid field-grid--two">
            <Field label="Email" value={profile.email} onChange={(value) => updateProfile('email', value)} />
            <Field label="Phone" value={profile.phone} onChange={(value) => updateProfile('phone', value)} />
            <Field label="Website" value={profile.website} onChange={(value) => updateProfile('website', value)} />
            <Field label="WhatsApp" value={profile.whatsapp} onChange={(value) => updateProfile('whatsapp', value)} />
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-title">
            <h2>Links</h2>
            <button
              className="text-button"
              type="button"
              onClick={() => setProfile((current) => ({ ...current, links: [...current.links, blankLink()] }))}
            >
              + Add link
            </button>
          </div>
          <div className="links-editor">
            {profile.links.map((link, index) => (
              <LinkEditor
                key={link.id}
                link={link}
                onChange={(values) => updateLink(link.id, values)}
                onRemove={() => removeLink(link.id)}
                onMove={(direction) => moveLink(index, direction)}
                isFirst={index === 0}
                isLast={index === profile.links.length - 1}
              />
            ))}
          </div>
        </section>
      </section>

      <aside className="preview-panel">
        <div className="preview-toolbar">
          <span>Live preview</span>
          <button className="secondary-button" type="button" onClick={onPublicView}>
            Open public view
          </button>
        </div>
        <CardPreview profile={profile} />
      </aside>
    </main>
  )
}
