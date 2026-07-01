import { useState } from 'react'
import { paletteVariables } from '../theme'

function ActionIcon({ type }) {
  const paths = {
    call: <path d="M6.6 3.4c.5-.5 1.3-.4 1.7.2l2 3c.3.5.3 1.1-.1 1.5L8.8 9.5a11.2 11.2 0 0 0 5.7 5.7l1.4-1.4c.4-.4 1-.4 1.5-.1l3 2c.6.4.7 1.2.2 1.7l-1.7 1.8c-.7.7-1.8 1-2.8.7C9.9 18.3 5.7 14.1 4.1 7.9c-.3-1 .1-2.1.8-2.8l1.7-1.7Z" />,
    email: <path d="M4 6.8C4 5.8 4.8 5 5.8 5h12.4c1 0 1.8.8 1.8 1.8v10.4c0 1-.8 1.8-1.8 1.8H5.8c-1 0-1.8-.8-1.8-1.8V6.8Zm1.8-.1L12 11.1l6.2-4.4H5.8Zm12.4 10.6V8.8l-5.7 4a.9.9 0 0 1-1 0l-5.7-4v8.5h12.4Z" />,
    whatsapp: <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 21.95l4.878-1.372A9.95 9.95 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Zm0 18a7.95 7.95 0 0 1-4.032-1.098l-.29-.174-2.894.814.826-2.822-.19-.298A7.958 7.958 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8Zm4.406-5.845c-.242-.121-1.432-.707-1.654-.788-.222-.08-.383-.12-.544.121-.16.242-.623.788-.764.95-.14.16-.282.18-.524.06-.242-.12-1.02-.376-1.943-1.198-.718-.641-1.203-1.432-1.344-1.674-.14-.242-.015-.373.106-.493.108-.108.242-.282.363-.423.12-.14.16-.242.242-.403.08-.16.04-.302-.02-.423-.06-.12-.544-1.313-.746-1.797-.196-.472-.396-.408-.544-.415l-.463-.008a.888.888 0 0 0-.644.302c-.222.242-.845.826-.845 2.014s.865 2.335.985 2.496c.12.16 1.701 2.597 4.122 3.643.576.249 1.025.397 1.375.508.578.184 1.104.158 1.52.096.463-.069 1.432-.585 1.634-1.15.2-.564.2-1.047.14-1.148-.06-.1-.222-.16-.463-.282Z" />,
    save: <path d="M12 3a1 1 0 0 1 1 1v8.2l2.4-2.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0l-4.1-4.1a1 1 0 0 1 1.4-1.4l2.4 2.4V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />,
  }

  return (
    <svg aria-hidden="true" className="action-icon" viewBox="0 0 24 24" fill="currentColor">
      {paths[type]}
    </svg>
  )
}

function SocialIcon({ platform }) {
  const paths = {
    instagram: (
      <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm4.5 3a5 5 0 1 1 0 10A5 5 0 0 1 12 7Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.25-2.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" />
    ),
    facebook: (
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    ),
    linkedin: (
      <>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </>
    ),
    twitter: (
      <path d="M21.742 21.75l-7.563-11.179 7.056-8.321h-2.456l-5.691 6.714-4.54-6.714H2.359l7.29 10.776L2.25 21.75h2.456l6.035-7.118 4.818 7.118h6.191-.008zM7.739 3.818L18.81 20.182h-2.447L5.29 3.818h2.447z" />
    ),
    youtube: (
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    ),
    telegram: (
      <path d="M21.2 2.1 1.1 9.9c-1.4.5-1.3 1.3-.2 1.6l5 1.6 11.5-7.3c.5-.3 1 .1.6.5l-9.3 8.4h-.1l.3 5.2c.5 0 .7-.2 1-.5l2.4-2.3 5 3.7c.9.5 1.5.2 1.8-.8L23 3.3c.4-1.3-.5-1.8-1.8-1.2z" />
    ),
  }

  return (
    <svg aria-hidden="true" className="social-icon" viewBox="0 0 24 24" fill="currentColor">
      {paths[platform] ?? null}
    </svg>
  )
}

function safeLink(value, fallback = '#') {
  if (!value) return fallback
  const destination = value.match(/^(https?:|mailto:|tel:)/i) ? value : `https://${value}`
  try {
    const protocol = new URL(destination).protocol
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(protocol) ? destination : fallback
  } catch {
    return fallback
  }
}

