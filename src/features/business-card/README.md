# Business Card

Print-ready business card product: a details form, template gallery,
Fabric.js-based front/back editor, and a saved-card dashboard. Follows the
same feature-module pattern as `features/digital-card` and `features/qr`.

- `components/` — pages and UI (`BusinessCardsPage`, `BusinessCardFlow`,
  `BusinessCardTemplatesPage`, `BusinessCardEditor`, `DetailsForm`,
  `SetupDialog`, `TemplateGallery`, `CardPreviewScreen`).
- `services/api.js` — this feature's service-layer import surface. Business
  Card doesn't own its own backend endpoints; it re-exports the shared
  "cards" CRUD + image upload API from `features/digital-card/services/api`
  rather than every component importing Digital Card's service directly.
- `bcTemplates.js` — template definitions and Fabric drawing helpers.
- `canvasHelpers.js` — off-screen thumbnail rendering helpers.
- `businessCard.css` — feature styles.

Like Digital Card, this feature consumes `features/qr` for QR generation
rather than owning any QR logic itself (currently UI/state-only — see the
QR panel in `BusinessCardEditor`, not yet wired to the QR module).

Only `index.js`'s exports (`BusinessCardsPage`, `BusinessCardFlow`,
`BusinessCardTemplatesPage`) are consumed from outside this feature — see
`App.jsx`. Everything else is an internal implementation detail.
