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
  const switchTo = isBusinessCard
    ? { label: 'Digital Card', path: '/dashboard' }
    : { label: 'Business Card', path: '/business-cards' }

  return (
    <div className={`app-shell${isHomePage ? ' app-shell--home' : ''}`}>
      <header className={`topbar${isHomePage && !homeScrolled ? ' topbar--home-hidden' : ''}`}>
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
