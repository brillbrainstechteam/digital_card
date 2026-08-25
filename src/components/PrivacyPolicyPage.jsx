import { LegalPage } from './LegalPage'

const sections = [
  {
    id: 'overview',
    heading: 'Overview',
    body: (
      <>
        <p>
          Brill Brains Consultants ("Brill Brains", "we", "us") operates Digital Card Studio, a platform
          for creating digital business cards and branded QR codes, at digitalcard.brillbrainsconsultants.com
          and any card pages published under it (together, the "Service").
        </p>
        <p>
          This policy explains what we collect from you as a Service user, what we collect on your behalf
          from the visitors who view your published card, how it's used, who it's shared with, and the
          choices you have. It applies to everyone who signs up for an account, and to anyone whose contact
          details reach us through a published card (for example, by submitting a lead form).
        </p>
      </>
    ),
  },
  {
    id: 'information-we-collect',
    heading: 'Information we collect',
    body: (
      <>
        <h3>Account information</h3>
        <p>
          When you create an account we collect your name, business name, email address, phone number
          (optional), and a securely hashed password. We never store your password in plain text — it's
          hashed with bcrypt before it touches our database.
        </p>
        <h3>Card content you provide</h3>
        <p>
          Anything you add to a digital card — your name, designation, company, tagline, about text, phone
          numbers, email, social links, physical address, Wi-Fi credentials, and any photos or logos you
          upload — is stored so your card can be published and edited. This content is visible to anyone
          who opens your published card unless you choose not to include it.
        </p>
        <h3>Information from your card's visitors</h3>
        <p>
          If you enable lead capture on your card, visitors who submit the form share their name, business
          name, email, and/or phone number directly with you. We store this data on your behalf and show it
          to you in your Analytics dashboard; we do not use it for our own marketing.
        </p>
        <h3>Usage &amp; scan analytics</h3>
        <p>
          When your card is viewed or a button is clicked, and when one of your QR codes is scanned, we
          record the event together with coarse technical details — device type, browser, operating system,
          approximate country/city (derived from network information, not GPS), and the referring page. We
          do not store the visitor's raw IP address; scans are associated with a one-way hashed visitor
          identifier rather than a name.
        </p>
        <h3>Payment information</h3>
        <p>
          Payments are processed by Razorpay. We receive confirmation that a payment succeeded and a
          transaction reference — we never receive or store your card number, CVV, or UPI PIN. Razorpay's
          own privacy practices apply to the payment details you give it directly.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use-it',
    heading: 'How we use this information',
    body: (
      <ul>
        <li>To create and operate your account, and to let you build and publish digital cards and QR codes.</li>
        <li>To deliver the leads your card collects to you, and to power your Analytics dashboard.</li>
        <li>To process payments and manage your subscription (publishing a card or activating a QR code is a recurring ₹1/month charge per item — see our <a href="/refund-policy">Refund &amp; Cancellation Policy</a>).</li>
        <li>To send you service-related email — password resets, payment receipts, and important account notices. We do not send marketing email without a separate opt-in.</li>
        <li>To keep the Service secure: detecting abuse, enforcing rate limits, and investigating suspicious activity.</li>
        <li>To comply with legal obligations, such as responding to a valid legal request.</li>
      </ul>
    ),
  },
  {
    id: 'sharing',
    heading: 'How information is shared',
    body: (
      <>
        <p>We don't sell your personal data. We share it only in these situations:</p>
        <ul>
          <li><strong>With people who view your card.</strong> Anything on a published card is public by design.</li>
          <li><strong>With you, the card owner</strong> — leads captured through your card are shared with you; that's the point of the feature.</li>
          <li><strong>Service providers</strong> who process data on our behalf under contract, listed in the table below.</li>
          <li><strong>Legal reasons</strong> — if required to comply with a court order, government request, or to protect the rights, property, or safety of Brill Brains, our users, or the public.</li>
          <li><strong>Business transfers</strong> — if Brill Brains is acquired or merges with another company, your information may transfer as part of that transaction, subject to this policy continuing to apply.</li>
        </ul>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr><th>Provider</th><th>Purpose</th><th>What they receive</th></tr>
            </thead>
            <tbody>
              <tr><td>Razorpay</td><td>Payment processing</td><td>Billing name, email, and payment details you enter directly with them</td></tr>
              <tr><td>Cloudinary</td><td>Image hosting (logos, photos)</td><td>Images you upload</td></tr>
              <tr><td>Google Fonts</td><td>Typography</td><td>Standard font-request metadata (IP, user agent)</td></tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: 'cookies',
    heading: 'Cookies & local storage',
    body: (
      <p>
        We use your browser's local storage — not tracking cookies — to keep you signed in (a session token)
        and to remember in-progress work, such as an unpublished card draft or your shopping cart, so you
        don't lose it on refresh. We don't use third-party advertising or cross-site tracking cookies.
      </p>
    ),
  },
  {
    id: 'retention',
    heading: 'Data retention',
    body: (
      <p>
        We keep your account and card data for as long as your account is active. If you delete your
        account, your profile, cards, QR codes, and analytics are permanently removed from active systems.
        We retain a minimal record of payment transactions as required for accounting and tax purposes, and
        a brief record of why an account was deleted (the reason you select) to help us improve the Service —
        this record is not linked back to your deleted profile.
      </p>
    ),
  },
  {
    id: 'your-rights',
    heading: 'Your rights and choices',
    body: (
      <ul>
        <li><strong>Access &amp; correction</strong> — edit your profile and card content any time from Settings or the card editor.</li>
        <li><strong>Export</strong> — download your captured leads as CSV from the Analytics page.</li>
        <li><strong>Deletion</strong> — permanently delete your account and all associated data from Settings; this requires re-entering your password to confirm.</li>
        <li><strong>Opt out of a card's tracking</strong> — if you're a visitor and want a lead you submitted removed, contact the card owner directly, or email us and we'll relay the request.</li>
        <li><strong>Marketing email</strong> — we don't currently send marketing email; if that changes, every message will include an unsubscribe link.</li>
      </ul>
    ),
  },
  {
    id: 'security',
    heading: 'Security',
    body: (
      <p>
        We encrypt data in transit with TLS, hash passwords with bcrypt, and restrict access to production
        systems to authorized personnel. No method of transmission or storage is 100% secure, and we can't
        guarantee absolute security — but we treat every report of a vulnerability seriously. If you believe
        you've found a security issue, please email us before disclosing it publicly.
      </p>
    ),
  },
  {
    id: 'children',
    heading: "Children's privacy",
    body: (
      <p>
        The Service is intended for businesses and individuals 18 years or older. We do not knowingly
        collect information from children. If you believe a child has provided us with personal data,
        contact us and we'll remove it.
      </p>
    ),
  },
  {
    id: 'international',
    heading: 'Where your data is stored',
    body: (
      <p>
        Our servers and database are hosted in India. If you access the Service from outside India, your
        information will be transferred to and processed in India, where data protection laws may differ
        from those in your country.
      </p>
    ),
  },
  {
    id: 'changes',
    heading: 'Changes to this policy',
    body: (
      <p>
        We may update this policy as the Service evolves. Material changes will be reflected by updating the
        "Last updated" date at the top of this page, and — where the change is significant — we'll notify
        registered users by email.
      </p>
    ),
  },
]

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="25 August 2026"
      intro="How Brill Brains Consultants collects, uses, and protects information across Digital Card Studio."
      sections={sections}
    />
  )
}
