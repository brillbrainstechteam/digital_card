import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { updateCard } from '../features/digital-card/services/api'
import { activateQrPurchase } from '../features/qr/services/qrApi'

export function CheckoutPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { items, clear } = useCart()
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)
  const total = items.reduce((sum, item) => sum + Number(item.amount || 499), 0)

  async function handlePayment(event) {
    event.preventDefault()
    if (items.length === 0 || paying) return
    setPaying(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      const cardIds = [...new Set(items.map((item) => item.publishCardId).filter(Boolean))]
      const qrIds = [...new Set(items.map((item) => item.qrId).filter(Boolean))]
      await Promise.all([
        ...cardIds.map((id) => updateCard(id, { status: 'published' })),
        ...qrIds.map((id) => activateQrPurchase(id)),
      ])
      setPaid(true)
      clear()
      toast.success('Demo payment confirmed. Your products are now published.')
    } catch (error) {
      toast.error(error.message || 'Payment confirmation failed.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <main className="studio studio-workspace">
      <Sidebar mode="app" activeApp="cart" />
      <section className="editor-panel editor-panel--wide">
        <PageHeader
          badge="DEMO CHECKOUT"
          title={paid ? 'Payment confirmed' : 'Complete your test payment'}
          subtitle="This is a testing gateway. No real charge will be made."
        />

        {paid ? (
          <section className="editor-section checkout-success">
            <span className="checkout-success-mark">✓</span>
            <h2>Your products are published</h2>
            <p>The payment confirmation was successful and all associated card drafts are now live.</p>
            <button className="primary-button" type="button" onClick={() => navigate('/dashboard')}>View your cards</button>
          </section>
        ) : (
          <div className="checkout-layout">
            <form className="editor-section checkout-form" onSubmit={handlePayment}>
              <h2>Payment details</h2>
              <label className="field"><span>Cardholder name</span><input required autoComplete="cc-name" placeholder="Test User" /></label>
              <label className="field"><span>Card number</span><input required inputMode="numeric" autoComplete="cc-number" defaultValue="4242 4242 4242 4242" /></label>
              <div className="field-grid field-grid--two">
                <label className="field"><span>Expiry</span><input required autoComplete="cc-exp" defaultValue="12/30" /></label>
                <label className="field"><span>CVV</span><input required inputMode="numeric" autoComplete="cc-csc" defaultValue="123" /></label>
              </div>
              <button className="primary-button checkout-pay-button" type="submit" disabled={paying || items.length === 0}>
                {paying ? 'Confirming Payment...' : `Pay INR ${total.toLocaleString('en-IN')}`}
              </button>
            </form>

            <aside className="editor-section checkout-order">
              <h2>Order summary</h2>
              {items.map((item) => (
                <div className="checkout-order-row" key={item.id}>
                  <span>{item.name}</span>
                  <strong>INR {Number(item.amount || 499).toLocaleString('en-IN')}</strong>
                </div>
              ))}
              <div className="checkout-order-total"><span>Total</span><strong>INR {total.toLocaleString('en-IN')}</strong></div>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}
