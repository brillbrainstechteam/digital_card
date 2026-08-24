import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { resolveQrScan } from '../services/qrApi'
import { LockIcon } from '../components/QrLockStatus'
import '../qr-studio.css'
import '../components/qr-lock-status.css'

export function QrScanRedirect() {
  const { slug } = useParams()
  const [message, setMessage] = useState('Redirecting...')
  const [wifi, setWifi] = useState(null)
  const [notPurchased, setNotPurchased] = useState(false)

  useEffect(() => {
    let cancelled = false
    resolveQrScan(slug)
      .then(({ cardSlug, destinationType, destinationFields, destination, notPurchased: unpaid }) => {
        if (cancelled) return
        if (unpaid) {
          setNotPurchased(true)
          return
        }
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
      {notPurchased ? (
        <div className="qr-scan-card">
          <div className="qr-preview-notice qr-preview-notice--standalone">
            <span className="qr-preview-notice-icon"><LockIcon /></span>
            <p>
              <strong>This QR code isn&apos;t active yet</strong>
              <br />
              Its owner hasn&apos;t completed payment, so it doesn&apos;t point anywhere yet.
              If this is your QR code, activate it from your dashboard to make it live.
            </p>
          </div>
          <Link className="qr-scan-btn" to="/">Go to Brill Brains</Link>
        </div>
      ) : wifi ? (
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