function buildContactFile(profile) {
  const content = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${profile.brandName}`,
    `ORG:${profile.brandName}`,
    `TEL:${profile.phone}`,
    `EMAIL:${profile.email}`,
    `URL:${safeLink(profile.website)}`,
    'END:VCARD',
  ].join('\n')
  const blob = new Blob([content], { type: 'text/vcard' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${profile.handle || 'contact'}.vcf`
  anchor.click()
  URL.revokeObjectURL(url)
}

function SaveContactModal({ profile, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [status, setStatus] = useState('idle')

  function handleSubmit(e) {
    e.preventDefault()
    buildContactFile(profile)
    setStatus('sent')
    setTimeout(onClose, 1200)
  }

  return (
    <div className="save-modal-overlay" onClick={onClose}>
      <div className="save-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Save Contact</h3>
        <p className="save-modal-hint">Enter your details to save this contact.</p>
        {status === 'sent' ? (
          <p className="save-modal-success">Contact saved! &#10003;</p>
        ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            type="email"
            placeholder="Your email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            type="tel"
            placeholder="Your phone number"
            required
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <div className="save-modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button">Save Contact</button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}

export function CardPreview({ profile, immersive = false }) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const logoSettings = profile.logoSettings ?? {
    width: 108,
    offsetX: 0,
    offsetY: 0,
  }
  const coverSettings = profile.coverSettings ?? {
    height: 325,
    zoom: 100,
    positionX: 50,
    positionY: 35,
    fade: 62,
    shade: 24,
  }

  return (
    <article
      className={`profile-card ${immersive ? 'profile-card--immersive' : ''}`}
      style={paletteVariables(profile.palette, profile.theme)}
    >
      <div
        className="card-top-band"
        style={{
          height: `${logoSettings.bandHeight ?? 130}px`,
          backgroundColor: profile.logoBg || 'transparent',
        }}
      >
        <img
          className="brand-logo"
          src={profile.logo}
          alt={`${profile.brandName} logo`}
          style={{
            maxWidth: `${logoSettings.width ?? 100}%`,
            maxHeight: `${logoSettings.width ?? 100}%`,
            transform: `translateY(${logoSettings.offsetY}px)`,
          }}
        />
      </div>
      <header className="card-header">
        <div className="profile-photo-ring" style={{ transform: `translateY(${coverSettings.offsetY ?? 0}px)` }}>
          <div
            className="profile-photo"
            style={{
              backgroundImage: `url(${profile.coverImage})`,
              backgroundSize: coverSettings.bgSize ? `${coverSettings.bgSize}%` : 'cover',
              backgroundPosition: `${coverSettings.positionX ?? 50}% ${coverSettings.positionY ?? 50}%`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        </div>
        <h2>{profile.brandName}</h2>
        <p className="tagline">{profile.tagline}</p>
        <p className="card-location">{profile.location}</p>
      </header>

      <div className="quick-actions" aria-label="Contact actions">
        <a className="quick-action-call" href={`tel:${profile.phone.replaceAll(' ', '')}`} aria-label="Call">
          <ActionIcon type="call" />
          <span>Call</span>
        </a>
        <a className="quick-action-email" href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(profile.email)}`} target="_blank" rel="noreferrer" aria-label="Email">
          <ActionIcon type="email" />
          <span>Email</span>
        </a>
        <a
          className="quick-action-whatsapp"
          href={`https://wa.me/${profile.whatsapp.replaceAll('+', '')}`}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
        >
          <ActionIcon type="whatsapp" />
          <span>WhatsApp</span>
        </a>
        <button className="save-contact" type="button" onClick={() => setShowSaveModal(true)}>
          <ActionIcon type="save" />
          Save Contact
        </button>
      </div>

      <p className="card-about">{profile.about}</p>

      <footer className="card-footer">
        <div className="socials">
          {profile.socials.map(({ platform, url }) => (
            <a key={platform} className={`social-${platform}`} href={safeLink(url)} target="_blank" rel="noreferrer" aria-label={platform}>
              <SocialIcon platform={platform} />
            </a>
          ))}
        </div>
        <a className="website" href={safeLink(profile.website)} target="_blank" rel="noreferrer">
          {profile.website}
        </a>
        {profile.branding?.poweredBy !== false && (
          <a
            className="powered-by"
            href={profile.branding?.url || 'https://brillbrainsconsultants.com'}
            target="_blank"
            rel="noreferrer"
          >git 
            {profile.branding?.label || 'Powered by Brillbrains Consultants'}
          </a>
        )}
      </footer>
      {showSaveModal && <SaveContactModal profile={profile} onClose={() => setShowSaveModal(false)} />}
    </article>
  )
}
