import { useQrDevModeEnabled, setQrDevModeOverride } from '../services/qrAccess'
import './qr-lock-status.css'

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

// Shown below a card-linked QR preview whenever it isn't unlocked yet — the
// dummy example.com QR is the only thing that should ever be visible here,
// so this notice is the one thing that tells the user why. Reads dev mode
// reactively so it disappears the instant the badge's toggle turns it off.
export function QrPreviewNotice({ settings }) {
  const devModeEnabled = useQrDevModeEnabled()
  if (devModeEnabled || settings?.purchased) return null

  return (
    <div className="qr-preview-notice">
      <span className="qr-preview-notice-icon"><LockIcon /></span>
      <p>
        <strong>Preview QR</strong>
        <br />
        This is a dummy QR code for preview purposes and currently points to example.com.
        Your personalized QR will be generated and activated only after purchasing the QR add-on.
      </p>
    </div>
  )
}

// A dev-only control (never rendered in a production build — see
// isQrDevModeEnabled in qrAccess.js) for flipping the payment bypass on or
// off for the rest of the session, no .env edit or restart needed. When
// the bypass is on, this also doubles as the "payment bypass enabled"
// indicator so it's obvious in a screenshot or screen-share.
export function QrDevModeBadge() {
  const enabled = useQrDevModeEnabled()

  if (!import.meta.env.DEV) return null

  return (
    <div className={`qr-dev-mode-badge ${enabled ? 'qr-dev-mode-badge--on' : 'qr-dev-mode-badge--off'}`}>
      <strong>Developer Mode</strong>
      <span>{enabled ? 'Payment bypass enabled' : 'Off — real payment flow'}</span>
      <button
        type="button"
        className="qr-dev-mode-toggle"
        onClick={() => setQrDevModeOverride(!enabled)}
        title={enabled ? 'Turn off developer mode for this session' : 'Turn on developer mode for this session'}
      >
        {enabled ? 'Turn off' : 'Turn on'}
      </button>
    </div>
  )
}
