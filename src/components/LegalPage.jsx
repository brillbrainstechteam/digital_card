import { Link } from 'react-router-dom'
import { Footer } from './Footer'
import './legal-page.css'

// Shared shell for every legal/policy page — consistent header, effective
// date, a jump-to-section nav generated from the same headings that render
// in the body, and the site footer. Individual pages just supply `sections`.
export function LegalPage({ title, updated, intro, sections }) {
  return (
    <>
      <main className="legal-page">
        <div className="legal-page-inner">
          <aside className="legal-toc">
            <Link to="/" className="legal-back">&larr; Back to home</Link>
            <span className="legal-toc-label">On this page</span>
            <nav aria-label="Sections">
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`}>{s.heading}</a>
              ))}
            </nav>
          </aside>

          <article className="legal-content">
            <header className="legal-header">
              <h1>{title}</h1>
              <p className="legal-updated">Last updated: {updated}</p>
              {intro && <p className="legal-intro">{intro}</p>}
            </header>

            {sections.map((s) => (
              <section key={s.id} id={s.id} className="legal-section">
                <h2>{s.heading}</h2>
                {s.body}
              </section>
            ))}

            <div className="legal-contact-card">
              <strong>Still have questions?</strong>
              <p>
                Reach us at{' '}
                <a href="mailto:support@brillbrainsconsultants.com">support@brillbrainsconsultants.com</a>
                {' '}and we'll get back to you within 2 business days.
              </p>
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
