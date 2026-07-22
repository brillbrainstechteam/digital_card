import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './auth-modal.css'

// Modular by design: the publish flow only ever calls `onAuthenticated` once
// a session exists — it doesn't care whether that came from email/password
// or a future provider. Plugging in Google Login later means adding a
// button here that calls its own auth function and then `onAuthenticated`;
// nothing in StudioPage or the publish flow needs to change.
const SOCIAL_PROVIDERS = [
  { id: 'google', label: 'Continue with Google' },
]

export function AuthModal({ open, onClose, onAuthenticated, title, subtitle }) {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', business_name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const isLogin = mode === 'login'

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const me = isLogin
        ? await login(form.email, form.password)
        : await signup({
            name: form.name,
            business_name: form.business_name,
            email: form.email,
            phone: form.phone || undefined,
            password: form.password,
          })
      onAuthenticated?.(me)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="confirm-overlay auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Close">×</button>

        <h2>{title || (isLogin ? 'Log in to publish' : 'Create an account to publish')}</h2>
        <p className="auth-modal-subtitle">
          {subtitle || "Your card is saved — we just need an account to put it live. Nothing you've done will be lost."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <label className="field">
                <span>Full name</span>
                <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
              </label>
              <label className="field">
                <span>Business name</span>
                <input value={form.business_name} onChange={(e) => update('business_name', e.target.value)} required />
              </label>
              <label className="field">
                <span>Phone (optional)</span>
                <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
              </label>
            </>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} minLength={6} required />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="primary-button auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : isLogin ? 'Log in & publish' : 'Sign up & publish'}
          </button>
        </form>

        <div className="auth-modal-divider"><span>or</span></div>

        {SOCIAL_PROVIDERS.map((provider) => (
          <button key={provider.id} type="button" className="secondary-button auth-modal-social" disabled title="Coming soon">
            {provider.label}
          </button>
        ))}

        <p className="auth-toggle">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button type="button" className="text-button" onClick={() => { setError(''); setMode(isLogin ? 'signup' : 'login') }}>
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
