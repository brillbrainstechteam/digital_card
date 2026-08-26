// Pure functions that turn a destination "type + fields" pair into the final
// string that gets encoded into the QR code. No React, no QR-library
// dependency — safe to reuse from any product (QR Studio, Digital Card,
// Business Card) and easy to unit test in isolation.

// A QR is either STATIC — the payload is encoded straight into the pattern, so
// it works forever with no server, but can never be edited or tracked — or
// DYNAMIC, where the pattern encodes a short /q/:slug link we redirect, so the
// destination stays editable and every scan is counted.
export const QR_TYPES = [
  {
    key: 'static',
    label: 'Static QR',
    tagline: 'Encoded directly. Works forever, offline.',
    perks: ['Never expires', 'No internet needed to resolve', 'Wi-Fi & contact cards'],
    limits: ['Cannot be edited once printed', 'No scan analytics'],
  },
  {
    key: 'dynamic',
    label: 'Dynamic QR',
    tagline: 'Short link you can re-point any time.',
    perks: ['Change the destination after printing', 'Scan analytics', 'Same code forever'],
    limits: ['Needs an active subscription', 'Requires internet to resolve'],
  },
]

// Which destination types each QR type can encode.
//   static  — anything that can live entirely inside the QR payload.
//   dynamic — anything a short URL can redirect to. A redirect cannot join a
//             Wi-Fi network or hand a .vcf back to the camera app, so those
//             two are static-only. Digital Card is a hosted URL we own, so it
//             is dynamic-only (a static copy could never be re-pointed).
export const DESTINATION_TYPES = [
  { key: 'website',      label: 'Website URL',           supports: ['static', 'dynamic'] },
  { key: 'catalogue',    label: 'Catalogue / Brochure',  supports: ['static', 'dynamic'] },
  { key: 'digitalCard',  label: 'Digital Card URL',      supports: ['dynamic'] },
  { key: 'phone',        label: 'Phone Number',          supports: ['static', 'dynamic'] },
  { key: 'email',        label: 'Email',                 supports: ['static', 'dynamic'] },
  { key: 'whatsapp',     label: 'WhatsApp',              supports: ['static', 'dynamic'] },
  { key: 'wifi',         label: 'Wi-Fi Network',         supports: ['static'] },
  { key: 'maps',         label: 'Google Maps',           supports: ['static', 'dynamic'] },
  { key: 'saveContact',  label: 'Save Contact (vCard)',  supports: ['static'] },
  { key: 'custom',       label: 'Custom URL',            supports: ['static', 'dynamic'] },
]

export function destinationsForQrType(qrType) {
  const type = qrType === 'dynamic' ? 'dynamic' : 'static'
  return DESTINATION_TYPES.filter((d) => d.supports.includes(type))
}

export function destinationSupports(destinationType, qrType) {
  const entry = DESTINATION_TYPES.find((d) => d.key === destinationType)
  if (!entry) return false
  return entry.supports.includes(qrType === 'dynamic' ? 'dynamic' : 'static')
}

// When switching QR type, keep the current destination if it is still legal,
// otherwise fall back to the first one that type can encode.
export function coerceDestinationForQrType(destinationType, qrType) {
  if (destinationSupports(destinationType, qrType)) return destinationType
  return destinationsForQrType(qrType)[0]?.key || 'website'
}

// Only ever produces an http(s) URL. This previously returned ANY value that
// already carried a scheme, so a "website" destination of "javascript:alert(1)"
// passed through untouched and was handed to window.location.replace().
function ensureUrlScheme(value) {
  const sanitized = sanitizeCustomValue(value)
  if (!sanitized) return ''
  return /^https?:/i.test(sanitized) ? sanitized : ''
}

function onlyDigits(value) {
  return (value || '').replace(/[^\d+]/g, '')
}

