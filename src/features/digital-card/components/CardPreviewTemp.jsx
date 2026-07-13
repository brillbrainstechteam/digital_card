import { useParams } from 'react-router-dom'
import { CardPreview } from './CardPreview'
import { pageBackgroundVariables } from '../theme'

const STORAGE_PREFIX = 'bb_preview_'

// Renders a card preview entirely from sessionStorage — no server request,
// no publish required. The link only resolves in the same browser tab/
// session that generated it (sessionStorage is per-tab-group and never
// leaves the device), so it can't be opened by anyone else over the
// internet, and it works for unsaved/draft cards.
export function CardPreviewTemp() {
  const { token } = useParams()
  const profile = (() => {
    try {
      const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${token}`)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })()

  if (!profile) {
    return (
      <main className="public-view public-view--center">
        <div className="public-error-card">
          <h1>Preview unavailable</h1>
          <p>This temporary preview link only works in the browser tab that created it, and it expires when that session ends.</p>
        </div>
      </main>
    )
  }

  return (
    <div style={pageBackgroundVariables(profile.palette, profile.theme)}>
      <main className="public-view">
        <CardPreview profile={profile} immersive />
      </main>
    </div>
  )
}
