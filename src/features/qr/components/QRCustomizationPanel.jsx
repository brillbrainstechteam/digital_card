import { QR_PRESETS, BRAND_THEME_PRESET_KEY } from '../presets/presets'

const GRADIENT_TYPES = [
  { key: null, label: 'Solid' },
  { key: 'linear', label: 'Linear Gradient' },
  { key: 'radial', label: 'Radial Gradient' },
]

/**
 * Reusable visual-customization panel. Destination is intentionally NOT
 * handled here — this panel only knows about colors, gradients, and the
 * logo, which is exactly the subset of controls a Digital Card / Business
 * Card "QR add-on" would want to reuse as-is later.
 */
export function QRCustomizationPanel({ settings, onChange, brandTheme = null }) {
  function patch(partial) {
    onChange({ ...settings, ...partial })
  }

  function applyPreset(preset) {
    if (preset.key === BRAND_THEME_PRESET_KEY) {
      if (!brandTheme) return
      patch({
        foreground: brandTheme.primary,
        background: brandTheme.surface,
        transparentBackground: false,
        gradient: null,
      })
      return
    }
    if (preset.patch) patch(preset.patch)
  }

  function handleGradientTypeChange(type) {
    if (!type) {
      patch({ gradient: null })
      return
    }
    patch({
      gradient: {
        type,
        rotation: settings.gradient?.rotation ?? 45,
        colors: settings.gradient?.colors ?? [settings.foreground, '#38bdf8'],
      },
    })
  }

  function handleGradientColorChange(index, value) {
    const colors = [...(settings.gradient?.colors ?? [settings.foreground, '#38bdf8'])]
    colors[index] = value
    patch({ gradient: { ...settings.gradient, colors } })
  }

  function handleLogoUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => patch({ logo: String(reader.result) })
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  return (
    <div className="qr-customization-panel">
      <div className="qr-section">
        <h3 className="qr-section-title">Presets</h3>
        <div className="qr-preset-grid">
          {QR_PRESETS.map((preset) => {
            const disabled = preset.key === BRAND_THEME_PRESET_KEY && !brandTheme
            return (
              <button
                key={preset.key}
                type="button"
                className="qr-preset-btn"
                disabled={disabled}
                title={disabled ? 'Available when created from a Digital Card' : undefined}
                onClick={() => applyPreset(preset)}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
        {brandTheme && (
          <button type="button" className="primary-button qr-apply-brand-btn" onClick={() => applyPreset({ key: BRAND_THEME_PRESET_KEY })}>
            Apply Brand Theme
          </button>
        )}
      </div>

      <div className="qr-section">
        <h3 className="qr-section-title">Colors</h3>
        <label className="qr-field qr-field--inline">
          <span className="qr-field-label">Foreground</span>
          <input
            type="color"
            value={settings.foreground}
            onChange={(e) => patch({ foreground: e.target.value, gradient: null })}
          />
        </label>
        <label className="qr-field qr-field--inline">
          <span className="qr-field-label">Background</span>
          <input
            type="color"
            value={settings.background}
            disabled={settings.transparentBackground}
            onChange={(e) => patch({ background: e.target.value })}
          />
        </label>
        <label className="qr-field qr-field--checkbox">
          <input
            type="checkbox"
            checked={settings.transparentBackground}
            onChange={(e) => patch({ transparentBackground: e.target.checked })}
          />
          <span>Transparent background</span>
        </label>
      </div>

      <div className="qr-section">
        <h3 className="qr-section-title">Gradient</h3>
        <div className="qr-gradient-type-row">
          {GRADIENT_TYPES.map((g) => (
            <button
              key={g.label}
              type="button"
              className={`qr-gradient-type-btn ${(settings.gradient?.type ?? null) === g.key ? 'active' : ''}`}
              onClick={() => handleGradientTypeChange(g.key)}
            >
              {g.label}
            </button>
          ))}
        </div>
        {settings.gradient && (
          <>
            <label className="qr-field qr-field--inline">
              <span className="qr-field-label">Color 1</span>
              <input type="color" value={settings.gradient.colors[0]} onChange={(e) => handleGradientColorChange(0, e.target.value)} />
            </label>
            <label className="qr-field qr-field--inline">
              <span className="qr-field-label">Color 2</span>
              <input type="color" value={settings.gradient.colors[1]} onChange={(e) => handleGradientColorChange(1, e.target.value)} />
            </label>
            {settings.gradient.type === 'linear' && (
              <label className="qr-field">
                <span className="qr-field-label">Rotation ({settings.gradient.rotation}°)</span>
                <input
                  type="range" min={0} max={360} value={settings.gradient.rotation}
                  onChange={(e) => patch({ gradient: { ...settings.gradient, rotation: Number(e.target.value) } })}
                />
              </label>
            )}
          </>
        )}
      </div>

      <div className="qr-section">
        <h3 className="qr-section-title">Logo</h3>
        {settings.logo ? (
          <div className="qr-logo-preview-row">
            <img src={settings.logo} alt="Logo preview" className="qr-logo-thumb" />
            <button type="button" className="secondary-button" onClick={() => patch({ logo: null })}>Remove Logo</button>
          </div>
        ) : (
          <label className="qr-upload-btn">
            Upload Center Logo
            <input type="file" accept="image/*" onChange={handleLogoUpload} hidden />
          </label>
        )}
        {settings.logo && (
          <label className="qr-field">
            <span className="qr-field-label">Logo Size ({Math.round(settings.logoSizeRatio * 100)}%)</span>
            <input
              type="range" min={0.1} max={0.4} step={0.01}
              value={settings.logoSizeRatio}
              onChange={(e) => patch({ logoSizeRatio: Number(e.target.value) })}
            />
          </label>
        )}
      </div>

      <div className="qr-section">
        <h3 className="qr-section-title">Error Correction</h3>
        <select
          value={settings.errorCorrectionLevel}
          onChange={(e) => patch({ errorCorrectionLevel: e.target.value })}
        >
          <option value="L">Low</option>
          <option value="M">Medium</option>
          <option value="Q">Quartile</option>
          <option value="H">High (recommended with a logo)</option>
        </select>
      </div>
    </div>
  )
}
