import { useRef, useState, useCallback, useEffect } from 'react'
import { CardPreview } from './CardPreview'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'
import { FONT_OPTIONS } from '../fontOptions'
import { PRESET_DEFAULTS, getVisibilityFlags, ABOUT_MAX_LENGTH } from '../data'

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

const COLOR_FIELD_GROUPS = {
  text: [
    { key: 'headingText', label: 'Person Name' },
    { key: 'designationText', label: 'Designation' },
    { key: 'companyNameText', label: 'Company Name' },
    { key: 'taglineText', label: 'Tagline' },
    { key: 'locationText', label: 'Location' },
    { key: 'aboutText', label: 'About' },
    { key: 'websiteButton', label: 'Website' },
  ],
  buttons: [
    { key: 'callButton', label: 'Call Button' },
    { key: 'emailButton', label: 'Email Button' },
    { key: 'whatsappButton', label: 'WhatsApp Button' },
    { key: 'saveContactButton', label: 'Save Contact Button' },
  ],
  socials: [
    ...SOCIAL_PLATFORMS.map((p) => ({ key: `${p.key}Button`, label: p.label })),
    { key: 'websiteButton', label: 'Website Icon' },
  ],
  footer: [
    { key: 'footerText', label: 'Powered by BrillBrains' },
  ],
}

