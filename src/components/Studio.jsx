import { useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CardPreview } from './CardPreview'
import { Dashboard } from './Dashboard'
import { PageHeader } from './PageHeader'
import { useAuth } from '../context/AuthContext'
import { FONT_OPTIONS } from '../fontOptions'

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
  { key: 'twitter', label: 'X (Twitter)' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'threads', label: 'Threads' },
  { key: 'soundcloud', label: 'SoundCloud' },
  { key: 'pinterest', label: 'Pinterest' },
  { key: 'patreon', label: 'Patreon' },
  { key: 'twitch', label: 'Twitch' },
  { key: 'applemusic', label: 'Apple Music' },
  { key: 'reddit', label: 'Reddit' },
]

const SOCIAL_DEFAULT_URLS = {
  instagram: 'https://instagram.com',
  facebook: 'https://facebook.com',
  linkedin: 'https://linkedin.com',
  twitter: 'https://x.com',
  youtube: 'https://youtube.com',
  telegram: 'https://telegram.org',
  tiktok: 'https://tiktok.com',
  threads: 'https://threads.net',
  soundcloud: 'https://soundcloud.com',
  pinterest: 'https://pinterest.com',
  patreon: 'https://patreon.com',
  twitch: 'https://twitch.tv',
  applemusic: 'https://music.apple.com',
  reddit: 'https://reddit.com',
}

function Field({ label, value, onChange, onBegin, onCommit, multiline = false, colorControl = null }) {
  const Input = multiline ? 'textarea' : 'input'

  function commit() {
    onCommit?.()
  }

  return (
    <div className="field">
      <span className="field-label-row">
        <span>{label}</span>
        {colorControl}
      </span>
      <Input
        value={value ?? ''}
        onFocus={onBegin}
        onChange={(event) => onChange(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !multiline) event.currentTarget.blur()
        }}
        rows={multiline ? 3 : undefined}
      />
    </div>
  )
}

function RangeControl({ label, value, min, max, suffix = '', onChange, onBegin, onCommit }) {
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
        onPointerDown={onBegin}
        onFocus={onBegin}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onBlur={onCommit}
      />
    </label>
  )
}

function normalizeHex(value) {
  const cleaned = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned
  return null
}

function InlineColorControl({ label, value, onChange, onBegin, onCommit }) {
  const [draft, setDraft] = useState(value)
  const color = normalizeHex(draft) || '#000000'

  useEffect(() => {
    setDraft(value)
  }, [value])

  function commit(next = draft) {
    const normalized = normalizeHex(next)
    if (normalized) {
      onChange(normalized)
      onCommit?.()
    }
  }

  return (
    <label className="inline-color-control" title={`${label} color`}>
      <span>{label}</span>
      <input
        type="color"
        value={color}
        onPointerDown={onBegin}
        onFocus={onBegin}
        onChange={(event) => {
          setDraft(event.target.value)
          onChange(event.target.value)
        }}
        onBlur={(event) => commit(event.target.value)}
        onMouseUp={(event) => commit(event.currentTarget.value)}
      />
      <input
        value={draft}
        onFocus={onBegin}
        onChange={(event) => {
          setDraft(event.target.value)
          const normalized = normalizeHex(event.target.value)
          if (normalized) onChange(normalized)
        }}
        onBlur={(event) => {
          const normalized = normalizeHex(event.target.value)
          if (normalized) {
            setDraft(normalized)
            commit(normalized)
          }
        }}
        aria-label={`${label} HEX color`}
      />
    </label>
  )
}

function CommitInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      placeholder={placeholder}
    />
  )
}

function SocialEditor({ social, onChange, onRemove }) {
  const platform = SOCIAL_PLATFORMS.find((p) => p.key === social.platform)
  return (
    <div className="link-editor social-editor">
      <div className="link-head">
        <span className="social-platform-label">{platform?.label ?? social.platform}</span>
        <button className="remove reorder" type="button" onClick={onRemove} aria-label="Remove">
          ×
        </button>
      </div>
      <CommitInput
        value={social.url}
        onChange={(value) => onChange({ url: value })}
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
      <CommitInput value={link.label} onChange={(value) => onChange({ label: value })} placeholder="Button title" />
      <CommitInput value={link.subtitle} onChange={(value) => onChange({ subtitle: value })} placeholder="Description" />
      <CommitInput value={link.url} onChange={(value) => onChange({ url: value })} placeholder="https://" />
    </div>
  )
}

