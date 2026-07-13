// Business Card doesn't own its own backend endpoints — it shares the
// generic "cards" CRUD + image upload API with Digital Card. Re-exported
// here (rather than importing '../../digital-card/services/api' directly
// throughout this feature) so Business Card has its own service-layer
// import surface, consistent with how every other feature in this app
// only ever imports from its own services/ or index.
export {
  fetchCards,
  fetchCard,
  createCard,
  updateCard,
  deleteCard,
  uploadImage,
} from '../../digital-card/services/api'
