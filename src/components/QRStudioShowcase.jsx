import { useNavigate } from 'react-router-dom'
import { QrStudioAnimation } from './QrStudioAnimation'

// The three static demo codes that used to sit here (Classic / Gradient /
// With Logo) are now beats inside QrStudioAnimation, which walks through the
// same styling steps on a live code instead of showing three finished ones.

export function QRStudioShowcase() {
  const navigate = useNavigate()

  function handleTryQrStudio() {
    navigate('/qr-studio')
  }

  return (
    <section className="qr-showcase">
      <div className="qr-showcase-copy">
        <p className="eyebrow">Introducing QR Studio</p>
        <h2>
          Branded QR codes,
          <br />
          made in seconds.
        </h2>
        <p className="qr-showcase-description">
          One QR for your digital card, or its own for WhatsApp, your location, Wi-Fi
          or a Save Contact card — styled with your own colors, gradients and logo.
        </p>
        <div className="hero-buttons">
          <button className="primary-button" type="button" onClick={handleTryQrStudio}>
            Try QR Studio
          </button>
        </div>
        <div className="feature-row">
          <span>WhatsApp, Maps &amp; Wi-Fi</span>
          <span>Custom colors &amp; logo</span>
          <span>PNG · SVG · PDF</span>
        </div>
      </div>
      <div className="qr-showcase-grid">
        <QrStudioAnimation />
      </div>
    </section>
  )
}
