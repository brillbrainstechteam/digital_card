// Public API of the Digital Card feature module — mirrors the barrel
// pattern used by features/qr so both product modules are consumed the
// same way from App.jsx and from each other, never via deep imports.

export { Dashboard } from './components/Dashboard'
export { StudioPage } from './components/StudioPage'
export { CreateCardPage } from './components/CreateCardPage'
export { AnalyticsPage } from './components/AnalyticsPage'
export { ActivityPage } from './components/ActivityPage'
export { PublicCard } from './components/PublicCard'
export { CardPreviewTemp } from './components/CardPreviewTemp'
export { CardPreview } from './components/CardPreview'
export { defaultProfile, getVisibilityFlags, PRESET_DEFAULTS } from './data'
