import { useMemo, useState } from 'react'
import { SampleBusinessCard } from './SampleBusinessCard'
import { QrStep } from './QrStep'
import { CartStep } from './CartStep'
import { createTempPreviewLink } from '../../utils/previewLink'
import { saveCardQr } from '../../../qr'
import { useToast } from '../../../../context/ToastContext'
import { useCart } from '../../../../context/CartContext'
import './publish-flow.css'

const STEP_LABELS = ['Business Card', 'QR Code', 'Cart']

// The end-to-end "sellable" flow that opens the moment a Digital Card is
// published: curated sample business card -> QR code (pointed at a
// temporary preview link, never the real slug) -> cart with a placeholder
// total. Nothing here talks to a payment gateway yet — Checkout is a stub
// the business can wire up once that's ready.
//
// Nothing is added to the shared cart until the user has been through every
// step — the business card choice and the QR settings are only held as
// local state along the way. All of it (digital card + QR + business card,
// if chosen) lands in CartContext together the moment the flow reaches the
// Cart step, not the instant the modal opens.
export function PublishFlowModal({ open, onClose, profile, cardId, existingQr, onQrSaved }) {
  const toast = useToast()
  const { items: cartItems, addItem, removeItem } = useCart()
  const [stepIndex, setStepIndex] = useState(0)
  const [wantsBusinessCard, setWantsBusinessCard] = useState(true)
  const [savedQrSettings, setSavedQrSettings] = useState(existingQr?.settings ?? null)
  const [savingQr, setSavingQr] = useState(false)

  const previewUrl = useMemo(() => (open ? createTempPreviewLink(profile) : null), [open, profile])
  const cardLabel = profile.companyName || profile.brandName || 'Digital Card'

  if (!open) return null

  function goTo(index) {
    setStepIndex(Math.max(0, Math.min(STEP_LABELS.length - 1, index)))
  }

  async function handleQrContinue(settings) {
    setSavingQr(true)
    let qrSaved = false
    try {
      const saved = await saveCardQr(cardId, settings)
      setSavedQrSettings(saved.settings)
      onQrSaved?.(saved)
      qrSaved = true
      toast.success('QR code saved')
    } catch (err) {
      toast.error(err.message || 'Could not save the QR code — you can add it later from the studio')
    } finally {
      setSavingQr(false)
    }

    // Only now — after the business card decision and the QR step are both
    // done — do these items actually land in the cart.
    addItem({
      id: `${cardId}-digitalCard`,
      type: 'digital-card',
      path: `/studio/${cardId}`,
      name: cardLabel,
      description: 'Published digital business card',
      price: '₹X',
    })
    if (wantsBusinessCard) {
      addItem({
        id: `${cardId}-businessCard`,
        name: 'Custom Business Card',
        description: 'Printed card matching your digital theme',
        price: '₹X',
      })
    }
    if (qrSaved) {
      addItem({
        id: `${cardId}-qr`,
        type: 'card-qr',
        path: `/studio/${cardId}?from=qr-studio`,
        name: 'Custom QR Code',
        description: 'Branded QR code linking to your digital card',
        price: '₹X',
      })
    }
    goTo(2)
  }

  return (
    <div className="confirm-overlay publish-flow-overlay" onClick={onClose}>
      <div
        className={`publish-flow-dialog ${stepIndex === 1 ? 'publish-flow-dialog--wide' : ''}`}
        style={{ maxWidth: stepIndex === 1 ? 1040 : 720 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="publish-flow-close" onClick={onClose} aria-label="Close">×</button>

        <div className="publish-flow-steps">
          {STEP_LABELS.map((label, index) => (
            <div
              key={label}
              className={`publish-flow-step-pill ${index === stepIndex ? 'active' : index < stepIndex ? 'done' : ''}`}
            >
              <span className="publish-flow-step-num">{index < stepIndex ? '✓' : index + 1}</span>
              {label}
            </div>
          ))}
        </div>

        {stepIndex === 0 && (
          <div className="publish-flow-business-card-step">
            <h2>Card published! Here's your business card.</h2>
            <p>We've automatically curated a matching business card using your digital card's theme and logo.</p>
            <SampleBusinessCard profile={profile} onEdit={() => toast.info('The business card editor is coming soon')} />
            <div className="publish-flow-actions">
              <button type="button" className="secondary-button" onClick={() => { setWantsBusinessCard(false); goTo(1) }}>
                Skip for now
              </button>
              <button type="button" className="primary-button" onClick={() => { setWantsBusinessCard(true); goTo(1) }}>
                Add to Cart &amp; Continue
              </button>
            </div>
          </div>
        )}

        {stepIndex === 1 && previewUrl && (
          <>
            <h2 className="publish-flow-qr-heading">Create your QR code</h2>
            <p className="publish-flow-qr-subheading">Style it to match your brand — it's ready to print or share as soon as you're done.</p>
            <QrStep
              profile={profile}
              previewUrl={previewUrl}
              initialSettings={savedQrSettings}
              saving={savingQr}
              onBack={() => goTo(0)}
              onContinue={handleQrContinue}
            />
          </>
        )}

        {stepIndex === 2 && (
          <CartStep
            items={cartItems}
            total={cartItems.length ? '₹X' : '₹0'}
            onRemove={removeItem}
            onCheckout={() => toast.info('Checkout is coming soon — payment gateway integration in progress.')}
            onContinueEditing={onClose}
          />
        )}
      </div>
    </div>
  )
}
