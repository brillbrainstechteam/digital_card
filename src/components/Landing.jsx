import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { defaultProfile, CardPreview } from '../features/digital-card'
import HeroAnimation from './HeroAnimation'
import { QRStudioShowcase } from './QRStudioShowcase'
import { Footer } from './Footer'
import './landing.css'

const USE_HERO_ANIMATION = true

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Adds `.is-visible` the first time an element scrolls into view, which is
 * what the `.reveal` / `.reveal-stagger` styles key off. One observer for the
 * whole page rather than one per element.
 */
function useScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll('.lp .reveal, .lp .reveal-stagger, .lp .hiw-step')
    // Cutting motion as well as revealing matters: a transition also needs
    // frames, so in a context that never paints, `is-visible` alone would
    // still leave everything sitting at opacity 0.
    const revealAll = () => {
      document.querySelector('.lp')?.classList.add('lp-motion-off')
      targets.forEach((el) => el.classList.add('is-visible'))
    }

    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      revealAll()
      return undefined
    }

    let observerWorks = false
    const observer = new IntersectionObserver(
      (entries) => {
        observerWorks = true
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target) // reveal once, never re-hide
        })
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
    )

    targets.forEach((el) => observer.observe(el))

    // Safety net. These elements start at opacity:0, so if the observer never
    // runs — prerendering, some embedded webviews, a non-compositing frame —
    // the whole page below the hero would stay permanently blank. If nothing
    // has been reported by now, assume it is broken and just show everything.
    const failsafe = setTimeout(() => {
      if (!observerWorks) {
        revealAll()
        observer.disconnect()
      }
    }, 1600)

    return () => {
      clearTimeout(failsafe)
      observer.disconnect()
    }
  }, [])
}

const STATS = [
  { value: 500, suffix: '+', label: 'Cards Created' },
  { value: 50, suffix: '+', label: 'Businesses Trust Us' },
  { value: 2, suffix: '', label: 'Products in One' },
  { value: 100, suffix: '%', label: 'Customizable' },
]

/** Counts up once the ribbon is on screen. Static number if motion is reduced. */
function StatCounter({ value, suffix }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0))
  const ref = useRef(null)
  const done = useRef(prefersReducedMotion())

  useEffect(() => {
    const node = ref.current
    if (!node || done.current) return undefined
    if (!('IntersectionObserver' in window)) { setShown(value); return undefined }

    const run = () => {
      if (done.current) return
      done.current = true
      const duration = 1400
      const start = performance.now()
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration)
        // easeOutExpo — fast start, long settle, so the number lands softly
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
        setShown(Math.round(value * eased))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return
      observer.disconnect()
      run()
    }, { threshold: 0.5 })
    observer.observe(node)

    // Same failsafe as the reveals: never leave a permanent 0 on screen.
    const failsafe = setTimeout(() => { if (!done.current) { observer.disconnect(); setShown(value) } }, 2200)

    return () => { clearTimeout(failsafe); observer.disconnect() }
  }, [value])

  return <strong ref={ref}>{shown}{suffix}</strong>
}

export function Landing() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  useScrollReveal()

  function handleCreate() {
    navigate(isAuthenticated ? '/dashboard' : '/create')
  }

  return (
    <div className="lp">
      {/* Decorative atmosphere layer — gilt aurora, hairline grid, grain */}
      <div className="lp-canvas" aria-hidden="true">
        <span className="lp-aurora lp-aurora--gold" />
        <span className="lp-aurora lp-aurora--blue" />
        <span className="lp-grid" />
        <span className="lp-grain" />
      </div>

      <main className="landing-page">
        <section className="landing" id="digital-cards">
          <div className="hero-copy lp-enter">
            <p className="eyebrow">Brill Brains Digital Cards</p>
            <h1>
              Your brand.
              <br />
              One <span className="lp-gilt">living</span> card.
            </h1>
            <p className="hero-description">
              Build a beautiful business profile with contact actions, social links and a
              colour theme matched automatically from your own logo.
            </p>
            <div className="hero-buttons">
              <button className="primary-button" type="button" onClick={handleCreate}>
                Create your personalized card
              </button>
            </div>
            <div className="feature-row">
              <span>Auto brand palette</span>
              <span>Mobile first</span>
              <span>Contact ready</span>
            </div>
          </div>

          <div className="hero-preview">
            {USE_HERO_ANIMATION ? <HeroAnimation /> : <CardPreview profile={defaultProfile} />}
          </div>
        </section>
      </main>

      <section className="stats-ribbon reveal">
        <div className="stats-ribbon-inner">
          {STATS.map((stat) => (
            <div className="stat-item" key={stat.label}>
              <StatCounter value={stat.value} suffix={stat.suffix} />
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div id="qr-studio" className="reveal"><QRStudioShowcase /></div>

      <section className="how-it-works">
        <div className="reveal">
          <p className="eyebrow" style={{ justifyContent: 'center' }}>How It Works</p>
          <h2 className="hiw-title">Three steps to your brand identity</h2>
        </div>
        <div className="hiw-steps">
          <div className="hiw-step">
            <span className="hiw-step-num">Step 01</span>
            <h3>Upload your logo</h3>
            <p>We extract your brand colours automatically and build your palette.</p>
          </div>
          <div className="hiw-step">
            <span className="hiw-step-num">Step 02</span>
            <h3>Customize everything</h3>
            <p>Fine-tune your digital card and QR code to perfection.</p>
          </div>
          <div className="hiw-step">
            <span className="hiw-step-num">Step 03</span>
            <h3>Publish &amp; share</h3>
            <p>Get a live link, print-ready cards, and branded QR codes instantly.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
