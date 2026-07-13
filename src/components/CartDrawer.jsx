import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
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

const ALL_PRODUCTS = [
  {
    type: 'digital-card',
    label: 'Digital Card',
    description: 'A live, shareable profile page with your brand.',
    cta: 'Create one',
    path: '/create',
  },
  {
    type: 'business-card',
    label: 'Business Card',
    description: 'Print-ready card auto-curated from your brand.',
    cta: 'Coming soon',
    disabled: true,
  },
  {
    type: 'qr',
    label: 'Branded QR Code',
    description: 'Custom QR with your colors and logo.',
    cta: 'Create one',
    path: '/qr-studio',
  },
]

function getItemPath(item) {
  if (item.path) return item.path

  const digitalCardMatch = String(item.id).match(/^(.*)-digitalCard$/)
  if (digitalCardMatch) return `/studio/${digitalCardMatch[1]}`

  const cardQrMatch = String(item.id).match(/^(.*)-qr$/)
  if (cardQrMatch && item.type !== 'qr') {
    return `/studio/${cardQrMatch[1]}?from=qr-studio`
  }

  if (item.type === 'qr' || String(item.id).startsWith('qr-')) {
    return '/qr-studio/codes'
  }

  return null
}

export function CartDrawer() {
  const { items, removeItem } = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const total = items.length ? '₹X' : '₹0'

  // Products not yet in cart
  const cartTypes = new Set(items.map((i) => i.type).filter(Boolean))
  const recommendations = ALL_PRODUCTS.filter((p) => !cartTypes.has(p.type))

  return (
    <>
      <button
        type="button"
        className="cart-trigger"
        onClick={() => setOpen(true)}
        aria-label={`Open cart (${items.length} item${items.length === 1 ? '' : 's'})`}
      >
        <CartIcon />
        {items.length > 0 && <span className="cart-trigger-badge">{items.length}</span>}
      </button>

      {open && createPortal(
        <div className="cart-drawer-overlay" onClick={() => setOpen(false)}>
          <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <h2>Your Cart</h2>
              <button type="button" className="cart-drawer-close" onClick={() => setOpen(false)} aria-label="Close cart">×</button>
            </div>

            {items.length === 0 ? (
              <div className="cart-drawer-empty">
                <p>Your cart is empty.</p>
                <span>Publish a digital card or QR code to add items here.</span>
              </div>
            ) : (
              <>
                <ul className="cart-drawer-list">
                  {items.map((item) => (
                    <li key={item.id} className="cart-drawer-item">
                      <button
                        type="button"
                        className="cart-drawer-item-info cart-drawer-item-link"
                        disabled={!getItemPath(item)}
                        onClick={() => {
                          const path = getItemPath(item)
                          if (!path) return
                          setOpen(false)
                          navigate(path)
                        }}
                        aria-label={getItemPath(item) ? `Open ${item.name}` : undefined}
                      >
                        <span className="cart-drawer-item-name">{item.name}</span>
                        <span className="cart-drawer-item-desc">{item.description}</span>
                      </button>
                      <div className="cart-drawer-item-side">
                        <span className="cart-drawer-item-price">{item.price}</span>
                        <button
                          type="button"
                          className="cart-drawer-item-remove"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="cart-drawer-total-row">
                  <span>Total</span>
                  <span className="cart-drawer-total-amount">{total}</span>
                </div>
                <button
                  type="button"
                  className="primary-button cart-drawer-checkout"
                  onClick={() => toast.info('Checkout is coming soon — payment gateway integration in progress.')}
                >
                  Checkout
                </button>
              </>
            )}

            {recommendations.length > 0 && (
              <div className="cart-recommendations">
                <p className="cart-recommendations-title">Complete your brand kit</p>
                {recommendations.map((rec) => (
                  <div key={rec.type} className="cart-rec-item">
                    <div className="cart-rec-info">
                      <span className="cart-rec-name">{rec.label}</span>
                      <span className="cart-rec-desc">{rec.description}</span>
                    </div>
                    <button
                      type="button"
                      className="cart-rec-btn"
                      disabled={rec.disabled}
                      onClick={() => {
                        if (rec.path) { setOpen(false); navigate(rec.path) }
                      }}
                    >
                      {rec.cta}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>,
        document.body,
      )}
    </>
  )
}