function FontSelect({ label, value, onChange, onBegin, onCommit }) {
  return (
    <label className="field typography-field">
      <span>{label}</span>
      <select
        className="font-picker"
        value={value}
        onFocus={onBegin}
        onChange={(event) => {
          onChange(event.target.value)
          if (onCommit) setTimeout(onCommit, 0)
        }}
      >
        {FONT_OPTIONS.map((font) => (
          <option key={font.value} value={font.value}>{font.label}</option>
        ))}
      </select>
    </label>
  )
}

function DeleteAccountModal({ onCancel, onConfirm, busy, error }) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog account-delete-dialog">
        <h2>Delete Account?</h2>
        <p>
          This action is permanent.
          <br />
          Deleting your account will remove your profile, cards, and associated data.
        </p>
        {error && <p className="modal-error">{error}</p>}
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="danger-button" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Studio({
  profile,
  setProfile,
  setProfileLive,
  beginLiveEdit,
  commitLiveEdit,
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
  cardStats,
}) {
  const navigate = useNavigate()
  const { user, logout, deleteAccount } = useAuth()
  const [activePanel, setActivePanel] = useState('content')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const commitTimerRef = useRef(null)
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
    beginLiveEdit?.()
    ;(setProfileLive || setProfile)((current) => ({
      ...current,
      [field]: value,
      ...(field === 'personName' ? { brandName: value } : {}),
    }))
    scheduleLiveCommit()
  }

  function updateTheme(field, value) {
    beginLiveEdit?.()
    ;(setProfileLive || setProfile)((current) => ({
      ...current,
      theme: { ...current.theme, [field]: value },
    }))
    scheduleLiveCommit()
  }

  function updateTypography(field, value) {
    beginLiveEdit?.()
    ;(setProfileLive || setProfile)((current) => ({
      ...current,
      typography: {
        ...(current.typography || {}),
        [field]: value,
      },
    }))
    scheduleLiveCommit()
  }

  function updateLogoSetting(field, value) {
    beginLiveEdit?.()
    ;(setProfileLive || setProfile)((current) => ({
      ...current,
      logoSettings: { ...current.logoSettings, [field]: value },
    }))
    scheduleLiveCommit()
  }

  function updateCoverSetting(field, value) {
    beginLiveEdit?.()
    ;(setProfileLive || setProfile)((current) => ({
      ...current,
      coverSettings: { ...current.coverSettings, [field]: value },
    }))
    scheduleLiveCommit()
  }

  function scheduleLiveCommit() {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current)
    commitTimerRef.current = setTimeout(() => {
      commitLiveEdit?.()
      commitTimerRef.current = null
    }, 700)
  }

  function commitNow() {
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current)
      commitTimerRef.current = null
    }
    commitLiveEdit?.()
  }

  const liveControlProps = {
    onBegin: beginLiveEdit,
    onCommit: commitNow,
  }
  const isFullWidthPanel = ['cards', 'settings', 'analytics', 'profile'].includes(activePanel)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  async function handleDeleteAccount() {
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await deleteAccount()
      navigate('/login', { replace: true })
    } catch (error) {
      setDeleteError(error.message || 'Delete account failed.')
    } finally {
      setDeleteBusy(false)
    }
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
      socials: [...current.socials, { platform, url: SOCIAL_DEFAULT_URLS[platform] || 'https://' }],
    }))
  }

  function updateSocial(index, values) {
    beginLiveEdit?.()
    ;(setProfileLive || setProfile)((current) => {
      const socials = current.socials.map((s, i) => (i === index ? { ...s, ...values } : s))
      return { ...current, socials }
    })
    scheduleLiveCommit()
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
    {deleteOpen && (
      <DeleteAccountModal
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => {
          setDeleteOpen(false)
          setDeleteError('')
        }}
        onConfirm={handleDeleteAccount}
      />
    )}
    <main className="studio studio-workspace">
      <aside className="editor-sidebar">
        <div className="editor-sidebar-nav">
          <button
            type="button"
            className={activePanel === 'cards' ? 'active' : ''}
            onClick={() => setActivePanel('cards')}
          >
            Your Cards
          </button>
          {[
            ['content', 'Content'],
            ['customize', 'Customize'],
            ['typography', 'Typography'],
            ['analytics', 'Analytics'],
            ['settings', 'Settings'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={activePanel === key ? 'active' : ''}
              onClick={() => setActivePanel(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="editor-sidebar-profile-wrap">
          <button
            className={`editor-sidebar-profile ${activePanel === 'profile' ? 'active' : ''}`}
            type="button"
            onClick={() => setActivePanel('profile')}
          >
            <div className="sidebar-avatar">{(user?.name || '?').slice(0, 1).toUpperCase()}</div>
            <strong>{user?.name || 'User'}</strong>
          </button>
        </div>
      </aside>
      <section className={`editor-panel ${isFullWidthPanel ? 'editor-panel--wide' : ''}`}>
        {activePanel === 'cards' ? (
          <Dashboard embedded />
        ) : (
        <>
        {['content', 'customize', 'typography'].includes(activePanel) && (
          <PageHeader
            badge="CARD STUDIO"
            title="Design your card"
            actions={(
              <>
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
              </>
            )}
          />
        )}

        {activePanel === 'content' && (
        <section className="editor-section theme-box">
          <div className="editor-title">
            <h2>Logo</h2>
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
              onChange={(value) => updateLogoSetting('width', value)}
              onBegin={beginLiveEdit}
              onCommit={commitNow}
            />
            <RangeControl
              label="Logo height"
              value={logoSettings.bandHeight ?? 130}
              min={70}
              max={240}
              suffix="px"
              onChange={(value) => updateLogoSetting('bandHeight', value)}
              onBegin={beginLiveEdit}
              onCommit={commitNow}
            />
            <RangeControl
              label="Vertical position"
              value={logoSettings.offsetY}
              min={-40}
              max={40}
              suffix="px"
              onChange={(value) => updateLogoSetting('offsetY', value)}
              onBegin={beginLiveEdit}
              onCommit={commitNow}
            />
          </div>
        </section>
        )}

        {activePanel === 'content' && (
        <section className="editor-section cover-box">
          <div className="editor-title">
            <h2>Personal Information</h2>
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
              onChange={(value) => updateCoverSetting('offsetY', value)}
              onBegin={beginLiveEdit}
              onCommit={commitNow}
            />
          </div>
          <div className="field-grid">
            <Field {...liveControlProps} label="Person Name" value={profile.personName || profile.brandName} onChange={(value) => updateProfile('personName', value)} />
            <Field {...liveControlProps} label="Designation" value={profile.designation || ''} onChange={(value) => updateProfile('designation', value)} />
            <Field {...liveControlProps} label="Location" value={profile.location} onChange={(value) => updateProfile('location', value)} />
          </div>
        </section>
        )}

        {activePanel === 'content' && (
        <section className="editor-section">
          <h2>Business Information</h2>
          <div className="field-grid">
            <Field {...liveControlProps} label="Company Name" value={profile.companyName || ''} onChange={(value) => updateProfile('companyName', value)} />
            <Field {...liveControlProps} label="Tagline" value={profile.tagline} onChange={(value) => updateProfile('tagline', value)} />
            <Field {...liveControlProps} label="About" value={profile.about} onChange={(value) => updateProfile('about', value)} multiline />
          </div>
        </section>
        )}

        {activePanel === 'content' && (
        <section className="editor-section">
          <h2>Contact Information</h2>
          <div className="field-grid field-grid--two">
            <Field {...liveControlProps} label="Email" value={profile.email} onChange={(value) => updateProfile('email', value)} />
            <Field {...liveControlProps} label="Phone" value={profile.phone} onChange={(value) => updateProfile('phone', value)} />
            <Field {...liveControlProps} label="Website" value={profile.website} onChange={(value) => updateProfile('website', value)} />
            <Field {...liveControlProps} label="WhatsApp" value={profile.whatsapp} onChange={(value) => updateProfile('whatsapp', value)} />
          </div>
        </section>
        )}

        {activePanel === 'content' && (
        <section className="editor-section">
          <h2>Social Links</h2>
          <div className="social-add-grid">
            {SOCIAL_PLATFORMS.filter(
              (p) => !profile.socials.some((s) => s.platform === p.key)
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                className="social-add-pill"
                onClick={() => addSocial(p.key)}
              >
                + {p.label}
              </button>
            ))}
          </div>
          <div className="links-editor">
            {profile.socials.map((social, index) => (
              <SocialEditor
                key={social.platform}
                social={social}
                onChange={(values) => updateSocial(index, values)}
                onRemove={() => removeSocial(index)}
              />
            ))}
          </div>
        </section>
        )}

        {activePanel === 'content' && (
        <section className="editor-section">
          <h2>BrillBrains Footer</h2>
          <label className="toggle-row branding-toggle">
            <div>
              <strong>Powered by BrillBrains Consultants</strong>
              <small>Available in Premium Subscription.</small>
            </div>
            <span className="switch">
              <input type="checkbox" checked disabled readOnly />
              <span />
            </span>
          </label>
        </section>
        )}

        {activePanel === 'customize' && (
        <section className="editor-section customize-panel">
          <h2>Customize</h2>
          <div className="customize-color-groups">
            <div className="customize-color-group">
              <h3>Card</h3>
              <div className="theme-color-grid">
                <InlineColorControl {...liveControlProps} label="Card Background" value={profile.theme?.cardBackground || profile.palette.surface} onChange={(value) => updateTheme('cardBackground', value)} />
                <InlineColorControl {...liveControlProps} label="Border" value={profile.theme?.borderColor || profile.palette.accent} onChange={(value) => updateTheme('borderColor', value)} />
              </div>
            </div>
            <div className="customize-color-group">
              <h3>Personal Information</h3>
              <div className="theme-color-grid">
                <InlineColorControl {...liveControlProps} label="Person Name" value={profile.theme?.headingText || profile.palette.ink} onChange={(value) => updateTheme('headingText', value)} />
                <InlineColorControl {...liveControlProps} label="Designation" value={profile.theme?.designationText || profile.theme?.bodyText || profile.palette.ink} onChange={(value) => updateTheme('designationText', value)} />
                <InlineColorControl {...liveControlProps} label="Company Name" value={profile.theme?.companyNameText || profile.theme?.headingText || profile.palette.ink} onChange={(value) => updateTheme('companyNameText', value)} />
                <InlineColorControl {...liveControlProps} label="Tagline" value={profile.theme?.taglineText || profile.palette.ink} onChange={(value) => updateTheme('taglineText', value)} />
                <InlineColorControl {...liveControlProps} label="Location" value={profile.theme?.locationText || profile.palette.ink} onChange={(value) => updateTheme('locationText', value)} />
                <InlineColorControl {...liveControlProps} label="About" value={profile.theme?.aboutText || profile.palette.ink} onChange={(value) => updateTheme('aboutText', value)} />
              </div>
            </div>
            <div className="customize-color-group">
              <h3>Action Buttons</h3>
              <div className="theme-color-grid">
                <InlineColorControl {...liveControlProps} label="Call Button" value={profile.theme?.callButton || profile.theme?.primaryButton || profile.palette.primary} onChange={(value) => updateTheme('callButton', value)} />
                <InlineColorControl {...liveControlProps} label="Email Button" value={profile.theme?.emailButton || profile.theme?.primaryButton || profile.palette.primary} onChange={(value) => updateTheme('emailButton', value)} />
                <InlineColorControl {...liveControlProps} label="WhatsApp Button" value={profile.theme?.whatsappButton || profile.theme?.primaryButton || profile.palette.primary} onChange={(value) => updateTheme('whatsappButton', value)} />
                <InlineColorControl {...liveControlProps} label="Save Contact Button" value={profile.theme?.saveContactButton || profile.palette.accent} onChange={(value) => updateTheme('saveContactButton', value)} />
              </div>
            </div>
            <div className="customize-color-group">
              <h3>Social Icons</h3>
              <div className="theme-color-grid">
                <InlineColorControl {...liveControlProps} label="Website" value={profile.theme?.websiteButton || profile.palette.primary} onChange={(value) => updateTheme('websiteButton', value)} />
                {SOCIAL_PLATFORMS.map((platform) => (
                  <InlineColorControl
                    key={platform.key}
                    label={platform.label}
                    value={profile.theme?.[`${platform.key}Button`] || profile.theme?.primaryButton || profile.palette.primary}
                    onChange={(value) => updateTheme(`${platform.key}Button`, value)}
                    {...liveControlProps}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
        )}

        {activePanel === 'typography' && (
        <section className="editor-section typography-panel">
          <h2>Typography</h2>
          <div className="field-grid field-grid--two">
            <FontSelect {...liveControlProps} label="Person Name" value={profile.typography?.personName || profile.typography?.companyName || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('personName', value)} />
            <FontSelect {...liveControlProps} label="Designation" value={profile.typography?.designation || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('designation', value)} />
            <FontSelect {...liveControlProps} label="Company Name" value={profile.typography?.companyName || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('companyName', value)} />
            <FontSelect {...liveControlProps} label="Tagline" value={profile.typography?.tagline || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('tagline', value)} />
            <FontSelect {...liveControlProps} label="Location" value={profile.typography?.location || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('location', value)} />
            <FontSelect {...liveControlProps} label="About" value={profile.typography?.about || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('about', value)} />
            <FontSelect {...liveControlProps} label="Button Labels" value={profile.typography?.buttonLabels || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('buttonLabels', value)} />
            <FontSelect {...liveControlProps} label="Footer Text" value={profile.typography?.footerText || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('footerText', value)} />
            <FontSelect {...liveControlProps} label="Website" value={profile.typography?.website || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('website', value)} />
          </div>
        </section>
        )}

        {activePanel === 'settings' && (
        <>
        <PageHeader
          badge="SETTINGS"
          title="Manage your preferences"
          subtitle="Application settings and preferences will be available soon."
        />
        <section className="editor-section settings-panel">
          <h2>Settings</h2>
          <p className="settings-placeholder">Coming Soon</p>
        </section>
        </>
        )}

        {activePanel === 'analytics' && (
        <>
        <PageHeader
          badge="ANALYTICS"
          title="Track your card performance"
          subtitle="Analytics and visitor insights will be available soon."
        />
        <section className="editor-section settings-panel">
          <h2>Analytics</h2>
          <p className="settings-placeholder">Analytics Coming Soon</p>
        </section>
        </>
        )}

        {activePanel === 'profile' && (
        <>
        <PageHeader
          badge="PROFILE"
          title="Manage your account"
          subtitle="View your personal information, business details and account statistics."
        />
        <section className="editor-section profile-page">
          <h2>Profile</h2>
          <div className="profile-page-grid">
            <div className="profile-page-section">
              <h3>Personal Information</h3>
              <dl>
                <div><dt>Name</dt><dd>{user?.name || 'User'}</dd></div>
                <div><dt>Email</dt><dd>{user?.email || '-'}</dd></div>
                <div><dt>Designation</dt><dd>{profile.designation || '-'}</dd></div>
              </dl>
            </div>
            <div className="profile-page-section">
              <h3>Business Information</h3>
              <dl>
                <div><dt>Business Name</dt><dd>{user?.business_name || '-'}</dd></div>
              </dl>
            </div>
            <div className="profile-page-section">
              <h3>Statistics</h3>
              <dl>
                <div><dt>Total Cards</dt><dd>{cardStats?.total ?? 0}</dd></div>
                <div><dt>Draft Cards</dt><dd>{cardStats?.draft ?? 0}</dd></div>
                <div><dt>Published Cards</dt><dd>{cardStats?.published ?? 0}</dd></div>
                <div><dt>Archived Cards</dt><dd>{cardStats?.archived ?? 0}</dd></div>
              </dl>
            </div>
            <div className="profile-page-section profile-page-actions">
              <h3>Account</h3>
              <button className="profile-action-button" type="button" onClick={handleLogout}>Logout</button>
              <button className="profile-action-button danger-link-button" type="button" onClick={() => setDeleteOpen(true)}>Delete Account</button>
            </div>
          </div>
        </section>
        </>
        )}
        </>
        )}
      </section>

      {!isFullWidthPanel && (
      <aside className="preview-panel">
        <div className="preview-toolbar">
          <span>{hasUnsavedChanges ? 'Live preview - Unsaved changes' : 'Live preview'}</span>
          <button className="secondary-button" type="button" onClick={onPublicView}>
            Open public view
          </button>
        </div>
        <CardPreview profile={profile} />
      </aside>
      )}
    </main>
    </>
  )
}
