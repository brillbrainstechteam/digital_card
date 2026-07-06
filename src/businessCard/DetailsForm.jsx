import { useState } from 'react'
import { ArrowRight, Upload } from 'lucide-react'
import { uploadImage } from '../api'

const FIELDS = [
  { key: 'personName',  label: 'Full Name',      placeholder: 'Your Name',           required: true },
  { key: 'designation', label: 'Designation',    placeholder: 'Your Title' },
  { key: 'companyName', label: 'Company Name',   placeholder: 'Company Name' },
  { key: 'phone',       label: 'Phone',          placeholder: '+91 XXXXX XXXXX' },
  { key: 'email',       label: 'Email',          placeholder: 'email@example.com' },
  { key: 'website',     label: 'Website',        placeholder: 'www.example.com' },
  { key: 'location',    label: 'City / Location', placeholder: 'Your City' },
]

export function DetailsForm({
  initialProfile,
  onBack,
  onContinue,
  title = 'Your Business Card Details',
  message = 'Enter the information you want on your card. You can pick a template next, and everything will already be filled in.',
  submitLabel = 'Choose a Template',
}) {
  const [values, setValues]   = useState({
    personName:  initialProfile?.personName  || '',
    designation: initialProfile?.designation || '',
    companyName: initialProfile?.companyName || '',
    phone:       initialProfile?.phone       || '',
    email:       initialProfile?.email       || '',
    website:     initialProfile?.website     || '',
    location:    initialProfile?.location    || '',
  })
  const [logo, setLogo]           = useState(initialProfile?.logo || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')

  function update(key, val) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadImage(file)
      setLogo(url)
    } catch (err) {
      setError(err.message || 'Logo upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!values.personName.trim()) {
      setError('Please enter your name.')
      return
    }
    onContinue({
      ...initialProfile,
      ...values,
      logo,
      logoSource: logo,
    })
  }

  return (
    <div className="bc-details-overlay">
      <form className="bc-details-card" onSubmit={handleSubmit}>
        <h2>{title}</h2>
        <p className="bc-dialog-sub">{message}</p>

        <div className="bc-details-logo-row">
          <label className="bc-details-logo-upload">
            {logo ? <img src={logo} alt="Logo preview" /> : <Upload size={20} color="var(--muted)" />}
            <input type="file" accept="image/*" hidden onChange={handleLogoUpload} />
          </label>
          <div>
            <div className="bc-setup-label" style={{ marginBottom: 4 }}>Logo</div>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              {uploading ? 'Uploading...' : 'Click to upload your logo (optional)'}
            </p>
          </div>
        </div>

        <div className="bc-details-grid">
          {FIELDS.map(({ key, label, placeholder, required }) => (
            <label key={key} className="bc-details-field">
              <span>{label}{required && ' *'}</span>
              <input
                className="bce-input"
                type="text"
                value={values[key]}
                placeholder={placeholder}
                onChange={(e) => update(key, e.target.value)}
              />
            </label>
          ))}
        </div>

        {error && <p className="dashboard-error">{error}</p>}

        <div className="bc-setup-footer">
          <button type="button" className="secondary-button" onClick={onBack}>
            Cancel
          </button>
          <button type="submit" className="primary-button" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {submitLabel} <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </div>
  )
}
