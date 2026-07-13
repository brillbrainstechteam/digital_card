import { useEffect } from 'react'
import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CartDrawer } from './CartDrawer'

export function AppLayout() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isHomePage = location.pathname === '/'
  useEffect(() => {
    if (isHomePage && location.hash) {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isHomePage, location.hash])

  function scrollToSection(sectionId) {
    if (!isHomePage) {
      navigate(`/#${sectionId}`)
      return
    }

    const element = document.getElementById(sectionId)
    if (!element) return
    const navHeight = document.querySelector('.topbar')?.offsetHeight ?? 76
    const top = element.getBoundingClientRect().top + window.scrollY - navHeight
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div className={`app-shell${isHomePage ? ' app-shell--home' : ''}`}>
      <header className="topbar">
        <Link to="/" className="product-mark">
          <img src="/logo.png" alt="BB" className="product-mark-icon" />
          <strong>Digital Card</strong>
        </Link>

        <nav aria-label="Main navigation">
          {isHomePage ? (
            <>
              <button type="button" className="topbar-nav-btn" onClick={() => scrollToSection('digital-cards')}>
                Digital Cards
              </button>
              <button type="button" className="topbar-nav-btn" onClick={() => scrollToSection('business-cards')}>
                Business Cards
              </button>
              <button type="button" className="topbar-nav-btn" onClick={() => scrollToSection('qr-studio')}>
                QR Studio
              </button>
            </>
          ) : (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                Digital Cards
              </NavLink>
              <NavLink to="/business-cards" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                Business Cards
              </NavLink>
              <NavLink to="/qr-studio" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                QR Studio
              </NavLink>
            </>
          )}
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
