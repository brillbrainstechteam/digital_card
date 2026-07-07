import { useState } from 'react'
import { ArrowRight, Upload } from 'lucide-react'
import { uploadImage } from '../api'
import { extractPaletteFromLogo, detectBackdrop, rgbToHex } from '../theme'
import { themeFromPalette } from '../themeOptions'

// Same FileReader-based preview pattern SetupWizard.jsx uses — palette
// extraction runs against this local data URL (not the eventual Cloudinary
// URL) so it never has to worry about cross-origin canvas tainting.
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read this image.'))
    reader.readAsDataURL(file)
  })
}

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
  const [palette, setPalette]     = useState(initialProfile?.palette || null)
  const [theme, setTheme]         = useState(initialProfile?.theme || null)
  const [logoBg, setLogoBg]       = useState(initialProfile?.logoBg || '')

  function update(key, val) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      // Same pattern as SetupWizard.jsx: extract brand colors from a local
      // preview immediately, then swap the URL over to the Cloudinary
      // upload once it finishes. Extraction never touches the cloud URL.
      const preview = await readFile(file)
      setLogo(preview)
      try {
        const [extractedPalette, backdrop] = await Promise.all([
          extractPaletteFromLogo(preview),
          detectBackdrop(preview),
        ])
        setPalette(extractedPalette)
        setTheme((current) => ({ ...current, ...themeFromPalette(extractedPalette) }))
        if (backdrop) setLogoBg(rgbToHex(backdrop))
      } catch (_) {
        // Logo too plain/light to detect brand colors — keep template defaults.
      }

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
      ...(palette ? { palette } : {}),
      ...(theme ? { theme } : {}),
      ...(logoBg ? { logoBg } : {}),
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
