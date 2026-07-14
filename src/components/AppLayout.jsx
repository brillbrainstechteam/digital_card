import { useEffect } from 'react'
import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CartDrawer } from './CartDrawer'

export function AppLayout() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isHomePage = location.pathname === '/'

  function scrollToElement(element, sectionId) {
    const navHeight = document.querySelector('.topbar')?.offsetHeight ?? 76
    const elementTop = element.getBoundingClientRect().top + window.scrollY
    const top = sectionId === 'business-cards'
      ? elementTop + (element.offsetHeight / 2) - ((window.innerHeight + navHeight) / 2)
      : elementTop - navHeight
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  useEffect(() => {
    if (isHomePage && location.hash) {
      const sectionId = location.hash.slice(1)
      const frame = requestAnimationFrame(() => {
        const element = document.getElementById(sectionId)
        if (element) scrollToElement(element, sectionId)
      })
      return () => cancelAnimationFrame(frame)
    }
    return undefined
  }, [isHomePage, location.hash])

  function scrollToSection(sectionId) {
    if (!isHomePage) {
      navigate(`/#${sectionId}`)
      return
    }

    const element = document.getElementById(sectionId)
    if (!element) return
    scrollToElement(element, sectionId)
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
