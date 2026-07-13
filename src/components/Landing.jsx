import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { defaultProfile, CardPreview } from '../features/digital-card'
import HeroAnimation from './HeroAnimation'
import { BusinessCardShowcase } from './BusinessCardShowcase'
import { QRStudioShowcase } from './QRStudioShowcase'
import { Footer } from './Footer'

const USE_HERO_ANIMATION = true

export function Landing() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  function handleCreate() {
    navigate(isAuthenticated ? '/dashboard' : '/create')
  }

  return (
    <>
      <main className="landing" id="digital-cards">
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

      {/* Trusted-by / stats ribbon */}
      <section className="stats-ribbon">
        <div className="stats-ribbon-inner">
          <div className="stat-item">
            <strong>500+</strong>
            <span>Cards Created</span>
          </div>
          <div className="stat-item">
            <strong>50+</strong>
            <span>Businesses Trust Us</span>
          </div>
          <div className="stat-item">
            <strong>3</strong>
            <span>Products in One</span>
          </div>
          <div className="stat-item">
            <strong>100%</strong>
            <span>Customizable</span>
          </div>
        </div>
      </section>

      <div id="business-cards"><BusinessCardShowcase /></div>
      <div id="qr-studio"><QRStudioShowcase /></div>

      {/* How it works */}
      <section className="how-it-works">
        <p className="eyebrow" style={{ textAlign: 'center' }}>How It Works</p>
        <h2 className="hiw-title">Three steps to your brand identity</h2>
        <div className="hiw-steps">
          <div className="hiw-step">
            <div className="hiw-step-num">1</div>
            <h3>Upload your logo</h3>
            <p>We extract your brand colors automatically and build your palette.</p>
          </div>
          <div className="hiw-step">
            <div className="hiw-step-num">2</div>
            <h3>Customize everything</h3>
            <p>Fine-tune your digital card, business card, and QR code to perfection.</p>
          </div>
          <div className="hiw-step">
            <div className="hiw-step-num">3</div>
            <h3>Publish &amp; share</h3>
            <p>Get a live link, print-ready cards, and branded QR codes instantly.</p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
