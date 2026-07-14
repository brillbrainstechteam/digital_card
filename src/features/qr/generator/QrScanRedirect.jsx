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
          const url = URL.createObjectURL(new Blob([finalDestination], { type: 'text/vcard;charset=utf-8' }))
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = `${destinationFields?.fullName || 'contact'}.vcf`
          anchor.click()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
          setMessage('Your contact file is ready. Open it to save the contact.')
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
      ) : <p>{message}</p>}
    </main>
  )
}
