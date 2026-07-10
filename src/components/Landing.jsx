import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { defaultProfile, CardPreview } from '../features/digital-card'
import HeroAnimation from './HeroAnimation'
import { QRStudioShowcase } from './QRStudioShowcase'

// Flip to false to switch the hero preview back to the static CardPreview sample card.
const USE_HERO_ANIMATION = true

function BusinessCardMockup() {
  return (
    <div
      style={{
        width: 340,
        maxWidth: '100%',
        aspectRatio: '1.75 / 1',
        borderRadius: 16,
        background: 'linear-gradient(135deg, var(--navy) 0%, #26425a 100%)',
        boxShadow: '0 24px 48px -18px rgba(15, 35, 55, 0.45)',
        padding: '26px 28px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#fff',
      }}
    >
      <div>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: 'rgba(255,255,255,0.16)',
            marginBottom: 18,
          }}
        />
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          Your Name
        </div>
        <div
          style={{
            fontSize: 12,
            opacity: 0.7,
            marginTop: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Job Title · Company
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.75, lineHeight: 1.6 }}>
          +91 XXXXX XXXXX
          <br />
          you@company.com
        </div>

        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 4,
            background: '#fff',
          }}
        />
      </div>
    </div>
  )
}

export function Landing() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  function handleCreate() {
    navigate(isAuthenticated ? '/dashboard' : '/login')
  }

  function handleCreateBusiness() {
    navigate(isAuthenticated ? '/business-card' : '/login')
  }

  return (
    <>
      <main className="landing-page">
        {/* Digital Card */}
        <section className="landing">
          <div className="hero-copy">
            <p className="eyebrow">Brill Brains Digital Cards</p>

            <h1>
              Your brand.
              <br />
              One living card.
            </h1>

            <p className="hero-description">
              Build a beautiful business profile with contact actions, social
              links and an automatically matched color theme from your own
              logo.
            </p>

            <div className="hero-buttons">
              <button
                className="primary-button"
                type="button"
                onClick={handleCreate}
              >
                Create your personalized card!
              </button>
            </div>

            <div className="feature-row">
              <span>Auto brand palette</span>
              <span>Mobile first</span>
              <span>Contact ready</span>
            </div>
          </div>

          <div className="hero-preview">
            {USE_HERO_ANIMATION ? (
              <HeroAnimation />
            ) : (
              <CardPreview profile={defaultProfile} />
            )}
          </div>
        </section>

        {/* Business Card */}
        <section className="landing">
          <div className="hero-copy">
            <p className="eyebrow">Brill Brains Business Cards</p>

            <h1>
              Design cards.
              <br />
              Print or share.
            </h1>

            <p className="hero-description">
              Turn your profile into a print-ready business card. Pick a
              template, customize every detail on a live canvas, and export or
              print in seconds.
            </p>

            <div className="hero-buttons">
              <button
                className="primary-button"
                type="button"
                onClick={handleCreateBusiness}
              >
                Create your business card!
              </button>
            </div>

            <div className="feature-row">
              <span>Print ready</span>
              <span>Custom templates</span>
              <span>QR built in</span>
            </div>
          </div>

          <div className="hero-preview">
            <BusinessCardMockup />
          </div>
        </section>
      </main>

      {/* Upstream QR Studio Section */}
      <QRStudioShowcase />
    </>
  )
}