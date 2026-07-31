import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { resolveQrScan } from '../services/qrApi'
import '../qr-studio.css'

export function QrScanRedirect() {
  const { slug } = useParams()
  const [message, setMessage] = useState('Redirecting...')
  const [wifi, setWifi] = useState(null)

  useEffect(() => {
    let cancelled = false
    resolveQrScan(slug)
      .then(({ cardSlug, destinationType, destinationFields, destination }) => {
        if (cancelled) return
        const finalDestination = destination || (cardSlug ? `/card/${cardSlug}` : '')
        if (!finalDestination) {
          setMessage('This QR code has no destination configured yet.')
          return
        }
        if (destinationType === 'saveContact') {
          // Redirect to the server vcard endpoint so iOS opens Contacts directly
          // instead of triggering a browser download prompt
          const apiBase = window.location.origin
          window.location.replace(`${apiBase}/api/public/qr/${slug}/vcard`)
          return
        }
        if (destinationType === 'wifi') {
          setWifi(destinationFields)
          return
        }
        window.location.replace(finalDestination)
      })
      .catch(() => {
        if (!cancelled) setMessage('This QR code could not be found.')
      })
    return () => { cancelled = true }
  }, [slug])

  return (
    <main className="qr-scan-redirect">
      {wifi ? (
        <div className="qr-scan-card">
          <h1>Connect to Wi-Fi</h1>
          <p><strong>Network:</strong> {wifi.ssid}</p>
          {wifi.security !== 'nopass' && <p><strong>Password:</strong> {wifi.password}</p>}
          <p>Open Wi-Fi settings and use these details to connect.</p>
        </div>
      ) : message === 'CONTACT_READY' ? (
        <div className="qr-scan-card">
          <div className="qr-scan-icon">👤</div>
          <h1>Contact Card Downloaded</h1>
          <p>A contact file (.vcf) has been sent to your device. Open it to save the contact to your phone.</p>
          <p className="qr-scan-hint">If the file didn&apos;t open or the download didn&apos;t start, tap the button below to try again.</p>
          <button className="qr-scan-btn" onClick={() => window.location.reload()}>
            Download Again
          </button>
        </div>
      ) : (
        <p>{message}</p>
      )}
    </main>
  )
}
