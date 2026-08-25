import { LegalPage } from './LegalPage'

const sections = [
  {
    id: 'agreement',
    heading: 'Agreement to these terms',
    body: (
      <>
        <p>
          These Terms of Service ("Terms") are a binding agreement between you and Brill Brains
          Consultants ("Brill Brains", "we", "us") governing your use of Digital Card Studio — the website,
          card builder, QR Studio, and every published card page under digitalcard.brillbrainsconsultants.com
          (together, the "Service").
        </p>
        <p>
          By creating an account, publishing a card, or otherwise using the Service, you agree to these
          Terms. If you're using the Service on behalf of a business, you're confirming you have the
          authority to bind that business, and "you" below means both you and it.
        </p>
      </>
    ),
  },
  {
    id: 'eligibility',
    heading: 'Eligibility & your account',
    body: (
      <ul>
        <li>You must be at least 18 years old, or the age of majority where you live, to create an account.</li>
        <li>The information you give us at signup and in your card must be accurate — you're responsible for keeping it up to date.</li>
        <li>You're responsible for everything that happens under your account, including keeping your password confidential. Tell us immediately if you suspect unauthorized access.</li>
        <li>One account per person or business is expected; don't create accounts to evade a suspension.</li>
      </ul>
    ),
  },
  {
    id: 'the-service',
    heading: 'What the Service does',
    body: (
      <>
        <p>
          Digital Card Studio lets you build a digital business card, publish it to a shareable link, and
          generate QR codes — static (encoded permanently, works offline) or dynamic (a short link you can
          re-point after printing, with scan analytics). Free features include the card editor, drafts, and
          QR code design. Publishing a card and activating a QR code add-on are paid, recurring features —
          see <a href="/refund-policy">Refund &amp; Cancellation Policy</a> for exactly how billing works.
        </p>
        <p>
          We may add, change, or remove features over time. We'll try to give notice of changes that
          materially reduce what a paid subscription includes.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    heading: 'Acceptable use',
    body: (
      <>
        <p>You may not use the Service to:</p>
        <ul>
          <li>Publish a card or QR code that impersonates another person or business, or that's deceptive about who you are.</li>
          <li>Point a QR code at phishing pages, malware, or any destination designed to deceive or harm the person scanning it.</li>
          <li>Upload content you don't have the rights to use, or that infringes someone else's copyright, trademark, or other rights.</li>
          <li>Upload or link to content that's illegal, defamatory, obscene, or that harasses or threatens others.</li>
          <li>Attempt to bypass rate limits, probe for vulnerabilities without authorization, or otherwise interfere with the Service's normal operation.</li>
          <li>Use automated means to create accounts, scrape card data, or extract leads that weren't submitted to you.</li>
          <li>Resell or white-label the Service without a separate written agreement with us.</li>
        </ul>
        <p>
          We may remove content, suspend a card or QR code, or terminate an account that violates this
          section, with or without notice depending on severity.
        </p>
      </>
    ),
  },
  {
    id: 'your-content',
    heading: 'Your content and ownership',
    body: (
      <>
        <p>
          You own the content you put into your card — your name, photos, logo, copy, and links. By
          publishing a card, you grant us a limited license to host, store, and display that content solely
          to operate the Service (for example, serving your card page to visitors, and generating its QR
          code). We don't claim ownership of your content and won't use it for anything beyond running the
          Service, unless you separately agree otherwise.
        </p>
        <p>
          Leads your card collects belong to you. We store them so we can show them to
          you in Analytics; we don't use them for our own outreach.
        </p>
        <p>
          You're solely responsible for having the rights to anything you upload — photos, logos, and any
          third-party content — and for the accuracy of what you publish.
        </p>
      </>
    ),
  },
  {
    id: 'our-content',
    heading: 'Our intellectual property',
    body: (
      <p>
        The Service itself — its design, code, the Digital Card Studio and Brill Brains names and marks, and
        everything we build that isn't your content — belongs to Brill Brains Consultants. These Terms don't
        grant you any right to use our branding, except as needed to use the Service as intended (for
        example, the "Powered by Brill Brains" credit that appears on free-tier cards).
      </p>
    ),
  },
  {
    id: 'payments',
    heading: 'Payments & subscriptions',
    body: (
      <>
        <p>
          Publishing a digital card or activating a QR code add-on is billed at ₹1 per item per 30-day
          period, processed through Razorpay. Charges are triggered by your own action (publishing,
          activating, or resubscribing) — we don't auto-charge a saved payment method for renewal without
          you initiating it. Full detail on cancellation, what happens when a period lapses, and refund
          eligibility is in our <a href="/refund-policy">Refund &amp; Cancellation Policy</a>, which is part
          of these Terms.
        </p>
        <p>
          We may change pricing going forward; changes won't apply retroactively to a period you've already
          paid for.
        </p>
      </>
    ),
  },
  {
    id: 'termination',
    heading: 'Suspension & termination',
    body: (
      <>
        <p>
          You can stop using the Service and delete your account at any time from Settings — this
          permanently removes your cards, QR codes, and captured leads.
        </p>
        <p>
          We may suspend or terminate your access if you violate the Acceptable Use section above, if
          required by law, or if your account shows activity that puts the Service or other users at risk.
          Where practical, we'll tell you why. Suspension for cause does not entitle you to a refund of the
          current billing period.
        </p>
      </>
    ),
  },
  {
    id: 'availability',
    heading: 'Service availability',
    body: (
      <p>
        We aim to keep the Service reliably available but don't guarantee uninterrupted access — scheduled
        maintenance, third-party outages (hosting, Razorpay, Cloudinary), or unforeseen issues can cause
        downtime. A published card's QR redirect depends on our infrastructure being reachable; a static QR
        code, by contrast, works offline forever because its payload is encoded directly into the pattern.
      </p>
    ),
  },
  {
    id: 'disclaimers',
    heading: 'Disclaimers',
    body: (
      <p>
        The Service is provided "as is" and "as available." To the fullest extent the law allows, we
        disclaim warranties of any kind, express or implied, including merchantability, fitness for a
        particular purpose, and non-infringement. We don't warrant that the Service will be error-free,
        that scan analytics will be perfectly accurate, or that any particular business outcome will result
        from using a digital card or QR code.
      </p>
    ),
  },
  {
    id: 'liability',
    heading: 'Limitation of liability',
    body: (
      <p>
        To the fullest extent permitted by law, Brill Brains Consultants will not be liable for indirect,
        incidental, special, or consequential damages, or for lost profits, revenue, or data, arising from
        your use of the Service. Our total liability for any claim relating to the Service is limited to the
        amount you paid us in the 3 months before the claim arose.
      </p>
    ),
  },
  {
    id: 'indemnity',
    heading: 'Indemnification',
    body: (
      <p>
        You agree to defend and indemnify Brill Brains Consultants against claims, damages, and expenses
        arising from your content, your use of the Service in violation of these Terms, or your violation of
        someone else's rights.
      </p>
    ),
  },
  {
    id: 'governing-law',
    heading: 'Governing law & disputes',
    body: (
      <p>
        These Terms are governed by the laws of India. Any dispute arising from these Terms or the Service
        will be subject to the exclusive jurisdiction of the courts located in India. If you're a consumer
        with statutory rights that can't be limited by contract in your jurisdiction, those rights are
        unaffected.
      </p>
    ),
  },
  {
    id: 'changes',
    heading: 'Changes to these Terms',
    body: (
      <p>
        We may update these Terms as the Service evolves. We'll update the "Last updated" date above, and
        for material changes we'll notify registered users by email before the change takes effect.
        Continuing to use the Service after a change takes effect means you accept the updated Terms.
      </p>
    ),
  },
  {
    id: 'entire-agreement',
    heading: 'Entire agreement',
    body: (
      <p>
        These Terms, together with our <a href="/privacy-policy">Privacy Policy</a> and{' '}
        <a href="/refund-policy">Refund &amp; Cancellation Policy</a>, are the entire agreement between you
        and Brill Brains Consultants regarding the Service, and supersede any prior agreements on the same
        subject. If any provision is found unenforceable, the rest remains in effect.
      </p>
    ),
  },
]

export function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="26 August 2026"
      intro="The rules governing your use of Digital Card Studio, including publishing, billing, and what you can and can't do with the Service."
      sections={sections}
    />
  )
}
