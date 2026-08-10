import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CartDrawer } from './CartDrawer'

export function AppLayout() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  return (
    <div className={`app-shell${isHomePage ? ' app-shell--home' : ''}`}>
      <header className="topbar">
        <Link to="/" className="product-mark">
          <img src="/bb-logo.png" alt="BB" className="product-mark-icon" />
          <strong>Digital Card</strong>
        </Link>

        <nav aria-label="Main navigation">
          {isAuthenticated && (
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active topbar-nav-btn topbar-nav-btn--dashboard' : 'topbar-nav-btn topbar-nav-btn--dashboard')}>
              Dashboard
            </NavLink>
          )}
          <NavLink to="/create" className={({ isActive }) => (isActive ? 'active topbar-nav-btn' : 'topbar-nav-btn')}>
            Digital Cards
          </NavLink>
          <NavLink to="/qr-studio" className={({ isActive }) => (isActive ? 'active topbar-nav-btn' : 'topbar-nav-btn')}>
            QR Studio
          </NavLink>
        </nav>

        {isAuthenticated ? (
          <div className="topbar-user">
            {user?.name && <span className="topbar-greeting">Hi, {user.name.split(' ')[0]}</span>}
            <CartDrawer />
          </div>
        ) : (
          <Link to="/login" className="topbar-action">Log in</Link>
        )}
      </header>

      <Outlet />
    </div>
  )
}
