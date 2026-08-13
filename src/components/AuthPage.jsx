import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function AuthPage({ mode: initialMode = 'login' }) {
  const { login, signup } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({
    name: '',
    business_name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  const isLogin = mode === 'login'

  function passwordStrength(pwd) {
    if (!pwd) return { score: 0, label: '', color: '' }
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    const levels = [
      { label: 'Too short', color: '#ef4444' },
      { label: 'Weak', color: '#f97316' },
      { label: 'Fair', color: '#eab308' },
      { label: 'Good', color: '#22c55e' },
      { label: 'Strong', color: '#16a34a' },
    ]
    return { score, ...levels[score] }
  }
  const pwdStrength = isLogin ? null : passwordStrength(form.password)
  const PHONE_PATTERN = /^\+?[\d\s-]{7,15}$/
  const phoneValid = !form.phone || PHONE_PATTERN.test(form.phone.trim())

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!isLogin && !phoneValid) {
      setError('Enter a valid phone number')
      return
    }
    setSubmitting(true)
    try {
      if (isLogin) {
        await login(form.email, form.password)
        toast.success('Welcome back!')
      } else {
        await signup({
          name: form.name,
          business_name: form.business_name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
        })
        toast.success('Account created!')
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-view">
      <div className="auth-card">
        <Link to="/" className="auth-brand">
          <span className="product-mark" style={{ background: 'transparent', border: 0, padding: 0 }}>
            <span>BB</span>
            <strong>Digital Card</strong>
          </span>
        </Link>
        <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-subtitle">
          {isLogin
            ? 'Log in to manage your digital card.'
            : 'Sign up to start building your digital card.'}
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
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value.replace(/[^\d+\s-]/g, ''))}
                />
                {form.phone && !phoneValid && <span className="field-error">Enter a valid phone number</span>}
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
          {isLogin && (
            <button type="button" className="text-button auth-forgot-link" onClick={() => setShowForgot(true)}>
              Forgot password?
            </button>
          )}
          {!isLogin && form.password && (
            <div className="password-strength">
              <div className="password-strength-bars">
                {[1,2,3,4].map((n) => (
                  <span key={n} className="password-strength-bar" style={{ background: pwdStrength.score >= n ? pwdStrength.color : 'var(--line)' }} />
                ))}
              </div>
              <span className="password-strength-label" style={{ color: pwdStrength.color }}>{pwdStrength.label}</span>
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="primary-button auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <p className="auth-toggle">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            className="text-button"
            onClick={() => { setError(''); setMode(isLogin ? 'signup' : 'login') }}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>

      {showForgot && (
        <div className="confirm-overlay" onClick={() => setShowForgot(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Reset your password</h2>
            <p>
              Self-service reset isn't available yet. Email us at{' '}
              <strong>support@brillbrainsconsultants.com</strong> from your account's email address
              and we'll reset it for you.
            </p>
            <div className="confirm-actions">
              <button className="secondary-button" type="button" onClick={() => setShowForgot(false)}>Close</button>
              <a
                className="primary-button"
                href={`mailto:support@brillbrainsconsultants.com?subject=${encodeURIComponent('Password reset request')}&body=${encodeURIComponent(`Hi,\n\nI'd like to reset my password for the account registered to: ${form.email || '[your email]'}\n\nThanks!`)}`}
              >
                Email Support
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
