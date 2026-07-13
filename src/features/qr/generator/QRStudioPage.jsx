import { useMemo, useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { Sidebar } from '../../../components/Sidebar'
import { QRCode } from '../components/QRCode'
import { QRCustomizationPanel } from '../components/QRCustomizationPanel'
import { QRWarnings } from '../components/QRWarnings'
import { DestinationPicker } from '../components/DestinationPicker'
import { useQrDownload } from '../hooks/useQrDownload'
import { createDefaultQrSettings } from '../services/qrEngine'
import { publishStandaloneQr } from '../services/qrApi'
import { buildDestinationValue, DESTINATION_TYPES } from '../utils/destinations'
import { useCart } from '../../../context/CartContext'
import { useToast } from '../../../context/ToastContext'
import { useAuth } from '../../../context/AuthContext'
import { AuthModal } from '../../../components/AuthModal'
import { QrPreviewNotice, QrDevModeBadge } from '../components/QrLockStatus'
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
  const { addItem } = useCart()
  const toast = useToast()
  const { isAuthenticated } = useAuth()

  const data = useMemo(
    () => buildDestinationValue(destinationType, destinationFields),
    [destinationType, destinationFields],
  )

  const liveSettings = useMemo(() => ({ ...settings, data }), [settings, data])
  const { download, pending } = useQrDownload(liveSettings, 'qr-code')

  function handleDestinationChange(type, fields) {
    setDestinationType(type)
    setDestinationFields(fields)
  }

  // Designing here is always free — "Publish" is the paid step. It finalizes
  // this design as a real, card-less QR record (so it shows up under "My QR
  // Codes" like any other) and adds it to the cart; the QR itself follows
  // the same preview-vs-real gate as any other card-linked QR from there on.
  async function doPublish() {
    setPublishing(true)
    try {
      const qr = await publishStandaloneQr(liveSettings)
      addItem({
        id: `qr-${qr.id}`,
        type: 'qr',
        qrId: qr.id,
        path: '/qr-studio/codes',
        name: `Custom QR Code — ${DESTINATION_TYPES.find((d) => d.key === destinationType)?.label ?? 'QR'}`,
        description: 'Branded QR code generated in QR Studio',
        price: '₹X',
      })
      toast.success('QR code published — added to cart')
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
          <h2>Destination</h2>
          <DestinationPicker type={destinationType} fields={destinationFields} onChange={handleDestinationChange} />
        </section>

        <section className="editor-section">
          <h2>Customize</h2>
          <QRCustomizationPanel settings={settings} onChange={setSettings} brandTheme={brandTheme} />
        </section>
      </section>

      <aside className="preview-panel">
        <div className="preview-toolbar">
          <span>Live preview</span>
        </div>
        <div className="qr-preview-canvas">
          <QRCode settings={liveSettings} size={280} lockable />
        </div>
        <QrPreviewNotice />
        <QrDevModeBadge />
        <QRWarnings settings={liveSettings} />
        <button type="button" className="primary-button qr-publish-btn" disabled={publishing} onClick={handlePublish}>
          {publishing ? 'Publishing...' : 'Publish QR & Add to Cart'}
        </button>
        <div className="qr-download-row">
          <button type="button" className="secondary-button" disabled={pending === 'png'} onClick={() => download('png')}>
            {pending === 'png' ? 'Preparing...' : 'Download PNG'}
          </button>
          <button type="button" className="secondary-button" disabled={pending === 'svg'} onClick={() => download('svg')}>
            {pending === 'svg' ? 'Preparing...' : 'Download SVG'}
          </button>
          <button type="button" className="secondary-button" disabled={pending === 'pdf'} onClick={() => download('pdf')}>
            {pending === 'pdf' ? 'Preparing...' : 'Download PDF'}
          </button>
        </div>
      </aside>
    </main>
    </>
  )
}
