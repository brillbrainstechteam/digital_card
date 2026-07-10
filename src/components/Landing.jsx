import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { defaultProfile, CardPreview } from '../features/digital-card'
import HeroAnimation from './HeroAnimation'
import { QRStudioShowcase } from './QRStudioShowcase'

// Flip to false to switch the hero preview back to the static CardPreview sample card.
const USE_HERO_ANIMATION = true

export function Landing() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  function handleCreate() {
    navigate(isAuthenticated ? '/dashboard' : '/login')
  }

  return (
    <>
      <main className="landing">
        <section className="hero-copy">
          <p className="eyebrow">Brill Brains Digital Cards</p>
          <h1>
            Your brand.
            <br />
            One living card.
          </h1>
          <p className="hero-description">
            Build a beautiful business profile with contact actions, social links and an
            automatically matched color theme from your own logo.
          </p>
          <div className="hero-buttons">
            <button className="primary-button" type="button" onClick={handleCreate}>
              Create your personalized card!
            </button>
          </div>
          <div className="feature-row">
            <span>Auto brand palette</span>
            <span>Mobile first</span>
            <span>Contact ready</span>
          </div>
        </section>
        <div className="hero-preview">
          {USE_HERO_ANIMATION ? <HeroAnimation /> : <CardPreview profile={defaultProfile} />}
        </div>
      </main>
      <QRStudioShowcase />
    </>
  )
}
