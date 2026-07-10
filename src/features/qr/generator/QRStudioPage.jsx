import { useMemo, useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { Sidebar } from '../../../components/Sidebar'
import { QRCode } from '../components/QRCode'
import { QRCustomizationPanel } from '../components/QRCustomizationPanel'
import { QRWarnings } from '../components/QRWarnings'
import { DestinationPicker } from '../components/DestinationPicker'
import { useQrDownload } from '../hooks/useQrDownload'
import { createDefaultQrSettings } from '../services/qrEngine'
import { buildDestinationValue } from '../utils/destinations'
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

  return (
    <main className="studio studio-workspace">
      <Sidebar mode="app" activeApp="qrstudio" />
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
          <QRCode settings={liveSettings} size={280} />
        </div>
        <QRWarnings settings={liveSettings} />
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
  )
}
