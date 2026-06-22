import { CardPreview } from './CardPreview'

export function Landing({ profile, onCreate, onPreview }) {
  return (
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
          <button className="primary-button" type="button" onClick={onCreate}>
            Open card studio
          </button>
          <button className="ghost-button" type="button" onClick={onPreview}>
            View sample card
          </button>
        </div>
        <div className="feature-row">
          <span>Auto brand palette</span>
          <span>Mobile first</span>
          <span>Contact ready</span>
        </div>
      </section>
      <div className="hero-preview">
        <CardPreview profile={profile} />
      </div>
    </main>
  )
}
