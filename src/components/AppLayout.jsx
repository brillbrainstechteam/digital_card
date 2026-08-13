import { useEffect, useState } from 'react'
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CartDrawer } from './CartDrawer'

export function AppLayout() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const navLinkClass = ({ isActive }) => (isActive ? 'active topbar-nav-btn' : 'topbar-nav-btn')

  return (
    <div className={`app-shell${isHomePage ? ' app-shell--home' : ''}`}>
      <header className="topbar">
        <Link to="/" className="product-mark">
          <img src="/bb-logo.png" alt="BB" className="product-mark-icon" />
          <strong>Digital Card</strong>
        </Link>

        <nav aria-label="Main navigation" className="topbar-nav-desktop">
          {isAuthenticated && (
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active topbar-nav-btn topbar-nav-btn--dashboard' : 'topbar-nav-btn topbar-nav-btn--dashboard')}>
              Dashboard
            </NavLink>
          )}
          <NavLink to="/create" className={navLinkClass}>Digital Cards</NavLink>
          <NavLink to="/qr-studio" className={navLinkClass}>QR Studio</NavLink>
        </nav>

        <div className="topbar-right">
          {isAuthenticated ? (
            <div className="topbar-user">
              {user?.name && <span className="topbar-greeting">Hi, {user.name.split(' ')[0]}</span>}
              <CartDrawer />
            </div>
          ) : (
            <Link to="/login" className="topbar-action topbar-action--desktop">Log in</Link>
          )}

          <button
            type="button"
            className={`topbar-menu-toggle${menuOpen ? ' is-open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          <div className="topbar-mobile-backdrop" onClick={() => setMenuOpen(false)} />
          <nav className="topbar-mobile-menu" aria-label="Mobile navigation">
            {isAuthenticated && (
              <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
            )}
            <NavLink to="/create" className={navLinkClass}>Digital Cards</NavLink>
            <NavLink to="/qr-studio" className={navLinkClass}>QR Studio</NavLink>
            {isAuthenticated && <NavLink to="/settings" className={navLinkClass}>Settings</NavLink>}
            {!isAuthenticated && <Link to="/login" className="topbar-action">Log in</Link>}
          </nav>
        </>
      )}

      <Outlet />
    </div>
  )
}
