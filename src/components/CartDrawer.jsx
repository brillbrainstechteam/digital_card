import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import './cart-drawer.css'

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

export function CartDrawer() {
  const { items } = useCart()
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className="cart-trigger"
      onClick={() => navigate('/cart')}
      aria-label={`Open cart (${items.length} item${items.length === 1 ? '' : 's'})`}
    >
      <CartIcon />
      {items.length > 0 && <span className="cart-trigger-badge">{items.length}</span>}
    </button>
  )
}
