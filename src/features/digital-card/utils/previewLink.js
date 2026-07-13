// Generates a temporary, session-only preview link for a card profile —
// the same mechanism StudioPage's "Public View" button uses. The profile is
// stashed in sessionStorage under a random token, so the link only resolves
// in the browser tab that created it and can never be opened elsewhere or
// on another device. Perfect for QR codes created before a card is actually
// published to a public slug.
export function createTempPreviewLink(profile) {
  const token = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    sessionStorage.setItem(`bb_preview_${token}`, JSON.stringify(profile))
    return `${window.location.origin}/preview/${token}`
  } catch {
    return null
  }
}
