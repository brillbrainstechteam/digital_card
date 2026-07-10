// Pure functions that turn a destination "type + fields" pair into the final
// string that gets encoded into the QR code. No React, no QR-library
// dependency — safe to reuse from any product (QR Studio, Digital Card,
// Business Card) and easy to unit test in isolation.

export const DESTINATION_TYPES = [
  { key: 'website', label: 'Website URL' },
  { key: 'digitalCard', label: 'Digital Card URL' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'email', label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'maps', label: 'Google Maps' },
  { key: 'saveContact', label: 'Save Contact (vCard)' },
  { key: 'custom', label: 'Custom URL' },
]

function ensureUrlScheme(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function onlyDigits(value) {
  return (value || '').replace(/[^\d+]/g, '')
}

// Escapes vCard 3.0 special characters per RFC 6350 (backslash, comma,
// semicolon, and newline must be escaped in field values).
function escapeVCardValue(value) {
  return (value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

// Builds a standards-compliant vCard 3.0 payload. Encoding the contact data
// directly (rather than linking to a webpage) is what makes iOS and Android
// show a native "Add Contact" preview immediately on scan, with no website
// needing to load.
function buildVCard(fields = {}) {
  const fullName = (fields.fullName || '').trim()
  if (!fullName) return ''

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCardValue(fullName)};;;;`,
    `FN:${escapeVCardValue(fullName)}`,
  ]
  if (fields.companyName) lines.push(`ORG:${escapeVCardValue(fields.companyName)}`)
  if (fields.designation) lines.push(`TITLE:${escapeVCardValue(fields.designation)}`)
  // Up to three phone numbers — only non-empty ones are included.
  if (fields.phone) lines.push(`TEL;TYPE=CELL,VOICE:${escapeVCardValue(onlyDigits(fields.phone))}`)
  if (fields.phone2) lines.push(`TEL;TYPE=HOME,VOICE:${escapeVCardValue(onlyDigits(fields.phone2))}`)
  if (fields.phone3) lines.push(`TEL;TYPE=WORK,VOICE:${escapeVCardValue(onlyDigits(fields.phone3))}`)
  if (fields.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(fields.email.trim())}`)
  if (fields.website) lines.push(`URL:${escapeVCardValue(ensureUrlScheme(fields.website))}`)
  if (fields.address) lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(fields.address)};;;;`)
  lines.push('END:VCARD')

  // vCard spec requires CRLF line endings for maximum reader compatibility.
  return lines.join('\r\n')
}

/**
 * @param {string} type - one of DESTINATION_TYPES keys
 * @param {object} fields - shape depends on type, see below
 *   website:      { url }
 *   digitalCard:  { url }
 *   phone:        { number }
 *   email:        { address, subject, body }
 *   whatsapp:     { number, message }
 *   maps:         { query } (address, place name, or "lat,lng")
 *   saveContact:  { fullName, companyName, designation, phone, phone2, phone3, email, website, address }
 *   custom:       { value } (used verbatim, no scheme injected)
 * @returns {string} the exact string that should be encoded into the QR
 */
export function buildDestinationValue(type, fields = {}) {
  switch (type) {
    case 'website':
    case 'digitalCard':
      return ensureUrlScheme(fields.url)
    case 'phone': {
      const digits = onlyDigits(fields.number)
      return digits ? `tel:${digits}` : ''
    }
    case 'email': {
      const address = (fields.address || '').trim()
      if (!address) return ''
      const params = new URLSearchParams()
      if (fields.subject) params.set('subject', fields.subject)
      if (fields.body) params.set('body', fields.body)
      const query = params.toString()
      return `mailto:${address}${query ? `?${query}` : ''}`
    }
    case 'whatsapp': {
      const digits = onlyDigits(fields.number).replace(/^\+/, '')
      if (!digits) return ''
      const text = fields.message ? `?text=${encodeURIComponent(fields.message)}` : ''
      return `https://wa.me/${digits}${text}`
    }
    case 'maps': {
      const query = (fields.query || '').trim()
      if (!query) return ''
      if (/^https?:\/\//i.test(query)) return query
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    }
    case 'saveContact':
      return buildVCard(fields)
    case 'custom':
      return (fields.value || '').trim()
    default:
      return ''
  }
}

export function defaultFieldsForType(type) {
  switch (type) {
    case 'website': return { url: '' }
    case 'digitalCard': return { url: '' }
    case 'phone': return { number: '' }
    case 'email': return { address: '', subject: '', body: '' }
    case 'whatsapp': return { number: '', message: '' }
    case 'maps': return { query: '' }
    case 'saveContact': return { fullName: '', companyName: '', designation: '', phone: '', phone2: '', phone3: '', email: '', website: '', address: '' }
    case 'custom': return { value: '' }
    default: return {}
  }
}
