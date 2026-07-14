import { useNavigate } from 'react-router-dom'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'
import { useCart } from '../context/CartContext'

function formatPrice(item) {
  return `INR ${Number(item.amount || 499).toLocaleString('en-IN')}`
}

function getParentCardName(item, items) {
  if (item.parentCardName) return item.parentCardName
  const cardId = String(item.id || '').split('-')[0]
  const digitalCard = items.find((entry) => entry.id === `${cardId}-digitalCard`)
  return digitalCard?.parentCardName || digitalCard?.name || null
}

function getItemDetails(item, items) {
  const parentName = getParentCardName(item, items)
  if (item.type === 'business-card') return {
    name: parentName ? `${parentName} - Business Card` : item.name,
    description: 'Personalized print-ready card created from this Digital Card',
    path: item.path,
    action: 'Edit Business Card',
  }
  if (item.type === 'card-qr') return {
    name: parentName ? `${parentName} - QR Code` : item.name,
    description: 'Branded QR code linked to this Digital Card',
    path: item.qrId ? `/qr-studio/codes?qrId=${item.qrId}` : item.path,
    action: 'View QR Code',
  }
  return { name: item.name, description: item.description, path: item.path, action: 'Edit Digital Card' }
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
                {items.map((item) => {
                  const details = getItemDetails(item, items)
                  return (
                  <article className="cart-page-item" key={item.id}>
                    <button className="cart-page-item-main" type="button" onClick={() => details.path && navigate(details.path)}>
                      <strong>{details.name}</strong>
                      <span>{details.description}</span>
                      <small>{details.action} &rarr;</small>
                    </button>
                    <span className="cart-page-price">{formatPrice(item)}</span>
                    <button className="text-button card-delete-btn" type="button" onClick={() => removeItem(item.id)}>
                      Remove
                    </button>
                  </article>
                  )
                })}
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
