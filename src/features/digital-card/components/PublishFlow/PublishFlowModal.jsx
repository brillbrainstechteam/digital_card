import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrStep } from './QrStep'
import { createTempPreviewLink } from '../../utils/previewLink'
import { saveCardQr } from '../../../qr'
import { useToast } from '../../../../context/ToastContext'
import { useCart } from '../../../../context/CartContext'
import './publish-flow.css'

export function PublishFlowModal({ open, onClose, profile, cardId, existingQr, onQrSaved }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { addItem } = useCart()
  const [savedQrSettings, setSavedQrSettings] = useState(existingQr?.settings ?? null)
  const [savingQr, setSavingQr] = useState(false)

  const previewUrl = useMemo(() => (open ? createTempPreviewLink(profile) : null), [open, profile])
  const cardLabel = profile.companyName || profile.brandName || 'Digital Card'

  if (!open) return null

  async function prepareCart(settings = null) {
    setSavingQr(true)
    try {
      let savedQrId = null
      if (settings) {
        try {
          const saved = await saveCardQr(cardId, {
            ...settings,
            destinationType: 'digitalCard',
            destinationFields: {},
            data: '',
            purchased: false,
          })
          setSavedQrSettings(saved.settings)
          onQrSaved?.(saved)
          savedQrId = saved.id
        } catch (error) {
          toast.error(error.message || 'Could not save the QR code. You can add it later from the studio.')
        }
      }

      addItem({
        id: `${cardId}-digitalCard`,
        type: 'digital-card',
        path: `/studio/${cardId}`,
        name: cardLabel,
        parentCardName: cardLabel,
        description: 'Digital business card pending payment confirmation',
        amount: 1,
        publishCardId: cardId,
      })

      if (savedQrId) {
        addItem({
          id: `${cardId}-qr`,
          type: 'card-qr',
          path: `/qr-studio/codes?qrId=${savedQrId}`,
          name: `${cardLabel} - QR Code`,
          parentCardName: cardLabel,
          description: 'Branded QR code linked to your Digital Card',
          amount: 1,
          qrId: savedQrId,
        })
      }

      onClose()
      navigate('/cart')
    } catch (error) {
      toast.error(error.message || 'Could not prepare your cart')
    } finally {
      setSavingQr(false)
    }
  }

  return (
    <div className="confirm-overlay publish-flow-overlay" onClick={onClose}>
      <div
        className="publish-flow-dialog publish-flow-dialog--wide"
        style={{ maxWidth: 1040 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="publish-flow-close" onClick={onClose} aria-label="Close">×</button>
        {previewUrl && (
          <>
            <h2 className="publish-flow-qr-heading">Create your QR code</h2>
            <p className="publish-flow-qr-subheading">Customize your branded QR code. It activates after payment confirmation.</p>
            <QrStep
              profile={profile}
              previewUrl={previewUrl}
              initialSettings={savedQrSettings}
              saving={savingQr}
              onBack={onClose}
              onSkip={() => prepareCart()}
              onContinue={prepareCart}
            />
          </>
        )}
      </div>
    </div>
  )
}
