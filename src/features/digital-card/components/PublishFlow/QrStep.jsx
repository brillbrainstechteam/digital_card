import { useState } from 'react'
import { QRCode, QRCustomizationPanel, QRWarnings, QrPreviewNotice, QrDevModeBadge, createDefaultQrSettings, useIsQrUnlocked } from '../../../qr'

// The QR step in the post-publish flow only ever encodes one thing — a
// temporary preview link for the card that was just published — so unlike
// the standalone QR Studio / card-editor "Add QR Code" dialog, there is no
// DestinationPicker here at all. Colors, gradient, and logo are still fully
// customizable via the same reusable QRCustomizationPanel every other QR
// surface uses.
export function QrStep({ profile, previewUrl, initialSettings, saving, onBack, onContinue }) {
  const [settings, setSettings] = useState(() => {
    const base = initialSettings || createDefaultQrSettings()
    return {
      ...base,
      destinationType: 'digitalCard',
      destinationFields: { url: previewUrl },
      data: previewUrl,
      foreground: initialSettings?.foreground || profile.palette?.primary || base.foreground,
      background: initialSettings?.background || profile.palette?.surface || base.background,
      logo: initialSettings?.logo ?? profile.logo ?? null,
    }
  })

  const liveSettings = { ...settings, data: previewUrl }
  const unlocked = useIsQrUnlocked({ purchased: settings.purchased })

  return (
    <div className="publish-flow-qr-step">
      <div className="publish-flow-qr-columns">
        <div className="publish-flow-qr-preview">
          <QRCode settings={liveSettings} size={220} lockable />
          <QRWarnings settings={liveSettings} />
          {unlocked ? (
            <p className="publish-flow-qr-note">
              This QR points to a temporary preview of your card — it only opens in this browser and can't be shared to other devices.
            </p>
          ) : (
            <QrPreviewNotice settings={settings} />
          )}
        </div>
        <div className="publish-flow-qr-controls">
          <QrDevModeBadge />
          <QRCustomizationPanel settings={settings} onChange={setSettings} brandTheme={profile.palette} />
        </div>
      </div>
      <div className="publish-flow-actions">
        <button type="button" className="secondary-button" onClick={onBack}>Back</button>
        <button type="button" className="primary-button" disabled={saving} onClick={() => onContinue(settings)}>
          {saving ? 'Saving…' : 'Continue to Cart'}
        </button>
      </div>
    </div>
  )
}
