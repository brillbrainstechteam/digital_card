import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AppLayout() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
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

  const isBusinessCard = location.pathname.startsWith('/business-card')
  const productLabel = isBusinessCard ? 'Business Card' : 'Digital Card'
  const homePath = isBusinessCard ? '/business-cards' : '/dashboard'

  // The product pill only makes sense on each product's own top-level list
  // page — everywhere else (editors, analytics, settings, gallery, etc.)
  // it stays hidden.
  const isDashboard = location.pathname === '/dashboard'
  const isBusinessCardsList = location.pathname === '/business-cards'
  const showProductToggle = isAuthenticated && (isDashboard || isBusinessCardsList)

  return (
    <div className={`app-shell${isHomePage ? ' app-shell--home' : ''}`}>
      <header className={`topbar${isHomePage && !homeScrolled ? ' topbar--home-hidden' : ''}`}>
        <Link to={isAuthenticated ? homePath : '/'} className="product-mark">
          <img src="/logo.png" alt="BB" className="product-mark-icon" />
          <strong>{productLabel}</strong>
        </Link>

        <nav aria-label="Main navigation">
          {showProductToggle && (
            <div className="header-product-toggle">
              <Link to="/dashboard" className={`header-product-pill${isDashboard ? ' active' : ''}`}>
                Digital Card
              </Link>
              <Link to="/business-cards" className={`header-product-pill${isBusinessCardsList ? ' active' : ''}`}>
                Business Card
              </Link>
            </div>
          )}
        </nav>

        {isAuthenticated ? (
          <div className="topbar-user">
            {user?.name && <span className="topbar-greeting">Hi, {user.name.split(' ')[0]}</span>}
          </div>
        ) : isHomePage ? (
          <div className="topbar-guest-actions">
            <Link to="/login" className="topbar-ghost-link">Log in</Link>
            <Link to="/signup" className="topbar-action">Get started</Link>
          </div>
        ) : (
          <Link to="/login" className="topbar-action">Log in</Link>
        )}
      </header>
      <Outlet />
    </div>
  )
}
