import { useNavigate } from 'react-router-dom'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'
import { useCart, formatCartAmount, cartTotal } from '../context/CartContext'

function getParentCardName(item, items) {
  if (item.parentCardName) return item.parentCardName
  // Cart ids are `<cardId>-<suffix>` and cardId is a UUID (which itself
  // contains hyphens), so the id has to be split on the LAST hyphen — a
  // plain split('-')[0] yielded just the UUID's first block and never
  // matched anything, silently killing this lookup.
  const rawId = String(item.id || '')
  const cardId = rawId.slice(0, rawId.lastIndexOf('-'))
  if (!cardId) return null
  const digitalCard = items.find((entry) => entry.id === `${cardId}-digitalCard`)
  return digitalCard?.parentCardName || digitalCard?.name || null
}

function getItemDetails(item, items) {
  const parentName = getParentCardName(item, items)
  if (item.type === 'card-qr' || item.type === 'qr') return {
    name: parentName ? `${parentName} - QR Code` : item.name,
    description: item.description || 'Branded QR code linked to your Digital Card',
    path: item.qrId ? `/qr-studio/codes?qrId=${item.qrId}` : item.path,
    action: 'View QR Code',
  }
  return { name: item.name, description: item.description, path: item.path, action: 'Edit Digital Card' }
}

export function CartPage() {
  const navigate = useNavigate()
  const { items, removeItem } = useCart()
  const total = cartTotal(items)

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
              <p>Add a Digital Card or QR code to continue.</p>
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
                    <span className="cart-page-price">{formatCartAmount(item.amount)}</span>
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