const TYPOGRAPHY_FIELD_GROUPS = {
  text: [
    { key: 'personName', label: 'Person Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'companyName', label: 'Company Name' },
    { key: 'tagline', label: 'Tagline' },
    { key: 'location', label: 'Location' },
    { key: 'about', label: 'About' },
    { key: 'website', label: 'Website' },
    { key: 'footerText', label: 'Footer' },
  ],
}

function ApplyToPopover({ mode, lastTargets, onApply, onClose }) {
  const groups = mode === 'color' ? COLOR_FIELD_GROUPS : TYPOGRAPHY_FIELD_GROUPS
  const allTextKeys = groups.text.map((f) => f.key)
  const allButtonKeys = (groups.buttons || []).map((f) => f.key)
  const allSocialKeys = (groups.socials || []).map((f) => f.key)
  const allFooterKeys = (groups.footer || []).map((f) => f.key)
  const allKeys = [...new Set([...allTextKeys, ...allButtonKeys, ...allSocialKeys, ...allFooterKeys])]

  const [selected, setSelected] = useState(() => new Set(lastTargets && lastTargets.length ? lastTargets : []))
  const popoverRef = useRef(null)

  useEffect(() => {
    function handleClick(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function toggle(key) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="apply-to-popover" ref={popoverRef}>
      <div className="apply-to-quick-actions">
        <button type="button" className="apply-to-quick-btn" onClick={() => setSelected(new Set(allTextKeys))}>Apply to All Text</button>
        {allButtonKeys.length > 0 && (
          <button type="button" className="apply-to-quick-btn" onClick={() => setSelected(new Set(allButtonKeys))}>Apply to All Buttons</button>
        )}
        {allSocialKeys.length > 0 && (
          <button type="button" className="apply-to-quick-btn" onClick={() => setSelected(new Set(allSocialKeys))}>Apply to All Social Icons</button>
        )}
        {mode === 'color' && (
          <button type="button" className="apply-to-quick-btn" onClick={() => setSelected(new Set(allKeys))}>Apply to Everything</button>
        )}
      </div>
      <div className="apply-to-groups">
        <div className="apply-to-group">
          <h4>Individual Fields</h4>
          {groups.text.map((f) => (
            <label key={f.key} className="apply-to-checkbox">
              <input type="checkbox" checked={selected.has(f.key)} onChange={() => toggle(f.key)} />
              <span>{f.label}</span>
            </label>
          ))}
        </div>
        {groups.buttons && (
          <div className="apply-to-group">
            <h4>Buttons</h4>
            {groups.buttons.map((f) => (
              <label key={f.key} className="apply-to-checkbox">
                <input type="checkbox" checked={selected.has(f.key)} onChange={() => toggle(f.key)} />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        )}
        {groups.socials && (
          <div className="apply-to-group">
            <h4>Social Icons</h4>
            {groups.socials.map((f) => (
              <label key={f.key} className="apply-to-checkbox">
                <input type="checkbox" checked={selected.has(f.key)} onChange={() => toggle(f.key)} />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        )}
        {groups.footer && (
          <div className="apply-to-group">
            <h4>Footer</h4>
            {groups.footer.map((f) => (
              <label key={f.key} className="apply-to-checkbox">
                <input type="checkbox" checked={selected.has(f.key)} onChange={() => toggle(f.key)} />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="apply-to-actions">
        <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
        <button type="button" className="primary-button" onClick={() => onApply([...selected])} disabled={selected.size === 0}>Apply</button>
      </div>
    </div>
  )
}

function ApplyToTrigger({ mode, value, lastTargets, onRemember, onApplyMany }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="apply-to-trigger-wrap">
      <button type="button" className="apply-to-trigger" title="Apply to..." onClick={() => setOpen((o) => !o)}>
        🖌
      </button>
      {open && (
        <ApplyToPopover
          mode={mode}
          lastTargets={lastTargets}
          onClose={() => setOpen(false)}
          onApply={(keys) => {
            onRemember(keys)
            onApplyMany(keys, value)
            setOpen(false)
          }}
        />
      )}
    </span>
  )
}

function ColorField({ label, value, onChange, onBegin, onCommit, lastTargets, onRemember, onApplyMany }) {
  return (
    <span className="control-with-apply">
      <InlineColorControl label={label} value={value} onChange={onChange} onBegin={onBegin} onCommit={onCommit} />
      <ApplyToTrigger mode="color" value={value} lastTargets={lastTargets} onRemember={onRemember} onApplyMany={onApplyMany} />
    </span>
  )
}

function TypographyField({ label, value, onChange, onBegin, onCommit, lastTargets, onRemember, onApplyMany }) {
  return (
    <span className="control-with-apply control-with-apply--typography">
      <FontSelect label={label} value={value} onChange={onChange} onBegin={onBegin} onCommit={onCommit} />
      <ApplyToTrigger mode="typography" value={value} lastTargets={lastTargets} onRemember={onRemember} onApplyMany={onApplyMany} />
    </span>
  )
}

function Field({ label, value, onChange, onBegin, onCommit, multiline = false, colorControl = null, maxLength = null }) {
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
        onChange={(event) => {
          const next = maxLength ? event.target.value.slice(0, maxLength) : event.target.value
          onChange(next)
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !multiline) event.currentTarget.blur()
        }}
        rows={multiline ? 3 : undefined}
        maxLength={maxLength || undefined}
      />
      {maxLength && (
        <span className={`field-char-counter ${(value?.length || 0) >= maxLength ? 'field-char-counter--limit' : ''}`}>
          {value?.length || 0} / {maxLength}
        </span>
      )}
    </div>
  )
}

function VisibilityToggle({ checked, onChange, label }) {
  return (
    <label className="visibility-toggle" title={checked ? `Hide ${label}` : `Show ${label}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="visibility-toggle-slider" />
    </label>
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
        <label className="switch" title={social.enabled === false ? 'Show this social' : 'Hide this social'}>
          <input
            type="checkbox"
            checked={social.enabled !== false}
            onChange={(event) => onChange({ enabled: event.target.checked })}
          />
          <span />
        </label>
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

function ShareCardModal({ url, copied, onCopy, onClose }) {
  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="confirm-dialog share-card-dialog" onClick={(event) => event.stopPropagation()}>
        <h2>Share Card</h2>
        <p>Anyone with this link can view your published digital card.</p>
        <div className="share-url-row">
          <input className="share-url-input" value={url || ''} readOnly onFocus={(event) => event.target.select()} />
          <button className="primary-button" type="button" onClick={onCopy}>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function PresetConfirmModal({ onCancel, onConfirm }) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        <h2>Change Card Preset?</h2>
        <p>
          Changing the preset may hide some fields from your card.
          <br />
          Your data will not be deleted and will reappear if you switch back.
        </p>
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary-button" type="button" onClick={onConfirm}>Continue</button>
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
  publicUrl,
  saveStatus,
  cardId,
  cardStatus,
  hasUnsavedChanges,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onDiscard,
}) {
  const [activePanel, setActivePanel] = useState('design')
  const commitTimerRef = useRef(null)
  const uploadRef = useRef(null)
  const coverUploadRef = useRef(null)
  const [cropperSrc, setCropperSrc] = useState(null)
  const [lastColorTargets, setLastColorTargets] = useState([])
  const [lastTypographyTargets, setLastTypographyTargets] = useState([])
  const [presetConfirm, setPresetConfirm] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
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

  function applyColorToFields(keys, value) {
    beginLiveEdit?.()
    ;(setProfileLive || setProfile)((current) => ({
      ...current,
      theme: keys.reduce((acc, key) => ({ ...acc, [key]: value }), { ...current.theme }),
    }))
    if (commitLiveEdit) setTimeout(commitLiveEdit, 0)
  }

  function applyTypographyToFields(keys, value) {
    beginLiveEdit?.()
    ;(setProfileLive || setProfile)((current) => ({
      ...current,
      typography: keys.reduce((acc, key) => ({ ...acc, [key]: value }), { ...(current.typography || {}) }),
    }))
    if (commitLiveEdit) setTimeout(commitLiveEdit, 0)
  }

  const applyColorProps = { lastTargets: lastColorTargets, onRemember: setLastColorTargets, onApplyMany: applyColorToFields }
  const applyTypographyProps = { lastTargets: lastTypographyTargets, onRemember: setLastTypographyTargets, onApplyMany: applyTypographyToFields }

  function handleCopyShareLink() {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
      .then(() => {
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      })
      .catch(() => {})
  }

  function requestPresetChange(preset) {
    if (preset === profile.cardType) return
    setPresetConfirm(preset)
  }

  function confirmPresetChange() {
    const preset = presetConfirm
    setPresetConfirm(null)
    if (!preset) return
    beginLiveEdit?.()
    const flags = getVisibilityFlags(preset)
    ;(setProfileLive || setProfile)((current) => ({ ...current, cardType: preset, ...flags }))
    if (commitLiveEdit) setTimeout(commitLiveEdit, 0)
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

  function updateVisibility(field, value) {
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
    {shareOpen && (
      <ShareCardModal
        url={publicUrl}
        copied={shareCopied}
        onCopy={handleCopyShareLink}
        onClose={() => {
          setShareOpen(false)
          setShareCopied(false)
        }}
      />
    )}
    {presetConfirm && (
      <PresetConfirmModal
        onCancel={() => setPresetConfirm(null)}
        onConfirm={confirmPresetChange}
      />
    )}
    <main className="studio studio-workspace">
      <Sidebar
        mode="editor"
        activeEditor={activePanel}
        onEditorNav={setActivePanel}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={onSave}
        onDiscard={onDiscard}
      />
      <section className="editor-panel">
        {['design', 'colors', 'fonts'].includes(activePanel) && (
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
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setShareOpen(true)}
                  disabled={cardStatus !== 'published'}
                  title={cardStatus === 'published' ? 'Share public link' : 'Publish the card before sharing'}
                >
                  Share Card
                </button>
                <button className="text-button" type="button" onClick={onReset}>
                  Reset sample
                </button>
              </>
            )}
          />
        )}

        {activePanel === 'design' && (
        <section className="editor-section settings-panel">
          <h2>Card Preset</h2>
          <p className="settings-description">Choose a preset to control which sections are visible on your card. Your data is preserved when switching.</p>
          <div className="preset-selector">
            {Object.keys(PRESET_DEFAULTS).map((preset) => (
              <button
                key={preset}
                type="button"
                className={`preset-card ${profile.cardType === preset ? 'preset-card--active' : ''}`}
                onClick={() => requestPresetChange(preset)}
              >
                <strong>{preset.charAt(0).toUpperCase() + preset.slice(1)}</strong>
                <span className="preset-card-desc">
                  {preset === 'personal' && 'Photo, name & socials'}
                  {preset === 'professional' && 'Logo, photo, name & company'}
                  {preset === 'business' && 'Logo & company focused'}
                </span>
              </button>
            ))}
          </div>
        </section>
        )}

        {activePanel === 'design' && profile.showLogo !== false && (
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

        {activePanel === 'design' && (profile.showProfilePhoto !== false || profile.showPersonName !== false) && (
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
            <Field
              {...liveControlProps}
              label="Person Name"
              value={profile.personName || profile.brandName}
              onChange={(value) => updateProfile('personName', value)}
              colorControl={<VisibilityToggle label="Person Name" checked={profile.showPersonName !== false} onChange={(v) => updateVisibility('showPersonName', v)} />}
            />
            <Field
              {...liveControlProps}
              label="Designation"
              value={profile.designation || ''}
              onChange={(value) => updateProfile('designation', value)}
              colorControl={<VisibilityToggle label="Designation" checked={profile.showDesignation !== false} onChange={(v) => updateVisibility('showDesignation', v)} />}
            />
            <Field
              {...liveControlProps}
              label="Location"
              value={profile.location}
              onChange={(value) => updateProfile('location', value)}
              colorControl={<VisibilityToggle label="Location" checked={profile.showLocation !== false} onChange={(v) => updateVisibility('showLocation', v)} />}
            />
          </div>
        </section>
        )}

        {activePanel === 'design' && (profile.showCompanyName !== false || profile.showTagline !== false || profile.showAbout !== false) && (
        <section className="editor-section">
          <h2>Business Information</h2>
          <div className="field-grid">
            <Field
              {...liveControlProps}
              label="Company Name"
              value={profile.companyName || ''}
              onChange={(value) => updateProfile('companyName', value)}
              colorControl={<VisibilityToggle label="Company Name" checked={profile.showCompanyName !== false} onChange={(v) => updateVisibility('showCompanyName', v)} />}
            />
            {profile.showProfilePhoto === false && profile.showPersonName === false && (
              <Field
                {...liveControlProps}
                label="Location"
                value={profile.location}
                onChange={(value) => updateProfile('location', value)}
                colorControl={<VisibilityToggle label="Location" checked={profile.showLocation !== false} onChange={(v) => updateVisibility('showLocation', v)} />}
              />
            )}
            <Field
              {...liveControlProps}
              label="Tagline"
              value={profile.tagline}
              onChange={(value) => updateProfile('tagline', value)}
              colorControl={<VisibilityToggle label="Tagline" checked={profile.showTagline !== false} onChange={(v) => updateVisibility('showTagline', v)} />}
            />
            <Field
              {...liveControlProps}
              label="About"
              value={profile.about}
              onChange={(value) => updateProfile('about', value)}
              multiline
              maxLength={ABOUT_MAX_LENGTH}
              colorControl={<VisibilityToggle label="About" checked={profile.showAbout !== false} onChange={(v) => updateVisibility('showAbout', v)} />}
            />
          </div>
        </section>
        )}

        {activePanel === 'design' && (
        <section className="editor-section">
          <h2>Contact Information</h2>
          <div className="field-grid field-grid--two">
            <Field
              {...liveControlProps}
              label="Email"
              value={profile.email}
              onChange={(value) => updateProfile('email', value)}
              colorControl={<VisibilityToggle label="Email Button" checked={profile.showEmailButton !== false} onChange={(v) => updateVisibility('showEmailButton', v)} />}
            />
            <Field
              {...liveControlProps}
              label="Phone"
              value={profile.phone}
              onChange={(value) => updateProfile('phone', value)}
              colorControl={<VisibilityToggle label="Call Button" checked={profile.showCallButton !== false} onChange={(v) => updateVisibility('showCallButton', v)} />}
            />
            <Field
              {...liveControlProps}
              label="Website"
              value={profile.website}
              onChange={(value) => updateProfile('website', value)}
              colorControl={<VisibilityToggle label="Website" checked={profile.showWebsite !== false} onChange={(v) => updateVisibility('showWebsite', v)} />}
            />
            <Field
              {...liveControlProps}
              label="WhatsApp"
              value={profile.whatsapp}
              onChange={(value) => updateProfile('whatsapp', value)}
              colorControl={<VisibilityToggle label="WhatsApp Button" checked={profile.showWhatsappButton !== false} onChange={(v) => updateVisibility('showWhatsappButton', v)} />}
            />
          </div>
        </section>
        )}

        {activePanel === 'design' && (
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

        {activePanel === 'design' && (
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

        {activePanel === 'colors' && (
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
                <ColorField {...liveControlProps} {...applyColorProps} label="Person Name" value={profile.theme?.headingText || profile.palette.ink} onChange={(value) => updateTheme('headingText', value)} />
                <ColorField {...liveControlProps} {...applyColorProps} label="Designation" value={profile.theme?.designationText || profile.theme?.bodyText || profile.palette.ink} onChange={(value) => updateTheme('designationText', value)} />
                <ColorField {...liveControlProps} {...applyColorProps} label="Company Name" value={profile.theme?.companyNameText || profile.theme?.headingText || profile.palette.ink} onChange={(value) => updateTheme('companyNameText', value)} />
                <ColorField {...liveControlProps} {...applyColorProps} label="Tagline" value={profile.theme?.taglineText || profile.palette.ink} onChange={(value) => updateTheme('taglineText', value)} />
                <ColorField {...liveControlProps} {...applyColorProps} label="Location" value={profile.theme?.locationText || profile.palette.ink} onChange={(value) => updateTheme('locationText', value)} />
                <ColorField {...liveControlProps} {...applyColorProps} label="About" value={profile.theme?.aboutText || profile.palette.ink} onChange={(value) => updateTheme('aboutText', value)} />
              </div>
            </div>
            <div className="customize-color-group">
              <h3>Action Buttons</h3>
              <div className="theme-color-grid">
                <ColorField {...liveControlProps} {...applyColorProps} label="Call Button" value={profile.theme?.callButton || profile.theme?.primaryButton || profile.palette.primary} onChange={(value) => updateTheme('callButton', value)} />
                <ColorField {...liveControlProps} {...applyColorProps} label="Email Button" value={profile.theme?.emailButton || profile.theme?.primaryButton || profile.palette.primary} onChange={(value) => updateTheme('emailButton', value)} />
                <ColorField {...liveControlProps} {...applyColorProps} label="WhatsApp Button" value={profile.theme?.whatsappButton || profile.theme?.primaryButton || profile.palette.primary} onChange={(value) => updateTheme('whatsappButton', value)} />
                <ColorField {...liveControlProps} {...applyColorProps} label="Save Contact Button" value={profile.theme?.saveContactButton || profile.palette.accent} onChange={(value) => updateTheme('saveContactButton', value)} />
              </div>
            </div>
            <div className="customize-color-group">
              <h3>Social Icons</h3>
              <div className="theme-color-grid">
                <ColorField {...liveControlProps} {...applyColorProps} label="Website" value={profile.theme?.websiteButton || profile.palette.primary} onChange={(value) => updateTheme('websiteButton', value)} />
                {SOCIAL_PLATFORMS.map((platform) => (
                  <ColorField
                    key={platform.key}
                    label={platform.label}
                    value={profile.theme?.[`${platform.key}Button`] || profile.theme?.primaryButton || profile.palette.primary}
                    onChange={(value) => updateTheme(`${platform.key}Button`, value)}
                    {...liveControlProps}
                    {...applyColorProps}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
        )}

        {activePanel === 'fonts' && (
        <section className="editor-section typography-panel">
          <h2>Typography</h2>
          <div className="field-grid field-grid--two">
            <TypographyField {...liveControlProps} {...applyTypographyProps} label="Person Name" value={profile.typography?.personName || profile.typography?.companyName || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('personName', value)} />
            <TypographyField {...liveControlProps} {...applyTypographyProps} label="Designation" value={profile.typography?.designation || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('designation', value)} />
            <TypographyField {...liveControlProps} {...applyTypographyProps} label="Company Name" value={profile.typography?.companyName || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('companyName', value)} />
            <TypographyField {...liveControlProps} {...applyTypographyProps} label="Tagline" value={profile.typography?.tagline || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('tagline', value)} />
            <TypographyField {...liveControlProps} {...applyTypographyProps} label="Location" value={profile.typography?.location || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('location', value)} />
            <TypographyField {...liveControlProps} {...applyTypographyProps} label="About" value={profile.typography?.about || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('about', value)} />
            <FontSelect {...liveControlProps} label="Button Labels" value={profile.typography?.buttonLabels || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('buttonLabels', value)} />
            <TypographyField {...liveControlProps} {...applyTypographyProps} label="Footer Text" value={profile.typography?.footerText || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('footerText', value)} />
            <TypographyField {...liveControlProps} {...applyTypographyProps} label="Website" value={profile.typography?.website || profile.fontFamily || FONT_OPTIONS[0].value} onChange={(value) => updateTypography('website', value)} />
          </div>
        </section>
        )}

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
