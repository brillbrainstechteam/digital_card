import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicCard, trackCardView } from '../services/api'
import { CardPreview } from './CardPreview'
import { defaultProfile, getVisibilityFlags } from '../data'
import { pageBackgroundVariables } from '../theme'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchPublicCard(slug)
      .then((card) => {
        const profile = profileFromCard(card)
        setProfile(profile)
        trackCardView(slug)
        const name = profile.brandName || profile.personName || profile.companyName
        if (name) document.title = `${name} · Digital Card`
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    return () => { document.title = 'Brill Brains Digital Card Studio' }
  }, [slug])

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
        <CardPreview profile={profile} immersive trackingSlug={slug} showCreateCta />
      </main>
    </div>
  )
}
