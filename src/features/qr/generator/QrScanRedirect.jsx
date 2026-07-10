import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { resolveQrScan } from '../services/qrApi'

/**
 * Public route: `/q/:slug`. This is the URL actually encoded into a
 * card-linked QR code (for destination types that are navigable URLs).
 * Visiting it records the scan server-side, then forwards the visitor to
 * the real destination — currently always the Digital Card's public page,
 * which is what lets "scan → view → click → lead → subscriber" all show up
 * as one connected funnel without double-counting the scan itself as a view.
 */
export function QrScanRedirect() {
  const { slug } = useParams()
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    resolveQrScan(slug)
      .then(({ cardSlug }) => {
        if (cancelled) return
        if (!cardSlug) {
          setError('This QR code has no destination configured yet.')
          return
        }
        window.location.replace(`/card/${cardSlug}`)
      })
      .catch(() => {
        if (!cancelled) setError('This QR code could not be found.')
      })
    return () => { cancelled = true }
  }, [slug])

  return (
    <main className="qr-scan-redirect">
      {error ? <p>{error}</p> : <p>Redirecting…</p>}
    </main>
  )
}
