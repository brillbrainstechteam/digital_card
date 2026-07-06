import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AppLayout() {
  const { isAuthenticated, user } = useAuth()
  const { pathname } = useLocation()

  const isBusinessCard = pathname.startsWith('/business-card')
  const productLabel = isBusinessCard ? 'Business Card' : 'Digital Card'
  const homePath = isBusinessCard ? '/business-cards' : '/dashboard'
  const switchTo = isBusinessCard
    ? { label: 'Digital Card', path: '/dashboard' }
    : { label: 'Business Card', path: '/business-cards' }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to={isAuthenticated ? homePath : '/'} className="product-mark">
          <img src="/logo.png" alt="BB" className="product-mark-icon" />
          <strong>{productLabel}</strong>
        </Link>
        <nav aria-label="Main navigation">
          {isAuthenticated && (
            <Link to={switchTo.path}>
              Switch to {switchTo.label} ↗
            </Link>
          )}
        </nav>
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