function escapeWifiValue(value) {
  return String(value || '').replace(/([\\;,:"])/g, '\\$1')
}

function buildWifi(fields = {}) {
  const ssid = String(fields.ssid || '').trim()
  if (!ssid) return ''
  const security = ['WPA', 'WEP', 'nopass'].includes(fields.security) ? fields.security : 'WPA'
  const password = security === 'nopass' ? '' : escapeWifiValue(fields.password)
  return `WIFI:T:${security};S:${escapeWifiValue(ssid)};P:${password};H:${fields.hidden ? 'true' : 'false'};;`
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

// Labels that map cleanly to a native phone category on every platform.
const STANDARD_PHONE_LABELS = new Set([
  '', 'mobile', 'cell', 'phone', 'home', 'work', 'office', 'landline', 'main', 'fax', 'pager', 'personal', 'other',
])

function phoneVcardTypes(label) {
  const value = String(label || '').toLowerCase()
  if (['landline', 'office', 'work', 'department', 'sales', 'marketing'].some((k) => value.includes(k))) return 'WORK,VOICE'
  if (['home', 'personal'].some((k) => value.includes(k))) return 'HOME,VOICE'
  return 'CELL,VOICE'
}

// Turns any custom label into a single safe TYPE token: strips characters
// that would break vCard parameter parsing (comma splits values, semicolon
// or colon end the param, backslash escapes), keeps spaces so it stays readable.
function phoneTypeToken(label) {
  return String(label || '').replace(/[,;:\\]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40)
}

// Known label -> standard TYPE (native category dropdown on every device).
// Custom label (a name, role, anything) -> the exact text as TYPE, so
// Android's quick "Add to contacts" shows it as the label; the X-ABLabel
// line below carries the same text for iOS/Google Contacts either way.
function phoneTypeParam(label) {
  const lower = String(label || '').trim().toLowerCase()
  if (STANDARD_PHONE_LABELS.has(lower)) return `TYPE=${phoneVcardTypes(label)}`
  const token = phoneTypeToken(label)
  return token ? `TYPE=${token}` : `TYPE=${phoneVcardTypes(label)}`
}

// Splits a full name into vCard N: components (last;first;middle). Needed
// because iOS/Android read the structured N: field, not just FN:, when
// deciding how to file a contact under First/Last name search.
function nameParts(fullName) {
  const display = String(fullName || '').trim()
  const parts = display.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { display, first: display, middle: '', last: '' }
  if (parts.length === 2) return { display, first: parts[0], middle: '', last: parts[1] }
  return { display, first: parts.slice(0, -2).join(' '), middle: parts[parts.length - 2], last: parts[parts.length - 1] }
}

// Builds a standards-compliant vCard 3.0 payload. Encoding the contact data
// directly (rather than linking to a webpage) is what makes iOS and Android
// show a native "Add Contact" preview immediately on scan, with no website
// needing to load. Supports multiple phones/websites, each with its own
// label, using the grouped item.TEL/item.X-ABLabel convention so custom
// labels survive on iOS while every number still imports on Android/Samsung
// (which drop any TEL with no recognizable TYPE).
function buildVCard(fields = {}) {
  const fullName = String(fields.fullName || '').trim()
  const companyName = String(fields.companyName || '').trim()
  if (!fullName && !companyName) return ''

  const name = nameParts(fullName || companyName)
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCardValue(name.last)};${escapeVCardValue(name.first)};${escapeVCardValue(name.middle)};;`,
    `FN:${escapeVCardValue(name.display)}`,
  ]

  if (companyName) {
    lines.push(`ORG:${escapeVCardValue(companyName)}`)
    // No personal name — this card represents the company itself. iOS reads
    // this to file the card under the company name, not "person at company".
    if (!fullName) lines.push('X-ABShowAs:COMPANY')
  }
  if (fields.designation) lines.push(`TITLE:${escapeVCardValue(fields.designation)}`)

  let itemIndex = 1
  // Capped at 5 regardless of caller — enforced here too since this is the
  // one place both static and dynamic saveContact payloads funnel through.
  const phones = (Array.isArray(fields.phones) ? fields.phones : []).slice(0, 5)
  phones.forEach((entry) => {
    const number = onlyDigits(entry?.number)
    if (!number) return
    const label = String(entry?.label || '').trim() || 'Mobile'
    const item = `item${itemIndex}`
    itemIndex += 1
    lines.push(`${item}.TEL;${phoneTypeParam(label)}:${escapeVCardValue(number)}`)
    lines.push(`${item}.X-ABLabel:${escapeVCardValue(label)}`)
  })

  if (fields.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(fields.email.trim())}`)

  const websites = Array.isArray(fields.websites) ? fields.websites : []
  websites.forEach((entry) => {
    const url = ensureUrlScheme(entry?.url)
    if (!url) return
    const label = String(entry?.label || '').trim() || 'Website'
    const item = `item${itemIndex}`
    itemIndex += 1
    // Plain URL + grouped X-ABLabel — NO TYPE= param. Both iOS and Google
    // Contacts read the grouped X-ABLabel to show the custom link label.
    // Adding a TYPE= with a non-standard value (e.g. "Google Maps") makes
    // Google Contacts fall back to its default "Website" label and ignore
    // X-ABLabel entirely, so every link shows as "Website".
    lines.push(`${item}.URL:${escapeVCardValue(url)}`)
    lines.push(`${item}.X-ABLabel:${escapeVCardValue(label)}`)
  })

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
 *   wifi:         { ssid, security, password, hidden }
 *   maps:         { query } (address, place name, or "lat,lng")
 *   saveContact:  { fullName, companyName, designation, phones: [{ label, number }], email, websites: [{ label, url }], address }
 *   custom:       { value } (used verbatim, no scheme injected)
 * @returns {string} the exact string that should be encoded into the QR
 */

// Schemes a QR may encode. `custom` used to be returned verbatim, so a
// signed-up user could point a code on our own domain at a "javascript:" URL
// -- which the scan page feeds straight to window.location.replace() -- or at
// an arbitrary phishing target wearing our branding. Anything off this list is
// rejected; a bare host is upgraded to https rather than silently trusted.
const ALLOWED_CUSTOM_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:', 'sms:', 'geo:', 'upi:']

export function sanitizeCustomValue(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''

  // Drop control characters before parsing. Browsers ignore them inside a
  // scheme, so a value like "java<newline>script:alert(1)" would slip past a
  // naive prefix check while still executing.
  const cleaned = Array.from(value)
    .filter((ch) => {
      const code = ch.charCodeAt(0)
      return code > 31 && code !== 127
    })
    .join('')

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(cleaned)

  try {
    const url = new URL(hasScheme ? cleaned : `https://${cleaned}`)
    if (!ALLOWED_CUSTOM_SCHEMES.includes(url.protocol.toLowerCase())) return ''
    return url.toString()
  } catch {
    return ''
  }
}

export function buildDestinationValue(type, fields = {}) {
  switch (type) {
    case 'website':
    case 'catalogue':
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
    case 'wifi':
      return buildWifi(fields)
    case 'maps': {
      const query = (fields.query || '').trim()
      if (!query) return ''
      if (/^https?:\/\//i.test(query)) return query
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    }
    case 'saveContact':
      return buildVCard(fields)
    case 'custom':
      return sanitizeCustomValue(fields.value)
    default:
      return ''
  }
}

export function defaultFieldsForType(type) {
  switch (type) {
    case 'website': return { url: '' }
    case 'catalogue': return { url: '' }
    case 'digitalCard': return { url: '' }
    case 'phone': return { number: '' }
    case 'email': return { address: '', subject: '', body: '' }
    case 'whatsapp': return { number: '', message: '' }
    case 'wifi': return { ssid: '', security: 'WPA', password: '', hidden: false }
    case 'maps': return { query: '' }
    case 'saveContact':
      return {
        fullName: '',
        companyName: '',
        designation: '',
        phones: [{ label: 'Mobile', number: '' }],
        email: '',
        websites: [{ label: 'Website', url: '' }],
        address: '',
      }
    case 'custom': return { value: '' }
    default: return {}
  }
}
