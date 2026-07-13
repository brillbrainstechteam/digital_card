import { useNavigate } from 'react-router-dom'

export function BusinessCardShowcase() {
  const navigate = useNavigate()
  return (
    <section className="biz-showcase">
      <div className="biz-flip-wrap">
        <div className="biz-flip-card">
          {/* Front */}
          <div className="biz-flip-face biz-flip-front">
            <div className="biz-card-top-band" />
            <div className="biz-card-logo">BB</div>
            <div className="biz-card-front-body">
              <span className="biz-card-company">Brill Brains</span>
              <span className="biz-card-tagline">Your brand. One living card.</span>
            </div>
            <div className="biz-card-front-footer">
              <span className="biz-card-hint">Hover to flip</span>
            </div>
          </div>

          {/* Back */}
          <div className="biz-flip-face biz-flip-back">
            <div className="biz-card-back-accent" />
            <div className="biz-card-back-body">
              <strong className="biz-card-name">Alex Morgan</strong>
              <span className="biz-card-role">Creative Director</span>
              <div className="biz-card-divider" />
              <div className="biz-card-contacts">
                <span>alex@brillbrains.com</span>
                <span>+91 98765 43210</span>
                <span>brillbrainsconsultants.com</span>
              </div>
            </div>
            <div className="biz-card-back-logo">BB</div>
          </div>
        </div>
        <p className="biz-flip-label">Hover the card to see the back</p>
      </div>

      <div className="biz-showcase-copy">
        <p className="eyebrow">Business Cards</p>
        <h2>
          Professional cards,
          <br />
          auto-curated.
        </h2>
        <p className="qr-showcase-description">
          Get a beautifully designed business card that matches your digital card's brand —
          front and back, ready to print or share digitally.
        </p>
        <div className="hero-buttons">
          <button
            className="primary-button"
            type="button"
            onClick={() => navigate('/business-cards')}
          >
            Create Business Card
          </button>
        </div>
        <div className="feature-row">
          <span>Auto brand match</span>
          <span>Print ready</span>
          <span>Front &amp; Back</span>
        </div>
      </div>
    </section>
  )
}
