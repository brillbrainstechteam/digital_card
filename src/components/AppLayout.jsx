import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CartDrawer } from './CartDrawer'

export function AppLayout() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isHomePage = location.pathname === '/'
  const [homeScrolled, setHomeScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 12)

  useEffect(() => {
    if (!isHomePage) {
      setHomeScrolled(true)
      return undefined
    }

    function handleScroll() {
      setHomeScrolled(window.scrollY > 12)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isHomePage])

  // Handle hash scroll after navigation to homepage
  useEffect(() => {
    if (isHomePage && location.hash) {
      const el = document.querySelector(location.hash)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isHomePage, location.hash])

  function scrollToSection(sectionId) {
    if (isHomePage) {
      const el = document.getElementById(sectionId)
      if (!el) return
      const navH = document.querySelector('.topbar')?.offsetHeight ?? 76
      const top = el.getBoundingClientRect().top + window.scrollY - navH
      window.scrollTo({ top, behavior: 'smooth' })
    } else {
      navigate(`/#${sectionId}`)
    }
  }

  return (
    <div className={`app-shell${isHomePage ? ' app-shell--home' : ''}`}>
      <header className="topbar">
        <Link to="/" className="product-mark">
          <img src="/logo.png" alt="BB" className="product-mark-icon" />
          <strong>Digital Card</strong>
        </Link>
        <nav aria-label="Main navigation">
          <button type="button" className="topbar-nav-btn" onClick={() => scrollToSection('digital-cards')}>
            Digital Cards
          </button>
          <button type="button" className="topbar-nav-comingsoon" onClick={() => scrollToSection('business-cards')}>
            Business Cards
          </button>
          <button type="button" className="topbar-nav-btn" onClick={() => scrollToSection('qr-studio')}>
            QR Studio
          </button>
        </nav>
        {isAuthenticated ? (
          <div className="topbar-user">
            <CartDrawer />
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
