import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from './PageHeader'
import { useCart, formatCartAmount, cartTotal } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { createOrder, verifyPayment } from '../api/paymentApi'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { items, clear } = useCart()
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)
  const total = cartTotal(items)

  // Pre-load Razorpay SDK as soon as the checkout page mounts
  useEffect(() => { loadRazorpayScript() }, [])

  async function handlePayment() {
    if (items.length === 0 || paying) return
    setPaying(true)

    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        toast.error('Could not load payment gateway. Check your internet connection and try again.')
        setPaying(false)
        return
      }

      const cardIds = [...new Set(items.map((i) => i.publishCardId).filter(Boolean))].map(Number)
      const qrIds   = [...new Set(items.map((i) => i.qrId).filter(Boolean))].map(Number)

      const order = await createOrder(cardIds, qrIds)

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Brill Brains Digital Card',
        description: items.map((i) => i.name).join(', '),
        image: '/bb-logo.png',
        order_id: order.orderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: { color: '#D4AF37' },
        modal: {
          ondismiss: () => {
            setPaying(false)
          },
        },
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              cardIds,
              qrIds,
            })
            setPaid(true)
            clear()
            toast.success('Payment successful! Your products are now live.')
          } catch (err) {
            toast.error(err.message || 'Payment verification failed. Contact support.')
            setPaying(false)
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response) => {
        toast.error(response.error?.description || 'Payment failed. Please try again.')
        setPaying(false)
      })
      rzp.open()
    } catch (err) {
      toast.error(err.message || 'Could not initiate payment.')
      setPaying(false)
    }
  }

  return (
    <main className="checkout-page">
      <section className="checkout-page-content">
        <PageHeader
          badge="CHECKOUT"
          title={paid ? 'Payment successful' : 'Complete your payment'}
          subtitle={paid ? 'Your products are live and ready to share.' : 'Secure payment via Razorpay.'}
        />

        {paid ? (
          <section className="editor-section checkout-success">
            <span className="checkout-success-mark">✓</span>
            <h2>Your products are published</h2>
            <p>Payment confirmed. All your digital cards and QR codes are now live.</p>
            <button className="primary-button" type="button" onClick={() => navigate('/dashboard')}>
              View your cards
            </button>
          </section>
        ) : (
          <div className="checkout-layout">
            <aside className="editor-section checkout-order">
              <h2>Order summary</h2>
              {items.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Your cart is empty.</p>
              ) : (
                <>
                  {items.map((item) => (
                    <div className="checkout-order-row" key={item.id}>
                      <span>{item.name}</span>
                      <strong>{formatCartAmount(item.amount)}</strong>
                    </div>
                  ))}
                  <div className="checkout-order-total">
                    <span>Total</span>
                    <strong>INR {total.toLocaleString('en-IN')}</strong>
                  </div>
                </>
              )}
            </aside>

            <div className="editor-section checkout-form checkout-razorpay-box">
              <h2>Pay securely</h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
                Credit card, debit card, UPI, net banking — all supported. Monthly auto-pay via UPI Autopay or card mandate.
              </p>
              <button
                className="primary-button checkout-pay-button"
                type="button"
                disabled={paying || items.length === 0}
                onClick={handlePayment}
              >
                {paying ? 'Opening payment…' : `Pay INR ${total.toLocaleString('en-IN')}`}
              </button>
              <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
                Powered by Razorpay · 100% secure
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
