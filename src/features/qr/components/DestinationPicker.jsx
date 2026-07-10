import { DESTINATION_TYPES, defaultFieldsForType } from '../utils/destinations'

/**
 * Presentational, fully-controlled destination selector. This is a
 * QR-Studio-only concern — when the QR module is embedded in the Digital
 * Card or Business Card editor, the destination is already known (the
 * card's own public URL) so this component is simply not rendered there.
 */
export function DestinationPicker({ type, fields, onChange }) {
  function handleTypeChange(nextType) {
    onChange(nextType, defaultFieldsForType(nextType))
  }

  function handleFieldChange(field, value) {
    onChange(type, { ...fields, [field]: value })
  }

  return (
    <div className="qr-destination-picker">
      <label className="qr-field">
        <span className="qr-field-label">Destination</span>
        <select value={type} onChange={(e) => handleTypeChange(e.target.value)}>
          {DESTINATION_TYPES.map((d) => (
            <option key={d.key} value={d.key}>{d.label}</option>
          ))}
        </select>
      </label>

      {(type === 'website' || type === 'digitalCard') && (
        <label className="qr-field">
          <span className="qr-field-label">{type === 'digitalCard' ? 'Digital Card URL' : 'Website URL'}</span>
          <input
            type="text"
            placeholder="example.com"
            value={fields.url || ''}
            onChange={(e) => handleFieldChange('url', e.target.value)}
          />
        </label>
      )}

      {type === 'phone' && (
        <label className="qr-field">
          <span className="qr-field-label">Phone Number</span>
          <input
            type="tel"
            placeholder="+1 555 123 4567"
            value={fields.number || ''}
            onChange={(e) => handleFieldChange('number', e.target.value)}
          />
        </label>
      )}

      {type === 'email' && (
        <>
          <label className="qr-field">
            <span className="qr-field-label">Email Address</span>
            <input
              type="email"
              placeholder="hello@example.com"
              value={fields.address || ''}
              onChange={(e) => handleFieldChange('address', e.target.value)}
            />
          </label>
          <label className="qr-field">
            <span className="qr-field-label">Subject (optional)</span>
            <input
              type="text"
              value={fields.subject || ''}
              onChange={(e) => handleFieldChange('subject', e.target.value)}
            />
          </label>
        </>
      )}

      {type === 'whatsapp' && (
        <>
          <label className="qr-field">
            <span className="qr-field-label">WhatsApp Number</span>
            <input
              type="tel"
              placeholder="+1 555 123 4567"
              value={fields.number || ''}
              onChange={(e) => handleFieldChange('number', e.target.value)}
            />
          </label>
          <label className="qr-field">
            <span className="qr-field-label">Prefilled Message (optional)</span>
            <input
              type="text"
              value={fields.message || ''}
              onChange={(e) => handleFieldChange('message', e.target.value)}
            />
          </label>
        </>
      )}

      {type === 'maps' && (
        <label className="qr-field">
          <span className="qr-field-label">Address or Place</span>
          <input
            type="text"
            placeholder="1600 Amphitheatre Parkway, Mountain View, CA"
            value={fields.query || ''}
            onChange={(e) => handleFieldChange('query', e.target.value)}
          />
        </label>
      )}

      {type === 'saveContact' && (
        <>
          <label className="qr-field">
            <span className="qr-field-label">Full Name *</span>
            <input
              type="text"
              placeholder="Jane Doe"
              value={fields.fullName || ''}
              onChange={(e) => handleFieldChange('fullName', e.target.value)}
            />
          </label>
          <label className="qr-field">
            <span className="qr-field-label">Company Name (optional)</span>
            <input
              type="text"
              value={fields.companyName || ''}
              onChange={(e) => handleFieldChange('companyName', e.target.value)}
            />
          </label>
          <label className="qr-field">
            <span className="qr-field-label">Designation (optional)</span>
            <input
              type="text"
              value={fields.designation || ''}
              onChange={(e) => handleFieldChange('designation', e.target.value)}
            />
          </label>
          <label className="qr-field">
            <span className="qr-field-label">Primary Number</span>
            <input
              type="tel"
              placeholder="+1 555 123 4567"
              value={fields.phone || ''}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
            />
          </label>
          <label className="qr-field">
            <span className="qr-field-label">Secondary Number (optional)</span>
            <input
              type="tel"
              placeholder="+1 555 123 4567"
              value={fields.phone2 || ''}
              onChange={(e) => handleFieldChange('phone2', e.target.value)}
            />
          </label>
          <label className="qr-field">
            <span className="qr-field-label">Office Number (optional)</span>
            <input
              type="tel"
              placeholder="+1 555 123 4567"
              value={fields.phone3 || ''}
              onChange={(e) => handleFieldChange('phone3', e.target.value)}
            />
          </label>
          <label className="qr-field">
            <span className="qr-field-label">Email</span>
            <input
              type="email"
              placeholder="hello@example.com"
              value={fields.email || ''}
              onChange={(e) => handleFieldChange('email', e.target.value)}
            />
          </label>
          <label className="qr-field">
            <span className="qr-field-label">Website (optional)</span>
            <input
              type="text"
              placeholder="example.com"
              value={fields.website || ''}
              onChange={(e) => handleFieldChange('website', e.target.value)}
            />
          </label>
          <label className="qr-field">
            <span className="qr-field-label">Address (optional)</span>
            <input
              type="text"
              value={fields.address || ''}
              onChange={(e) => handleFieldChange('address', e.target.value)}
            />
          </label>
        </>
      )}

      {type === 'custom' && (
        <label className="qr-field">
          <span className="qr-field-label">Custom URL</span>
          <input
            type="text"
            placeholder="https://..."
            value={fields.value || ''}
            onChange={(e) => handleFieldChange('value', e.target.value)}
          />
        </label>
      )}
    </div>
  )
}
