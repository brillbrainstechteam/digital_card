const { pool } = require('../config/database')

async function archiveAllPublishedCards(userId) {
  await pool.query(
    "UPDATE cards SET status = 'archived', updated_at = NOW() WHERE user_id = $1 AND status = 'published'",
    [userId]
  )
}

// Called when a subscription is activated or renewed.
// We do NOT auto-publish anything — the user must manually restore and publish cards.
async function onSubscriptionActivated(userId) {
  // Future: send notification, unlock premium features
}

async function onSubscriptionRenewed(userId) {
  await onSubscriptionActivated(userId)
}

// Called when a subscription is cancelled, expires, or payment fails.
// Published cards are immediately archived so their public links stop working.
// Draft and archived cards are untouched — no data is deleted.
async function onSubscriptionCancelled(userId) {
  await archiveAllPublishedCards(userId)
}

async function onSubscriptionExpired(userId) {
  await archiveAllPublishedCards(userId)
}

async function onPaymentFailed(userId) {
  await archiveAllPublishedCards(userId)
}

module.exports = {
  onSubscriptionActivated,
  onSubscriptionRenewed,
  onSubscriptionCancelled,
  onSubscriptionExpired,
  onPaymentFailed,
}
