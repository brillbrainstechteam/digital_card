import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AppLayout() {
  const { isAuthenticated, user } = useAuth()

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="product-mark">
          <img src="/logo.png" alt="BB" className="product-mark-icon" />
          <strong>Digital Card</strong>
        </Link>
        <nav aria-label="Main navigation" />
        {isAuthenticated ? (
          <div className="topbar-user">
            {user?.name && <span className="topbar-greeting">Hi, {user.name.split(' ')[0]}</span>}
          </div>
        ) : (
          <Link to="/login" className="topbar-action">Log in</Link>
        )}
      </header>
      <Outlet />
    </div>
  )
}
