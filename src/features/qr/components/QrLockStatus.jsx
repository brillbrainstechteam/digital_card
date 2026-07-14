import './qr-lock-status.css'

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

export function QrPreviewNotice({ settings }) {
  if (settings?.purchased) return null

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
