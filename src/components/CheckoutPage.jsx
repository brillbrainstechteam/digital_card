import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from './PageHeader'
import { useCart, formatCartAmount, cartTotal } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { fetchCard, updateCard } from '../features/digital-card/services/api'
import { activateQrPurchase } from '../features/qr/services/qrApi'
import { downloadCardPdf } from '../features/business-card/canvasHelpers'

// Marks a purchased Business Card as owned. This is the single source of
// truth the Business Cards list reads to lock editing and show the "Owned"
// state — deliberately separate from the row-level `status: 'published'`
// below, which Digital Cards also use to mean "live", not "paid for".
// card_data is a JSON blob and updateCard PUTs shallowly, so the existing
// contents must be read first and merged rather than overwritten.
async function markBusinessCardPurchased(id) {
  const card = await fetchCard(id)
  const existing = card.card_data || {}
  if (!existing.businessCard) return null // not a Business Card — nothing to flag
  await updateCard(id, {
    card_data: {
      ...existing,
      businessCard: {
        ...existing.businessCard,
        purchased: true,
        purchasedAt: new Date().toISOString(),
      },
    },
  })
  // Handed back so the caller can immediately export it — downloading is
  // gated on purchase, and this is the moment that gate opens.
  return { businessCard: existing.businessCard, title: card.title }
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { items, clear } = useCart()
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)
  const total = cartTotal(items)

  async function handlePayment(event) {
    event.preventDefault()
    if (items.length === 0 || paying) return
    setPaying(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      const cardIds = [...new Set(items.map((item) => item.publishCardId).filter(Boolean))]
      const qrIds = [...new Set(items.map((item) => item.qrId).filter(Boolean))]
      const businessCardIds = [...new Set(
        items.filter((item) => item.type === 'business-card').map((item) => item.publishCardId).filter(Boolean),
      )]
      await Promise.all([
        ...cardIds.map((id) => updateCard(id, { status: 'published' })),
        ...qrIds.map((id) => activateQrPurchase(id)),
      ])
      // Sequenced after the status writes rather than run alongside them:
      // this reads card_data back before merging into it, so racing it with
      // another write to the same row risks reading a stale blob.
      const purchased = await Promise.all(businessCardIds.map((id) => markBusinessCardPurchased(id)))
      setPaid(true)
      clear()
      toast.success('Demo payment confirmed. Your products are now published.')

      // Auto-deliver each purchased card as a PDF. Done after the success
      // state is committed and outside the try's failure path — a browser
      // blocking the download must not read as a failed payment.
      for (const entry of purchased) {
        if (!entry?.businessCard) continue
        try {
          await downloadCardPdf(entry.businessCard, entry.title || 'business-card')
        } catch {
          toast.info('Your card is ready — open it from Business Cards to download.')
        }
      }
    } catch (error) {
      toast.error(error.message || 'Payment confirmation failed.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <main className="checkout-page">
      <section className="checkout-page-content">
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
                  <strong>{formatCartAmount(item.amount)}</strong>
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
