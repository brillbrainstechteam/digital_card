import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicCard, trackCardView } from '../services/api'
import { CardPreview } from './CardPreview'
import { defaultProfile, getVisibilityFlags } from '../data'
import { pageBackgroundVariables } from '../theme'
import { QRCode, buildDestinationValue } from '../../qr'

function profileFromCard(card) {
  const cd = card.card_data || {}
  const cardType = cd.cardType || 'professional'
  return {
    ...defaultProfile,
    ...getVisibilityFlags(cardType),
    ...cd,
    cardType,
    brandName: cd.brandName || card.title || defaultProfile.brandName,
    logo: cd.logo || card.logo_url || defaultProfile.logo,
    logoSettings: { ...defaultProfile.logoSettings, ...cd.logoSettings },
    coverSettings: { ...defaultProfile.coverSettings, ...cd.coverSettings },
    theme: { ...defaultProfile.theme, ...cd.theme },
    branding: { ...defaultProfile.branding, ...cd.branding },
    socials: Array.isArray(cd.socials) ? cd.socials : defaultProfile.socials,
  }
}

export function PublicCard() {
  const { slug } = useParams()
  const [profile, setProfile] = useState(null)
  const [qr, setQr] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchPublicCard(slug)
      .then((card) => {
        setProfile(profileFromCard(card))
        setQr(card.qr_settings ? { slug: card.qr_slug, settings: card.qr_settings } : null)
        trackCardView(slug)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  // vCard payloads are scanned directly with no network round-trip, so they
  // always encode the raw contact data. Every other destination type routes
  // through the tracking redirect once a slug exists, so scans show up in
  // QR analytics before continuing on to the card / phone / maps / etc.
  const qrDisplaySettings = useMemo(() => {
    if (!qr?.settings) return null
    const rawData = buildDestinationValue(qr.settings.destinationType, qr.settings.destinationFields)
    const data = qr.settings.destinationType === 'saveContact' || !qr.slug
      ? rawData
      : `${window.location.origin}/q/${qr.slug}`
    return { ...qr.settings, data }
  }, [qr])

  if (loading) {
    return (
      <main className="public-view public-view--center">
        <div className="skeleton-card">
          <div className="skeleton-band shimmer" />
          <div className="skeleton-circle shimmer" />
          <div className="skeleton-line skeleton-line--title shimmer" />
          <div className="skeleton-line shimmer" />
          <div className="skeleton-line shimmer" />
          <div className="skeleton-actions">
            <div className="skeleton-btn shimmer" />
            <div className="skeleton-btn shimmer" />
            <div className="skeleton-btn shimmer" />
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    const is404 = error.toLowerCase().includes('not found')
    return (
      <main className="public-view public-view--center">
        <div className="public-error-card">
          <h1>{is404 ? '404' : 'Oops'}</h1>
          <p>{is404 ? "This card doesn't exist or isn't published yet." : error}</p>
        </div>
      </main>
    )
  }

  return (
    <div style={pageBackgroundVariables(profile.palette, profile.theme)}>
      <main className="public-view">
        <CardPreview profile={profile} immersive trackingSlug={slug} />
        {qrDisplaySettings && (
          <div className="public-view-qr-badge" aria-label="Scan QR code">
            <QRCode settings={qrDisplaySettings} size={180} lockable />
          </div>
        )}
      </main>
    </div>
  )
}
