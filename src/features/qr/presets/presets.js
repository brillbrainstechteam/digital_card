// Preset visual themes. Each preset is a *partial* patch merged onto the
// current QR settings — destination, logo, and size are left untouched so
// switching presets never loses the user's content.

export const BRAND_THEME_PRESET_KEY = 'brandTheme'

export const QR_PRESETS = [
  {
    key: 'classicBlack',
    label: 'Classic Black',
    patch: { foreground: '#000000', background: '#ffffff', transparentBackground: false, gradient: null },
  },
  {
    key: 'classicWhite',
    label: 'Classic White',
    patch: { foreground: '#ffffff', background: '#000000', transparentBackground: false, gradient: null },
  },
  {
    key: BRAND_THEME_PRESET_KEY,
    label: 'Brand Theme',
    // No static patch — resolved at runtime from the Digital Card's
    // extracted brand palette (see QRCustomizationPanel's onApplyBrandTheme).
    patch: null,
  },
  {
    key: 'blue',
    label: 'Blue',
    patch: { foreground: '#1d4ed8', background: '#ffffff', transparentBackground: false, gradient: null },
  },
  {
    key: 'green',
    label: 'Green',
    patch: { foreground: '#059669', background: '#ffffff', transparentBackground: false, gradient: null },
  },
  {
    key: 'dark',
    label: 'Dark',
    patch: { foreground: '#e2e8f0', background: '#0f172a', transparentBackground: false, gradient: null },
  },
  {
    key: 'gradientBlue',
    label: 'Gradient Blue',
    patch: {
      background: '#ffffff',
      transparentBackground: false,
      gradient: { type: 'linear', rotation: 45, colors: ['#1d4ed8', '#38bdf8'] },
    },
  },
  {
    key: 'gradientPurple',
    label: 'Gradient Purple',
    patch: {
      background: '#ffffff',
      transparentBackground: false,
      gradient: { type: 'linear', rotation: 45, colors: ['#7c3aed', '#c026d3'] },
    },
  },
]

export function getPreset(key) {
  return QR_PRESETS.find((p) => p.key === key) || null
}
