import { useState } from 'react'
import { submitContactMessage } from '../api/contact'
import { Footer } from './Footer'
import './contact-page.css'

const SUBJECTS = [
  'General question',
  'Billing / payment issue',
  'Refund request',
  'Technical problem',
  'Feature request',
  'Report abuse or a security issue',
  'Something else',
]

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('sending')
    setError('')
    try {
      await submitContactMessage(form)
      setStatus('sent')
      setForm({ name: '', email: '', subject: SUBJECTS[0], message: '' })
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Something went wrong. Please try again or email us directly.')
    }
  }

  return (
    <>
      <main className="contact-page">
        <div className="contact-page-inner">
          <div className="contact-intro">
            <p className="contact-eyebrow">Get in touch</p>
            <h1>We're here to help</h1>
            <p className="contact-lede">
              Questions about your card, a billing issue, a refund request, or something you found broken —
              tell us and a real person will get back to you.
            </p>

            <div className="contact-info-list">
              <div className="contact-info-item">
                <span className="contact-info-label">Email</span>
                <a href="mailto:support@brillbrainsconsultants.com">support@brillbrainsconsultants.com</a>
              </div>
              <div className="contact-info-item">
                <span className="contact-info-label">Response time</span>
                <span>Within 2 business days</span>
              </div>
              <div className="contact-info-item">
                <span className="contact-info-label">Billing questions</span>
                <span>
                  See your <a href="/settings">Settings</a> page for card &amp; QR renewal dates, or read our{' '}
                  <a href="/refund-policy">Refund &amp; Cancellation Policy</a>.
                </span>
              </div>
            </div>

            <div className="contact-links-row">
              <a href="https://brillbrainsconsultants.com" target="_blank" rel="noreferrer" className="secondary-button">
                Visit Brill Brains Consultants ↗
              </a>
            </div>
          </div>

          <div className="contact-form-card">
            {status === 'sent' ? (
              <div className="contact-success">
                <span className="contact-success-icon" aria-hidden="true">✓</span>
                <h2>Message sent</h2>
                <p>Thanks — we've received your message and will reply to <strong>{form.email || 'your email'}</strong> within 2 business days.</p>
                <button type="button" className="secondary-button" onClick={() => setStatus('idle')}>Send another message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <div className="contact-form-row">
                  <label className="contact-field">
                    <span>Your name</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Jane Doe"
                      required
                      maxLength={120}
                    />
                  </label>
                  <label className="contact-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="you@example.com"
                      required
                      maxLength={200}
                    />
                  </label>
                </div>

                <label className="contact-field">
                  <span>Subject</span>
                  <select value={form.subject} onChange={(e) => update('subject', e.target.value)} required>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>

                <label className="contact-field">
                  <span>Message</span>
                  <textarea
                    value={form.message}
                    onChange={(e) => update('message', e.target.value)}
                    placeholder="Tell us what's going on — the more detail, the faster we can help."
                    rows={6}
                    required
                    minLength={10}
                    maxLength={5000}
                  />
                </label>

                {status === 'error' && <p className="contact-error">{error}</p>}

                <button type="submit" className="primary-button contact-submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Send message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
