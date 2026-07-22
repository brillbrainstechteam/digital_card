import { useMemo } from 'react'
import { QRCode } from './QRCode'
import { QRCustomizationPanel } from './QRCustomizationPanel'
import { QRWarnings } from './QRWarnings'
import { DestinationPicker } from './DestinationPicker'
import { QrPreviewNotice } from './QrLockStatus'
import { buildDestinationValue } from '../utils/destinations'
import '../qr-studio.css'

/**
 * Generic "Add/Edit QR Code" editing surface. This is the single reusable
 * integration point for embedding QR creation inside any product editor
 * (Digital Card today, Business Card later) — it knows nothing about cards,
 * profiles, or any other product's domain model. Callers own persistence:
 * they pass the current settings + a save handler, and this component just
 * renders the standard QR editing UI (destination, customization, preview)
 * around it.
 */
export function QrIntegrationPanel({
  settings,
  onSettingsChange,
  brandTheme = null,
  onSave,
  onRemove,
  saving = false,
  isExisting = false,
  // Optional (type) => fields override, used by a host product to prefill a
  // destination type with its own domain data (e.g. Digital Card prefilling
  // "Save Contact" from the card's profile). Return undefined for any type
  // that should just use the QR module's normal blank defaults.
  getDefaultFields,
}) {
  const liveSettings = useMemo(
    () => ({ ...settings, data: buildDestinationValue(settings.destinationType, settings.destinationFields) }),
    [settings],
  )

  function handleDestinationChange(type, fields) {
    const isTypeChange = type !== settings.destinationType
    const finalFields = isTypeChange ? (getDefaultFields?.(type) ?? fields) : fields
    onSettingsChange({ ...settings, destinationType: type, destinationFields: finalFields })
  }

  return (
    <div className="qr-integration-panel">
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
          <QRCustomizationPanel settings={settings} onChange={onSettingsChange} brandTheme={brandTheme} />
        </div>
        <div className="qr-integration-preview">
          <QRCode settings={liveSettings} size={220} lockable />
          <QRWarnings settings={liveSettings} />
          <QrPreviewNotice settings={settings} />
        </div>
      </div>
      <div className="qr-integration-actions">
        {isExisting && onRemove && (
          <button type="button" className="danger-button" onClick={onRemove} disabled={saving}>
            Remove QR Code
          </button>
        )}
        <button type="button" className="primary-button" onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : isExisting ? 'Update QR Code' : 'Save QR Code'}
        </button>
      </div>
    </div>
  )
}
