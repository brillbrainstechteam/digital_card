import { useMemo, useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { Sidebar } from '../../../components/Sidebar'
import { QRCode } from '../components/QRCode'
import { QRCustomizationPanel } from '../components/QRCustomizationPanel'
import { DestinationPicker } from '../components/DestinationPicker'
import { createDefaultQrSettings } from '../services/qrEngine'
import { publishStandaloneQr } from '../services/qrApi'
import { buildDestinationValue, DESTINATION_TYPES, QR_TYPES, coerceDestinationForQrType, defaultFieldsForType } from '../utils/destinations'
import { useCart } from '../../../context/CartContext'
import { useToast } from '../../../context/ToastContext'
import { useAuth } from '../../../context/AuthContext'
import { AuthModal } from '../../../components/AuthModal'
import { QrPreviewNotice } from '../components/QrLockStatus'
import '../qr-studio.css'

/**
 * Standalone QR Studio product page. Everything here is composed from the
 * reusable features/qr/ module — this file only owns page-level layout and
 * the "which destination am I building for" state. A future Digital Card
 * "QR add-on" panel would compose the same pieces (QRCode,
 * QRCustomizationPanel, useQrDownload) without this page at all.
 *
 * `brandTheme` (optional prop) is how a future Digital Card / Business Card
 * integration would hand off its extracted brand palette — e.g.
 * <QRStudioPage brandTheme={card.palette} initialDestination={{ type: 'digitalCard', fields: { url: publicUrl } }} />
 * No such integration is wired up yet per the current scope.
 */
export function QRStudioPage({ brandTheme = null, initialDestination = null }) {
  const [settings, setSettings] = useState(createDefaultQrSettings)
  const [destinationType, setDestinationType] = useState(initialDestination?.type || 'website')
  const [destinationFields, setDestinationFields] = useState(initialDestination?.fields || { url: '' })
  const [publishing, setPublishing] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const { addItem, removeItem } = useCart()
  // The cart line for this studio session's QR. Each publish mints a fresh
  // QR record (new id), so without tracking the previous one every re-publish
  // stacked another line for what is really the same, re-edited QR.
  const [publishedQrId, setPublishedQrId] = useState(null)
  const toast = useToast()
  const { isAuthenticated } = useAuth()

  const data = useMemo(
    () => buildDestinationValue(destinationType, destinationFields),
    [destinationType, destinationFields],
  )

  const qrType = settings.qrType || 'static'

  const liveSettings = useMemo(
    () => ({ ...settings, data, destinationType, destinationFields }),
    [settings, data, destinationType, destinationFields],
  )

  function handleDestinationChange(type, fields) {
    setDestinationType(type)
    setDestinationFields(fields)
  }

  // Switching type can invalidate the destination (Wi-Fi is static-only,
  // Digital Card is dynamic-only), so re-point it to something legal rather
  // than leaving the picker on an option this type cannot encode.
  function handleQrTypeChange(nextType) {
    if (nextType === qrType) return
    setSettings((current) => ({ ...current, qrType: nextType }))
    const nextDestination = coerceDestinationForQrType(destinationType, nextType)
    if (nextDestination !== destinationType) {
      setDestinationType(nextDestination)
      setDestinationFields(defaultFieldsForType(nextDestination))
      const label = DESTINATION_TYPES.find((d) => d.key === destinationType)?.label
      toast.info(`${label} isn't available for ${nextType} QR codes — switched to ${DESTINATION_TYPES.find((d) => d.key === nextDestination)?.label}.`)
    }
  }

  // Designing here is always free — "Publish" is the paid step. It finalizes
  // this design as a real, card-less QR record (so it shows up under "My QR
  // Codes" like any other) and adds it to the cart; the QR itself follows
  // the same preview-vs-real gate as any other card-linked QR from there on.
  async function doPublish() {
    setPublishing(true)
    try {
      const qr = await publishStandaloneQr(liveSettings)
      // Drop the previous, superseded line first — only the QR the user
      // actually finalized should be in the cart, not one per edit.
      if (publishedQrId && publishedQrId !== qr.id) removeItem(`qr-${publishedQrId}`)
      setPublishedQrId(qr.id)
      addItem({
        id: `qr-${qr.id}`,
        type: 'qr',
        qrId: qr.id,
        path: '/qr-studio/codes',
        name: `Custom QR Code — ${DESTINATION_TYPES.find((d) => d.key === destinationType)?.label ?? 'QR'}`,
        description: 'Branded QR code generated in QR Studio',
        amount: 299,
      })
      toast.success('QR code added to cart. Complete payment to publish it.')
    } catch (err) {
      toast.error(err.message || 'Could not publish this QR code')
    } finally {
      setPublishing(false)
    }
  }

  function handlePublish() {
    if (!data) {
      toast.error('Add a destination before publishing this QR code.')
      return
    }
    if (!isAuthenticated) {
      setShowAuth(true)
      return
    }
    doPublish()
  }

  return (
    <>
    <AuthModal
      open={showAuth}
      onClose={() => setShowAuth(false)}
      onAuthenticated={() => { setShowAuth(false); doPublish() }}
      title="Log in to publish your QR"
      subtitle="Your design is saved — we just need an account to publish it."
    />
    <main className="studio studio-workspace">
      <Sidebar mode="app" section="qr" activeApp="qrstudio" />
      <section className="editor-panel">
        <PageHeader
          badge="QR STUDIO"
          title="Create branded QR codes"
          subtitle="Generate fully customizable QR codes with live preview, brand colors, and a center logo."
        />

        <section className="editor-section">
          <h2>QR type</h2>
          <div className="qr-type-selector">
            {QR_TYPES.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`qr-type-card${qrType === option.key ? ' qr-type-card--active' : ''}`}
                aria-pressed={qrType === option.key}
                onClick={() => handleQrTypeChange(option.key)}
              >
                <span className="qr-type-card-head">
                  <strong>{option.label}</strong>
                  {qrType === option.key && <span className="qr-type-card-check">✓</span>}
                </span>
                <span className="qr-type-card-tagline">{option.tagline}</span>
                <ul className="qr-type-card-perks">
                  {option.perks.map((perk) => <li key={perk}>{perk}</li>)}
                </ul>
                <ul className="qr-type-card-limits">
                  {option.limits.map((limit) => <li key={limit}>{limit}</li>)}
                </ul>
              </button>
            ))}
          </div>
        </section>

        <section className="editor-section">
          <h2>Destination</h2>
          <DestinationPicker
            type={destinationType}
            fields={destinationFields}
            qrType={qrType}
            onChange={handleDestinationChange}
          />
        </section>

        <section className="editor-section">
          <h2>Customize</h2>
          <QRCustomizationPanel settings={settings} onChange={setSettings} brandTheme={brandTheme} />
        </section>
      </section>

      <aside className="preview-panel qr-studio-preview">
        <div className="preview-toolbar">
          <span>Live preview</span>
        </div>
        <div className="qr-preview-canvas">
          <QRCode settings={liveSettings} size={220} lockable />
        </div>
        <QrPreviewNotice />
        <button type="button" className="primary-button qr-publish-btn" disabled={publishing} onClick={handlePublish}>
          {publishing ? 'Adding...' : 'Add QR to Cart'}
        </button>
      </aside>
    </main>
    </>
  )
}
