import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchPublicCard } from '../api'
import { CardPreview } from './CardPreview'
import { useAuth } from '../context/AuthContext'
import { defaultProfile } from '../data'

function profileFromCard(card) {
  const cd = card.card_data || {}
  return {
    ...defaultProfile,
    ...cd,
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
  const { isAuthenticated } = useAuth()
  const [profile, setProfile] = useState(null)
  const [cardId, setCardId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchPublicCard(slug)
      .then((card) => {
        setCardId(card.id)
        setProfile(profileFromCard(card))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
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
    <div style={{ '--public-background': profile.theme?.pageBackground || profile.palette.surface }}>
      {isAuthenticated && (
        <div className="public-card-topbar">
          <Link to="/" className="product-mark">
            <img src="/logo.png" alt="BB" className="product-mark-icon" />
            <strong>Digital Card</strong>
          </Link>
          <div className="public-card-topbar-actions">
            <Link to="/dashboard" className="secondary-button">Dashboard</Link>
            <Link to={`/studio/${cardId}`} className="secondary-button">Edit this card</Link>
          </div>
        </div>
      )}
      <main className="public-view">
        <CardPreview profile={profile} immersive />
      </main>
    </div>
  )
}
