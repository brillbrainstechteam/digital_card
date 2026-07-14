// Unpaid QR previews encode this harmless placeholder. The real dynamic
// destination is available only after payment confirmation.
export const PREVIEW_QR_URL = 'https://example.com'

export function isQrUnlocked({ purchased = false } = {}) {
  return Boolean(purchased)
}
