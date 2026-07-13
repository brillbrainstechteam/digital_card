// Digital Cards and Business Cards share the same `cards` table. New cards
// are tagged with card_data.productType ('digital' | 'business') so each
// product's list page only shows its own cards.
//
// NOTE: this is deliberately NOT named `cardType` — that key already exists
// on the Digital Card profile itself (a professional/creative style
// selector unrelated to this) and must not be collided with.
//
// Cards created before this field existed have no productType at all.
// Since only Business Cards ever wrote a `businessCard` key into card_data,
// presence of that key is a reliable way to classify that legacy data
// without a migration; anything else defaults to Digital Card.
export function isBusinessCard(card) {
  const productType = card.card_data?.productType
  if (productType === 'business') return true
  if (productType === 'digital') return false
  return !!card.card_data?.businessCard
}

export function isDigitalCard(card) {
  return !isBusinessCard(card)
}
