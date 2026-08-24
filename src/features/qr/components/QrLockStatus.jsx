import './qr-lock-status.css'

export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

// The "this is a preview, not your real QR" explanation used to show in the
// editor at all times before purchase. That messaging now only appears where
// it's actually needed — to someone who scans an unpurchased QR in the wild
// (see QrScanRedirect) — not to the owner while they're still designing it.
export function QrPreviewNotice() {
  return null
}
