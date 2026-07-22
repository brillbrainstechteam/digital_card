import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { QRCode, createDefaultQrSettings } from '../features/qr'

const DEMO_DATA = 'https://brillbrainsconsultants.com'

const DEMO_QRS = [
  {
    key: 'classic',
    label: 'Classic',
    settings: { ...createDefaultQrSettings(), data: DEMO_DATA },
  },
  {
    key: 'gradient',
    label: 'Gradient',
    settings: {
      ...createDefaultQrSettings(),
      data: DEMO_DATA,
      background: '#ffffff',
      gradient: { type: 'linear', rotation: 45, colors: ['#7c3aed', '#c026d3'] },
    },
  },
  {
    key: 'branded',
    label: 'With Logo',
    settings: {
      ...createDefaultQrSettings(),
      data: DEMO_DATA,
      foreground: '#155e75',
      background: '#f7f1e9',
      logo: '/bb-logo.png',
      logoSizeRatio: 0.24,
    },
  },
]

export function QRStudioShowcase() {
  const { isAuthenticated } = useAuth()
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
          Generate fully customizable QR codes with your own colors, gradients and center logo —
          with a live preview and instant PNG, SVG or PDF downloads.
        </p>
        <div className="hero-buttons">
          <button className="primary-button" type="button" onClick={handleTryQrStudio}>
            Try QR Studio
          </button>
        </div>
        <div className="feature-row">
          <span>Custom colors &amp; gradients</span>
          <span>Center logo</span>
          <span>PNG · SVG · PDF</span>
        </div>
      </div>
      <div className="qr-showcase-grid">
        {DEMO_QRS.map((demo) => (
          <div key={demo.key} className="qr-showcase-card">
            <QRCode settings={demo.settings} size={148} />
            <span>{demo.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
