import { useNavigate } from 'react-router-dom'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'
import { useCart } from '../context/CartContext'

function formatPrice(item) {
  return `INR ${Number(item.amount || 499).toLocaleString('en-IN')}`
}

export function CartPage() {
  const navigate = useNavigate()
  const { items, removeItem } = useCart()
  const total = items.reduce((sum, item) => sum + Number(item.amount || 499), 0)

  return (
    <main className="studio studio-workspace">
      <Sidebar mode="app" activeApp="cart" />
      <section className="editor-panel editor-panel--wide">
        <PageHeader
          badge="CART"
          title="Review your products"
          subtitle="Your products remain drafts until the demo payment is confirmed."
        />

        <section className="editor-section cart-page-panel">
          {items.length === 0 ? (
            <div className="dashboard-empty cart-page-empty">
              <h2>Your cart is empty</h2>
              <p>Add a Digital Card, Business Card, or QR code to continue.</p>
              <button className="primary-button" type="button" onClick={() => navigate('/dashboard')}>
                Browse your cards
              </button>
            </div>
          ) : (
            <>
              <div className="cart-page-list">
                {items.map((item) => (
                  <article className="cart-page-item" key={item.id}>
                    <button className="cart-page-item-main" type="button" onClick={() => item.path && navigate(item.path)}>
                      <strong>{item.name}</strong>
                      <span>{item.description}</span>
                    </button>
                    <span className="cart-page-price">{formatPrice(item)}</span>
                    <button className="text-button card-delete-btn" type="button" onClick={() => removeItem(item.id)}>
                      Remove
                    </button>
                  </article>
                ))}
              </div>
              <div className="cart-page-summary">
                <div><span>Total</span><strong>INR {total.toLocaleString('en-IN')}</strong></div>
                <button className="primary-button" type="button" onClick={() => navigate('/checkout')}>
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  )
}
