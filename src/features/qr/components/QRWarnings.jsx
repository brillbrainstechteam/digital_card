import { validateQrSettings } from '../utils/validation'

/** Non-blocking warning banner list — reusable anywhere a <QRCode /> is rendered. */
export function QRWarnings({ settings }) {
  const warnings = validateQrSettings(settings)
  if (warnings.length === 0) return null

  return (
    <div className="qr-warnings">
      {warnings.map((w) => (
        <div key={w.code} className="qr-warning-item">
          <span className="qr-warning-icon">⚠️</span>
          <span>{w.message}</span>
        </div>
      ))}
    </div>
  )
}
