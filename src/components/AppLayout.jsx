import { useEffect, useState } from 'react'
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AppLayout() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const [homeScrolled, setHomeScrolled] = useState(
    () => typeof window !== 'undefined' && window.scrollY > 12
  )

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

  return (
    <div className={`app-shell${isHomePage ? ' app-shell--home' : ''}`}>
      <header className={`topbar${isHomePage && !homeScrolled ? ' topbar--home-hidden' : ''}`}>
        <Link to="/" className="product-mark">
          <img src="/logo.png" alt="BB" className="product-mark-icon" />
          <strong>Digital Card</strong>
        </Link>

        <nav aria-label="Main navigation">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            Digital Cards
          </NavLink>

          <NavLink
            to="/business-cards"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            Business Cards
          </NavLink>

          <NavLink
            to="/qr-studio"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            QR Studio
          </NavLink>
        </nav>

        {isAuthenticated ? (
          <div className="topbar-user">
            {user?.name && (
              <span className="topbar-greeting">
                Hi, {user.name.split(' ')[0]}
              </span>
            )}
          </div>
        ) : (
          <Link to="/login" className="topbar-action">
            Log in
          </Link>
        )}
      </header>

      <Outlet />
    </div>
  )
}