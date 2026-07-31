// Public API of the QR feature module. Digital Card, Business Card, and any
// future product should import from here — never reach into
// features/qr/components|hooks|services directly — so the internal
// structure can change freely without breaking consumers.

export { QRCode } from './components/QRCode'
export { QRCustomizationPanel } from './components/QRCustomizationPanel'
export { QRWarnings } from './components/QRWarnings'
export { DestinationPicker } from './components/DestinationPicker'
export { QrIntegrationPanel } from './components/QrIntegrationPanel'
export { QrPreviewNotice } from './components/QrLockStatus'
export { QrScanRedirect } from './generator/QrScanRedirect'

export { useQrCode } from './hooks/useQrCode'
export { useQrDownload } from './hooks/useQrDownload'

export { createDefaultQrSettings, downloadQrCode, renderQrToDataUrl } from './services/qrEngine'
export {
  fetchCardQr, fetchMyQrCodes, saveCardQr, publishStandaloneQr, removeCardQr, fetchQrAnalytics, fetchOverallQrAnalytics, resolveQrScan, updateQrSlug, updateQrDestination, updateQrLifecycle, deleteQr, withDynamicQrData,
} from './services/qrApi'
export { buildDestinationValue, defaultFieldsForType, DESTINATION_TYPES } from './utils/destinations'
export { validateQrSettings, contrastRatio } from './utils/validation'
export { QR_PRESETS, BRAND_THEME_PRESET_KEY, getPreset } from './presets/presets'
export { isQrUnlocked, PREVIEW_QR_URL } from './services/qrAccess'
