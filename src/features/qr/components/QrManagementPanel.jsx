import { useMemo, useState } from 'react'
import { QRCode } from './QRCode'
import { QRCustomizationPanel } from './QRCustomizationPanel'
import { DestinationPicker } from './DestinationPicker'
import { buildDestinationValue } from '../utils/destinations'
import { updateQrSettings } from '../services/qrApi'

/**
 * Full "Edit QR" surface for an already-published, standalone QR code
 * (My QR Codes). Unlike the old destination-only panel, this lets the
 * owner change the visual design too — colors, gradient, logo, error
 * correction — not just where the QR redirects.
 *
 * That "the QR keeps scanning after an edit" promise is only true for a
 * DYNAMIC QR: its pattern encodes a /q/:slug redirect, so re-pointing the
 * destination here updates every already-printed copy too. A STATIC QR has
 * no redirect — the destination is baked directly into the pixel pattern —
 * so editing it here would silently update the database record while any
 * already-printed or downloaded copy keeps pointing at the stale content
 * forever. That directly contradicts the "cannot be changed after
 * printing" promise static QRs are sold on elsewhere in this UI, so
 * destination editing is disabled for them; only visual restyling (colors,
 * logo) is offered, which is safe because it only affects a future
 * re-download.
 */
export function QrManagementPanel({ qr, onUpdated, onClose, toast }) {
  const isStatic = (qr.settings?.qrType || 'static') === 'static'
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
      // Static QRs never send a changed destination to the server — the
      // original is preserved even if the picker's local state changed
      // before the type check above disabled it, so a stray update can't
      // slip through.
      const payload = isStatic
        ? { ...settings, destinationType: qr.settings?.destinationType, destinationFields: qr.settings?.destinationFields, data: qr.settings?.data }
        : settings
      const updated = await updateQrSettings(qr.id, payload)
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
          <p>
            {isStatic
              ? 'Static QR — the destination is baked into the pattern and cannot change. Colors and logo can still be updated for future downloads.'
              : "Change the destination, colors, or logo. The QR's link stays the same."}
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={onClose}>Close</button>
      </div>

      <div className="qr-integration-columns">
        <div className="qr-integration-controls">
          <div className="qr-section">
            <h3 className="qr-section-title">Destination</h3>
            {isStatic ? (
              <p className="qr-field-hint">
                Locked — re-pointing a static QR would not reach any copy that has
                already been printed or downloaded. Publish a new QR code instead
                if you need a different destination.
              </p>
            ) : (
              <DestinationPicker
                type={settings.destinationType}
                fields={settings.destinationFields}
                onChange={handleDestinationChange}
              />
            )}
          </div>
          <QRCustomizationPanel settings={settings} onChange={setSettings} />
        </div>
        <div className="qr-integration-preview">
          <QRCode settings={liveSettings} size={220} lockable />
        </div>
      </div>

      <button type="button" className="primary-button qr-save-destination" disabled={busy} onClick={handleSave}>
        {busy ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
