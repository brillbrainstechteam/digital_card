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

  const isLogin = mode === 'login'

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
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
    </main>
  )
}
