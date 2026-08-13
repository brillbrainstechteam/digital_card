import { DESTINATION_TYPES, defaultFieldsForType, destinationsForQrType } from '../utils/destinations'

/**
 * Presentational, fully-controlled destination selector. This is a
 * QR-Studio-only concern — when the QR module is embedded in the Digital
 * Card or Business Card editor, the destination is already known (the
 * card's own public URL) so this component is simply not rendered there.
 */
export function DestinationPicker({ type, fields, onChange, qrType = 'static' }) {
  const availableDestinations = destinationsForQrType(qrType)
  const hiddenDestinations = DESTINATION_TYPES.filter((d) => !d.supports.includes(qrType))

  function handleTypeChange(nextType) {
    onChange(nextType, defaultFieldsForType(nextType))
  }

  function handleFieldChange(field, value) {
    onChange(type, { ...fields, [field]: value })
  }

  function handlePhoneChange(index, key, value) {
    const phones = [...(fields.phones || [])]
    phones[index] = { ...phones[index], [key]: value }
    onChange(type, { ...fields, phones })
  }

  function addPhone() {
    const phones = [...(fields.phones || []), { label: '', number: '' }]
    onChange(type, { ...fields, phones })
  }

  function removePhone(index) {
    const phones = (fields.phones || []).filter((_, i) => i !== index)
    onChange(type, { ...fields, phones: phones.length ? phones : [{ label: 'Mobile', number: '' }] })
  }

  function handleWebsiteChange(index, key, value) {
    const websites = [...(fields.websites || [])]
    websites[index] = { ...websites[index], [key]: value }
    onChange(type, { ...fields, websites })
  }

  function addWebsite() {
    const websites = [...(fields.websites || []), { label: '', url: '' }]
    onChange(type, { ...fields, websites })
  }

  function removeWebsite(index) {
    const websites = (fields.websites || []).filter((_, i) => i !== index)
    onChange(type, { ...fields, websites: websites.length ? websites : [{ label: 'Website', url: '' }] })
  }

  return (
    <div className="qr-destination-picker">
      <label className="qr-field">
        <span className="qr-field-label">Destination</span>
        <select value={type} onChange={(e) => handleTypeChange(e.target.value)}>
          {availableDestinations.map((d) => (
            <option key={d.key} value={d.key}>{d.label}</option>
          ))}
        </select>
        {hiddenDestinations.length > 0 && (
          <span className="qr-field-hint">
            {hiddenDestinations.map((d) => d.label).join(' and ')}
            {hiddenDestinations.length > 1 ? ' are' : ' is'} only available on{' '}
            {qrType === 'static' ? 'dynamic' : 'static'} QR codes.
          </span>
        )}
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

      {type === 'wifi' && (
        <>
          <label className="qr-field">
            <span className="qr-field-label">Network Name (SSID)</span>
            <input
              type="text"
              placeholder="Office Wi-Fi"
              value={fields.ssid || ''}
              onChange={(e) => handleFieldChange('ssid', e.target.value)}
            />
          </label>
          <label className="qr-field">
            <span className="qr-field-label">Security</span>
            <select value={fields.security || 'WPA'} onChange={(e) => handleFieldChange('security', e.target.value)}>
              <option value="WPA">WPA / WPA2 / WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">No password</option>
            </select>
          </label>
          {fields.security !== 'nopass' && (
            <label className="qr-field">
              <span className="qr-field-label">Password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={fields.password || ''}
                onChange={(e) => handleFieldChange('password', e.target.value)}
              />
            </label>
          )}
          <label className="qr-field qr-field--checkbox">
            <input
              type="checkbox"
              checked={Boolean(fields.hidden)}
              onChange={(e) => handleFieldChange('hidden', e.target.checked)}
            />
            <span>Hidden network</span>
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
            <span className="qr-field-label">Full Name</span>
            <input
              type="text"
              placeholder="Jane Doe"
              value={fields.fullName || ''}
              onChange={(e) => handleFieldChange('fullName', e.target.value)}
            />
          </label>
          <label className="qr-field">
            <span className="qr-field-label">Company Name {fields.fullName ? '(optional)' : '— required if no name above'}</span>
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
          <div className="qr-field">
            <span className="qr-field-label">Phone Numbers</span>
            {(fields.phones || []).map((phone, index) => (
              <div className="qr-repeatable-row" key={index}>
                <input
                  type="text"
                  className="qr-repeatable-label"
                  placeholder={index === 0 ? 'Mobile' : 'Landline, Sales, WhatsApp…'}
                  value={phone.label || ''}
                  onChange={(e) => handlePhoneChange(index, 'label', e.target.value)}
                />
                <input
                  type="tel"
                  className="qr-repeatable-value"
                  placeholder="+1 555 123 4567"
                  value={phone.number || ''}
                  onChange={(e) => handlePhoneChange(index, 'number', e.target.value)}
                />
                <button
                  type="button"
                  className="qr-repeatable-remove"
                  onClick={() => removePhone(index)}
                  disabled={(fields.phones || []).length <= 1}
                  aria-label="Remove phone number"
                >
                  &times;
                </button>
              </div>
            ))}
            <button type="button" className="qr-repeatable-add" onClick={addPhone}>+ Add another number</button>
          </div>
          <label className="qr-field">
            <span className="qr-field-label">Email</span>
            <input
              type="email"
              placeholder="hello@example.com"
              value={fields.email || ''}
              onChange={(e) => handleFieldChange('email', e.target.value)}
            />
          </label>
          <div className="qr-field">
            <span className="qr-field-label">Links (optional)</span>
            {(fields.websites || []).map((site, index) => (
              <div className="qr-repeatable-row" key={index}>
                <input
                  type="text"
                  className="qr-repeatable-label"
                  placeholder="Website, Instagram, Maps…"
                  value={site.label || ''}
                  onChange={(e) => handleWebsiteChange(index, 'label', e.target.value)}
                />
                <input
                  type="text"
                  className="qr-repeatable-value"
                  placeholder="https://…"
                  value={site.url || ''}
                  onChange={(e) => handleWebsiteChange(index, 'url', e.target.value)}
                />
                <button
                  type="button"
                  className="qr-repeatable-remove"
                  onClick={() => removeWebsite(index)}
                  disabled={(fields.websites || []).length <= 1}
                  aria-label="Remove link"
                >
                  &times;
                </button>
              </div>
            ))}
            <button type="button" className="qr-repeatable-add" onClick={addWebsite}>+ Add another link</button>
          </div>
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
