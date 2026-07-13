// Guest-mode card draft persistence. Anyone can design a card at /create
// without an account — the in-progress profile lives only in localStorage
// until the user actually publishes (at which point a real card is created
// server-side and the draft is cleared).
const DRAFT_KEY = 'bb_guest_card_draft'

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveDraft(profile) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(profile))
  } catch {
    // Storage can fail (quota, private browsing) — losing draft persistence
    // silently is preferable to breaking the editor over it.
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // no-op
  }
}
