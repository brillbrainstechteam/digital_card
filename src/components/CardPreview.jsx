import { paletteVariables } from '../theme'

function ActionIcon({ type }) {
  const paths = {
    call: <path d="M6.6 3.4c.5-.5 1.3-.4 1.7.2l2 3c.3.5.3 1.1-.1 1.5L8.8 9.5a11.2 11.2 0 0 0 5.7 5.7l1.4-1.4c.4-.4 1-.4 1.5-.1l3 2c.6.4.7 1.2.2 1.7l-1.7 1.8c-.7.7-1.8 1-2.8.7C9.9 18.3 5.7 14.1 4.1 7.9c-.3-1 .1-2.1.8-2.8l1.7-1.7Z" />,
    email: <path d="M4 6.8C4 5.8 4.8 5 5.8 5h12.4c1 0 1.8.8 1.8 1.8v10.4c0 1-.8 1.8-1.8 1.8H5.8c-1 0-1.8-.8-1.8-1.8V6.8Zm1.8-.1L12 11.1l6.2-4.4H5.8Zm12.4 10.6V8.8l-5.7 4a.9.9 0 0 1-1 0l-5.7-4v8.5h12.4Z" />,
    chat: <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v7A2.5 2.5 0 0 1 16.5 15h-5.1l-4.2 3.2c-.5.4-1.2 0-1.1-.7l.5-2.6A2.5 2.5 0 0 1 5 12.5v-7Zm4 3.7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />,
    save: <path d="M12 3a1 1 0 0 1 1 1v8.2l2.4-2.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0l-4.1-4.1a1 1 0 0 1 1.4-1.4l2.4 2.4V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />,
  }

  return (
    <svg aria-hidden="true" className="action-icon" viewBox="0 0 24 24" fill="currentColor">
      {paths[type]}
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

export function CardPreview({ profile, immersive = false }) {
  const enabledLinks = profile.links.filter((link) => link.enabled)
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
      style={paletteVariables(profile.palette)}
    >
      <div className="card-aura" />
      <div
        className="card-cover"
        style={{
          height: `${coverSettings.height}px`,
          '--cover-fade': `${coverSettings.fade}%`,
          '--cover-shade': coverSettings.shade / 100,
        }}
      >
        <img
          src={profile.coverImage}
          alt=""
          style={{
            objectPosition: `${coverSettings.positionX}% ${coverSettings.positionY}%`,
            transform: `scale(${coverSettings.zoom / 100})`,
          }}
        />
      </div>
      <header className="card-header card-header--over-cover">
        <div className="logo-stage">
          <img
            className="brand-logo"
            src={profile.logo}
            alt={`${profile.brandName} logo`}
            style={{
              width: `${logoSettings.width}px`,
              transform: `translate(${logoSettings.offsetX}px, ${logoSettings.offsetY}px)`,
            }}
          />
        </div>
        <h2>{profile.brandName}</h2>
        <p className="tagline">{profile.tagline}</p>
        <p className="card-location">{profile.location}</p>
      </header>

      <div className="quick-actions" aria-label="Contact actions">
        <a href={`tel:${profile.phone.replaceAll(' ', '')}`} aria-label="Call">
          <ActionIcon type="call" />
          <span>Call</span>
        </a>
        <a href={`mailto:${profile.email}`} aria-label="Email">
          <ActionIcon type="email" />
          <span>Email</span>
        </a>
        <a
          href={`https://wa.me/${profile.whatsapp.replaceAll('+', '')}`}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
        >
          <ActionIcon type="chat" />
          <span>Chat</span>
        </a>
        <button className="save-contact" type="button" onClick={() => buildContactFile(profile)}>
          <ActionIcon type="save" />
          Save Contact
        </button>
      </div>

      <p className="card-about">{profile.about}</p>

      <nav className="profile-links" aria-label="Brand links">
        {enabledLinks.map((link) => (
          <a key={link.id} href={safeLink(link.url)} target="_blank" rel="noreferrer">
            <span>
              <strong>{link.label}</strong>
              <small>{link.subtitle}</small>
            </span>
            <b aria-hidden="true">+</b>
          </a>
        ))}
      </nav>

      <footer className="card-footer">
        <div className="socials">
          {Object.entries(profile.socials).map(([platform, url]) => (
            <a key={platform} href={safeLink(url)} target="_blank" rel="noreferrer">
              {platform}
            </a>
          ))}
        </div>
        <a className="website" href={safeLink(profile.website)} target="_blank" rel="noreferrer">
          {profile.website}
        </a>
      </footer>
    </article>
  )
}
