import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SampleBusinessCard } from './SampleBusinessCard'
import { QrStep } from './QrStep'
import { createTempPreviewLink } from '../../utils/previewLink'
import { saveCardQr } from '../../../qr'
import { createCard, updateCard } from '../../../business-card/services/api'
import { TEMPLATES } from '../../../business-card/bcTemplates'
import { useToast } from '../../../../context/ToastContext'
import { useCart } from '../../../../context/CartContext'
import './publish-flow.css'

const STEP_LABELS = ['Business Card', 'QR Code']
const CURATED_TEMPLATE = 'corp-minimal'
const CURATED_SETUP = { size: 'standard', orientation: 'horizontal' }

function profileForBusinessCard(profile = {}) {
  return {
    personName: profile.personName || profile.brandName || '',
    designation: profile.designation || '',
    companyName: profile.companyName || '',
    tagline: profile.tagline || '',
    phone: profile.phone || '',
    email: profile.email || '',
    website: profile.website || '',
    location: profile.location || '',
    address: profile.address || profile.location || '',
    logo: profile.logo || profile.logoSource || '',
    logoSource: profile.logoSource || profile.logo || '',
    palette: profile.palette,
    themeColors: profile.themeColors,
    fromDigitalCardOnly: true,
  }
}

export function PublishFlowModal({ open, onClose, profile, cardId, existingQr, onQrSaved }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { addItem } = useCart()
  const [stepIndex, setStepIndex] = useState(0)
  const [wantsBusinessCard, setWantsBusinessCard] = useState(true)
  const [savedQrSettings, setSavedQrSettings] = useState(existingQr?.settings ?? null)
  const [savingQr, setSavingQr] = useState(false)
  const [businessCardId, setBusinessCardId] = useState(null)
  const [creatingBusinessCard, setCreatingBusinessCard] = useState(false)
  const [templateId, setTemplateId] = useState(CURATED_TEMPLATE)
  const [editingTemplate, setEditingTemplate] = useState(false)

  const previewUrl = useMemo(() => (open ? createTempPreviewLink(profile) : null), [open, profile])
  const businessProfile = useMemo(() => profileForBusinessCard(profile), [profile])
  const cardLabel = profile.companyName || profile.brandName || 'Digital Card'

  if (!open) return null

  function goTo(index) {
    setStepIndex(Math.max(0, Math.min(STEP_LABELS.length - 1, index)))
  }

  async function ensureBusinessCard() {
    if (businessCardId) return businessCardId
    setCreatingBusinessCard(true)
    try {
      const created = await createCard(`Built from your digital card - ${cardLabel}`, { productType: 'business' })
      await updateCard(created.id, {
        status: 'draft',
        card_data: {
          productType: 'business',
          sourceDigitalCardId: cardId,
          businessCard: {
            templateId,
            setup: CURATED_SETUP,
            profile: businessProfile,
            personalizedFromDigitalCard: true,
          },
        },
      })
      setBusinessCardId(created.id)
      return created.id
    } finally {
      setCreatingBusinessCard(false)
    }
  }

  async function handleEditBusinessCard() {
    try {
      const id = await ensureBusinessCard()
      onClose()
      navigate(`/business-card/${id}`)
    } catch (error) {
      toast.error(error.message || 'Could not create the personalized Business Card')
    }
  }

  async function prepareCart(settings = null) {
    setSavingQr(true)
    try {
      let qrSaved = false
      let savedQrId = null
      if (settings) {
        try {
          // The publish preview uses a temporary browser-only URL. Persist
          // an empty digital-card destination so the public resolver falls
          // back to this card's permanent slug after payment.
          const saved = await saveCardQr(cardId, {
            ...settings,
            destinationType: 'digitalCard',
            destinationFields: {},
            data: '',
            purchased: false,
          })
          setSavedQrSettings(saved.settings)
          onQrSaved?.(saved)
          qrSaved = true
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
        price: 'INR 499',
        amount: 499,
        publishCardId: cardId,
      })

      if (wantsBusinessCard) {
        const id = await ensureBusinessCard()
        addItem({
          id: `${cardId}-businessCard`,
          type: 'business-card',
          path: `/business-card/${id}`,
          name: `${cardLabel} - Business Card`,
          parentCardName: cardLabel,
          description: 'Personalized print-ready Business Card',
          price: 'INR 799',
          amount: 799,
          publishCardId: id,
        })
      }

      if (qrSaved) {
        addItem({
          id: `${cardId}-qr`,
          type: 'card-qr',
          path: `/qr-studio/codes?qrId=${savedQrId}`,
          name: `${cardLabel} - QR Code`,
          parentCardName: cardLabel,
          description: 'Branded QR code linked to your Digital Card',
          price: 'INR 299',
          amount: 299,
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
        className={`publish-flow-dialog ${stepIndex === 1 ? 'publish-flow-dialog--wide' : ''}`}
        style={{ maxWidth: stepIndex === 1 ? 1040 : 720 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="publish-flow-close" onClick={onClose} aria-label="Close">×</button>

        <div className="publish-flow-steps">
          {STEP_LABELS.map((label, index) => (
            <div key={label} className={`publish-flow-step-pill ${index === stepIndex ? 'active' : index < stepIndex ? 'done' : ''}`}>
              <span className="publish-flow-step-num">{index < stepIndex ? '✓' : index + 1}</span>
              {label}
            </div>
          ))}
        </div>

        {stepIndex === 0 && (
          <div className="publish-flow-business-card-step">
            <h2>Your personalized Business Card is ready</h2>
            <p>It uses a live Business Card template with your details, logo, and extracted theme.</p>
            <SampleBusinessCard profile={businessProfile} templateId={templateId} onEdit={handleEditBusinessCard} />
            <div className="publish-flow-template-controls">
              <button type="button" className="secondary-button" onClick={() => setEditingTemplate((current) => !current)}>
                {editingTemplate ? 'Close Templates' : 'Edit Template'}
              </button>
              {editingTemplate && (
                <label className="field publish-flow-template-field">
                  <span>Business Card Template</span>
                  <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                    {TEMPLATES.map((template) => (
                      <option key={template.id} value={template.id}>{template.label}</option>
                    ))}
                  </select>
                  <small>The preview updates immediately when you choose a template.</small>
                </label>
              )}
            </div>
            <div className="publish-flow-actions">
              <button type="button" className="secondary-button" onClick={() => { setWantsBusinessCard(false); goTo(1) }}>
                Skip for now
              </button>
              <button type="button" className="primary-button" disabled={creatingBusinessCard} onClick={() => { setWantsBusinessCard(true); goTo(1) }}>
                {creatingBusinessCard ? 'Creating...' : 'Add to Cart & Continue'}
              </button>
            </div>
          </div>
        )}

        {stepIndex === 1 && previewUrl && (
          <>
            <h2 className="publish-flow-qr-heading">Create your QR code</h2>
            <p className="publish-flow-qr-subheading">Customize the QR code now. All products publish after demo payment confirmation.</p>
            <QrStep
              profile={profile}
              previewUrl={previewUrl}
              initialSettings={savedQrSettings}
              saving={savingQr}
              onBack={() => goTo(0)}
              onSkip={() => prepareCart()}
              onContinue={prepareCart}
            />
          </>
        )}
      </div>
    </div>
  )
}
