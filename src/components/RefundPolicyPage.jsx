import { LegalPage } from './LegalPage'

const sections = [
  {
    id: 'overview',
    heading: 'Overview',
    body: (
      <>
        <p>
          This policy explains how billing, cancellation, and refunds work for Digital Card Studio. It's
          written to be read alongside your account's Subscriptions view, where you can see the exact status
          and renewal date of everything you've published.
        </p>
        <div className="legal-callout">
          Creating and editing cards and QR codes is free. You're only charged when you <strong>publish</strong>{' '}
          a digital card or <strong>activate</strong> a QR code add-on.
        </div>
      </>
    ),
  },
  {
    id: 'pricing',
    heading: 'How billing works',
    body: (
      <>
        <p>
          Each published digital card and each activated QR code is billed independently, at{' '}
          <strong>₹1 per item, per 30-day billing period</strong>, charged upfront through Razorpay at the
          moment you publish or activate. There is no separate platform fee — you only ever pay for the
          specific cards and QR codes you choose to keep live.
        </p>
        <p>
          Your 30-day period runs from the date of payment. We do not auto-charge a saved card for renewal —
          each billing period is a deliberate action from your dashboard (publish, or resubscribe), so you
          always know when a charge is about to happen.
        </p>
      </>
    ),
  },
  {
    id: 'cancellation',
    heading: 'Cancelling a subscription',
    body: (
      <>
        <p>
          You can cancel a published card or an active QR code at any time from your dashboard. Cancelling:
        </p>
        <ul>
          <li>Stops it from renewing at the end of the current 30-day period.</li>
          <li><strong>Does not</strong> take it offline immediately — it stays live and fully functional for the rest of the period you already paid for.</li>
          <li>Can be undone: if you change your mind before the period ends, resubscribing restores it instantly with no new charge, using the time already remaining.</li>
        </ul>
        <p>
          Once a cancelled item's period ends, it moves to Suspended and stops resolving publicly. It is not
          deleted — republishing it later starts a fresh billing period.
        </p>
      </>
    ),
  },
  {
    id: 'refund-eligibility',
    heading: 'Refund eligibility',
    body: (
      <>
        <p>Because each charge is small and covers a defined 30-day period, our default position is:</p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr><th>Situation</th><th>Eligible for a refund?</th></tr>
            </thead>
            <tbody>
              <tr><td>Duplicate or accidental charge (e.g. double-clicked "Publish")</td><td>Yes, in full</td></tr>
              <tr><td>Payment succeeded but the card/QR failed to activate due to a fault on our side</td><td>Yes, in full</td></tr>
              <tr><td>Unauthorized transaction (not made by you or someone with access to your account)</td><td>Yes, in full — please also secure your account</td></tr>
              <tr><td>Requested within 24 hours of payment, before meaningfully using the published card</td><td>Yes, in full</td></tr>
              <tr><td>Cancelling partway through a paid 30-day period because you no longer want it</td><td>No — the item stays live for the remainder of the period instead (see Cancellation)</td></tr>
              <tr><td>Dissatisfaction with design/feature limitations after extended use</td><td>Reviewed case by case — contact support</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          We deliberately don't do prorated refunds for early cancellation, because the alternative we
          offer — keep using what you already paid for until the period naturally ends — gives you the same
          value without paperwork.
        </p>
      </>
    ),
  },
  {
    id: 'how-to-request',
    heading: 'How to request a refund',
    body: (
      <ol>
        <li>Email <a href="mailto:support@brillbrainsconsultants.com">support@brillbrainsconsultants.com</a> from the address registered on your account.</li>
        <li>Include the card or QR code name, the approximate date of payment, and the Razorpay payment ID if you have it (found in your email receipt).</li>
        <li>Briefly describe what happened — this helps us resolve it faster and, if it points to a bug, fix it for everyone.</li>
      </ol>
    ),
  },
  {
    id: 'processing',
    heading: 'Refund processing time',
    body: (
      <p>
        Approved refunds are issued to your original payment method through Razorpay within{' '}
        <strong>5–7 business days</strong> of approval. Depending on your bank or card network, it may take
        an additional 3–5 business days to reflect in your statement after Razorpay processes it. We'll
        confirm by email once the refund has been initiated on our end.
      </p>
    ),
  },
  {
    id: 'failed-payments',
    heading: 'Failed or pending payments',
    body: (
      <p>
        If a payment fails or is stuck in a pending state, the card or QR code is not activated and you are
        not charged — Razorpay only completes the charge on a successful transaction. If money was debited
        from your account but the item in Digital Card Studio still shows as unpaid after 30 minutes, contact
        us with the transaction reference and we'll investigate immediately.
      </p>
    ),
  },
  {
    id: 'contact',
    heading: 'Questions about a charge',
    body: (
      <p>
        Your Settings page shows every card and QR code you've ever paid for, its status, and its renewal
        date, so most billing questions can be answered there first. For anything else, our support team is
        one email away.
      </p>
    ),
  },
]

export function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      updated="25 August 2026"
      intro="Publishing a digital card or activating a QR code is a paid, recurring add-on billed at ₹1 per item per 30 days. Here's exactly how cancellation and refunds work."
      sections={sections}
    />
  )
}
