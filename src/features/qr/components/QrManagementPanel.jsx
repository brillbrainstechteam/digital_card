import { useMemo, useState } from 'react'
import { QRCode } from './QRCode'
import { QRCustomizationPanel } from './QRCustomizationPanel'
import { QRWarnings } from './QRWarnings'
import { DestinationPicker } from './DestinationPicker'
import { buildDestinationValue } from '../utils/destinations'
import { updateQrSettings } from '../services/qrApi'

/**
 * Full "Edit QR" surface for an already-published, standalone QR code
 * (My QR Codes). Unlike the old destination-only panel, this lets the
 * owner change the visual design too — colors, gradient, logo, error
 * correction — not just where the QR redirects. The QR's id/slug never
 * change, so any already-printed copy keeps scanning; only what a future
 * download/scan shows is affected.
 */
export function QrManagementPanel({ qr, onUpdated, onClose, toast }) {
  const [settings, setSettings] = useState(() => ({
    ...qr.settings,
    destinationType: qr.settings?.destinationType || 'website',
    destinationFields: qr.settings?.destinationFields || { url: '' },
  }))
  const [busy, setBusy] = useState(false)

  const liveSettings = useMemo(
    () => ({ ...settings, data: buildDestinationValue(settings.destinationType, settings.destinationFields) }),
    [settings],
  )

  function handleDestinationChange(type, fields) {
    setSettings((cur) => ({ ...cur, destinationType: type, destinationFields: fields }))
  }

  async function handleSave() {
    if (!buildDestinationValue(settings.destinationType, settings.destinationFields)) {
      toast.error('Add a valid destination before saving.')
      return
    }
    setBusy(true)
    try {
      const updated = await updateQrSettings(qr.id, settings)
      onUpdated(updated)
      toast.success('QR code updated.')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Could not update this QR code')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="qr-management-panel">
      <div className="qr-management-heading">
        <div>
          <h4>Edit QR Code</h4>
          <p>Change the destination, colors, or logo. The QR's link stays the same.</p>
        </div>
        <button type="button" className="secondary-button" onClick={onClose}>Close</button>
      </div>

      <div className="qr-integration-columns">
        <div className="qr-integration-controls">
          <div className="qr-section">
            <h3 className="qr-section-title">Destination</h3>
            <DestinationPicker
              type={settings.destinationType}
              fields={settings.destinationFields}
              onChange={handleDestinationChange}
            />
          </div>
          <QRCustomizationPanel settings={settings} onChange={setSettings} />
        </div>
        <div className="qr-integration-preview">
          <QRCode settings={liveSettings} size={220} lockable />
          <QRWarnings settings={liveSettings} />
        </div>
      </div>

      <button type="button" className="primary-button qr-save-destination" disabled={busy} onClick={handleSave}>
        {busy ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
