import { useEffect, useMemo, useState } from 'react'
import { createCard, updateCard, uploadImage } from '../api'
import { defaultProfile } from '../data'
import { extractPaletteFromLogo, detectBackdrop, rgbToHex } from '../theme'
import { themeFromPalette } from '../themeOptions'

const CURATION_MESSAGES = [
  'Extracting your brand colors...',
  'Creating your layout...',
  'Applying your theme...',
  'Almost ready...',
  'Finalizing your digital card...',
]

const DEFAULT_SOCIALS = [
  { platform: 'instagram', url: 'https://instagram.com' },
  { platform: 'facebook', url: 'https://facebook.com' },
  { platform: 'linkedin', url: 'https://linkedin.com' },
  { platform: 'youtube', url: 'https://youtube.com' },
  { platform: 'twitter', url: 'https://x.com' },
  { platform: 'telegram', url: 'https://telegram.org' },
]

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read this image.'))
    reader.readAsDataURL(file)
  })
}

function AssetUpload({ label, required, value, progress, error, onChange, onRemove }) {
  const [dragging, setDragging] = useState(false)
  const inputId = `upload-${label.toLowerCase().replace(/\s+/g, '-')}`
  const uploading = progress > 0 && progress < 100
  const complete = Boolean(value) && progress === 100

  function handleFiles(files) {
    const file = files?.[0]
    if (!file) return
    onChange({ target: { files: [file], value: '' } })
  }

  return (
    <div
      className={`wizard-upload ${dragging ? 'dragging' : ''} ${value ? 'has-image' : ''} ${error ? 'has-error' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        handleFiles(event.dataTransfer.files)
      }}
    >
      <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onChange} hidden />
      <label htmlFor={inputId} className="wizard-upload-dropzone">
        {value ? (
          <img src={value} alt="" />
        ) : (
          <span className="upload-icon">↑</span>
        )}
        <strong>{label}{required ? ' *' : ''}</strong>
        <span>{value ? 'Image uploaded successfully' : 'Drag and drop or click to upload'}</span>
        <small>PNG, JPG, WEBP or SVG</small>
      </label>
      {uploading && (
        <div className="wizard-progress">
          <div style={{ width: `${progress}%` }} />
        </div>
      )}
      {complete && <p className="upload-success">Uploaded</p>}
      {error && <p className="upload-error">{error}</p>}
      {value && (
        <div className="upload-actions">
          <label htmlFor={inputId} className="secondary-button">Replace Image</label>
          <button className="text-button" type="button" onClick={onRemove}>Remove Image</button>
        </div>
      )}
    </div>
  )
}

export function SetupWizard({ onCancel, onComplete, toast }) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [curationIndex, setCurationIndex] = useState(0)
  const [curationProgress, setCurationProgress] = useState(8)
  const [form, setForm] = useState({
    logo: '',
    logoPreview: '',
    profilePhoto: '',
    profilePhotoPreview: '',
    personName: '',
    designation: '',
    companyName: '',
    tagline: '',
    about: '',
    palette: defaultProfile.palette,
    theme: defaultProfile.theme,
    logoBg: defaultProfile.logoBg,
  })
  const [uploadProgress, setUploadProgress] = useState({ logo: 0, profilePhoto: 0 })
  const [uploadErrors, setUploadErrors] = useState({ logo: '', profilePhoto: '' })
  const [error, setError] = useState('')

  const extractedColors = useMemo(() => [
    form.theme.primaryButton,
    form.theme.cardBackground,
    form.theme.headingText,
  ], [form.theme])

  useEffect(() => {
    if (step !== 4) return undefined
    const interval = setInterval(() => {
      setCurationIndex((current) => Math.min(current + 1, CURATION_MESSAGES.length - 1))
      setCurationProgress((current) => Math.min(current + 22, 100))
    }, 700)
    return () => clearInterval(interval)
  }, [step])

  async function handleAsset(field, event) {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setUploadErrors((current) => ({ ...current, [field]: '' }))
    try {
      const preview = await readFile(file)
      if (field === 'logo') {
        setForm((current) => ({ ...current, logoPreview: preview, logo: preview }))
        const [palette, backdrop] = await Promise.all([
          extractPaletteFromLogo(preview),
          detectBackdrop(preview),
        ])
        setForm((current) => ({
          ...current,
          palette,
          theme: { ...current.theme, ...themeFromPalette(palette) },
          logoBg: backdrop ? rgbToHex(backdrop) : current.logoBg,
        }))
      } else {
        setForm((current) => ({ ...current, profilePhotoPreview: preview, profilePhoto: preview }))
      }

      const cloudUrl = await uploadImage(file, (progress) => {
        setUploadProgress((current) => ({ ...current, [field]: progress }))
      })
      setForm((current) => ({
        ...current,
        [field]: cloudUrl,
        [`${field}Preview`]: cloudUrl,
      }))
    } catch (err) {
      setError(err.message)
      setUploadErrors((current) => ({ ...current, [field]: err.message }))
      toast.error(err.message)
    } finally {
      event.target.value = ''
    }
  }

  function updateDetails(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateColor(field, value) {
    setForm((current) => ({
      ...current,
      palette: { ...current.palette, [field]: value },
      theme: {
        ...current.theme,
        ...(field === 'primary' ? { primaryButton: value, callButton: value, emailButton: value, whatsappButton: value, linkedinButton: value, instagramButton: value, facebookButton: value, twitterButton: value, youtubeButton: value, telegramButton: value } : {}),
        ...(field === 'surface' ? { pageBackground: value, cardBackground: value } : {}),
        ...(field === 'ink' ? { headingText: value, designationText: value, companyNameText: value, taglineText: value, locationText: value, aboutText: value, bodyText: value, footerText: value } : {}),
      },
    }))
  }

  function validateStep() {
    if (step === 1 && !form.logo) {
      setError('Business Logo is required.')
      return false
    }
    if (step === 2 && (!form.personName.trim() || !form.companyName.trim() || !form.tagline.trim() || !form.about.trim())) {
      setError('Please complete all business details.')
      return false
    }
    setError('')
    return true
  }

  function next() {
    if (validateStep()) setStep((current) => current + 1)
  }

  async function createCuratedCard() {
    if (!validateStep()) return
    setStep(4)
    setSubmitting(true)
    setError('')
    try {
      await new Promise((resolve) => setTimeout(resolve, 3300))
      const profile = {
        ...defaultProfile,
        personName: form.personName.trim(),
        designation: form.designation.trim(),
        companyName: form.companyName.trim(),
        brandName: form.personName.trim(),
        handle: form.personName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        tagline: form.tagline.trim(),
        about: form.about.trim(),
        email: '',
        phone: '',
        website: 'https://example.com',
        whatsapp: '',
        location: '',
        socials: DEFAULT_SOCIALS,
        logo: form.logo,
        logoSource: form.logo,
        coverImage: form.profilePhoto || '',
        palette: form.palette,
        theme: form.theme,
        logoBg: form.logoBg,
        branding: { ...defaultProfile.branding, poweredBy: true },
      }
      const card = await createCard(profile.personName)
      await updateCard(card.id, {
        title: profile.personName,
        logo_url: profile.logo,
        card_data: profile,
      })
      onComplete(card.id)
    } catch (err) {
      setSubmitting(false)
      setStep(3)
      setError(err.message)
      toast.error(err.message)
    }
  }

  if (step === 4) {
    return (
      <main className="wizard-curation">
        <div className="wizard-curation-box">
          <p className="eyebrow">Card setup</p>
          <h1>Curating your personalized card...</h1>
          <div className="wizard-progress wizard-progress--large">
            <div style={{ width: `${curationProgress}%` }} />
          </div>
          <p>{CURATION_MESSAGES[curationIndex]}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="setup-wizard">
      <section className="editor-section setup-wizard-card">
        <p className="eyebrow">Step {step} of 3</p>
        {step === 1 && (
          <>
            <h1>Upload Assets</h1>
            <div className="wizard-upload-grid">
              <AssetUpload
                label="Business Logo"
                required
                value={form.logoPreview}
                progress={uploadProgress.logo}
                error={uploadErrors.logo}
                onChange={(event) => handleAsset('logo', event)}
                onRemove={() => setForm((current) => ({ ...current, logo: '', logoPreview: '' }))}
              />
              <AssetUpload
                label="Profile Photo"
                value={form.profilePhotoPreview}
                progress={uploadProgress.profilePhoto}
                error={uploadErrors.profilePhoto}
                onChange={(event) => handleAsset('profilePhoto', event)}
                onRemove={() => setForm((current) => ({ ...current, profilePhoto: '', profilePhotoPreview: '' }))}
              />
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Business Details</h1>
            <div className="field-grid">
              <label className="field">
                <span>Person Name</span>
                <input value={form.personName} onChange={(event) => updateDetails('personName', event.target.value)} />
              </label>
              <label className="field">
                <span>Designation</span>
                <input value={form.designation} onChange={(event) => updateDetails('designation', event.target.value)} />
              </label>
              <label className="field">
                <span>Company Name</span>
                <input value={form.companyName} onChange={(event) => updateDetails('companyName', event.target.value)} />
              </label>
              <label className="field">
                <span>Tagline</span>
                <input value={form.tagline} onChange={(event) => updateDetails('tagline', event.target.value)} />
              </label>
              <label className="field">
                <span>About</span>
                <textarea rows={4} value={form.about} onChange={(event) => updateDetails('about', event.target.value)} />
              </label>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1>Theme Selection</h1>
            <div className="wizard-swatches">
              {extractedColors.map((color) => <span key={color} style={{ background: color }} />)}
            </div>
            <div className="palette-pickers setup-palette">
              {[
                { key: 'primary', label: 'Primary Color' },
                { key: 'surface', label: 'Card Background Color' },
                { key: 'ink', label: 'Text Color' },
              ].map(({ key, label }) => (
                <label key={key} className="color-picker-field">
                  <input type="color" value={form.palette[key]} onChange={(event) => updateColor(key, event.target.value)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </>
        )}
        {error && <p className="dashboard-error">{error}</p>}
        <div className="wizard-actions">
          <button className="secondary-button" type="button" onClick={step === 1 ? onCancel : () => setStep((current) => current - 1)}>
            Back
          </button>
          {step < 3 ? (
            <button className="primary-button" type="button" onClick={next}>Next</button>
          ) : (
            <button className="primary-button" type="button" onClick={createCuratedCard} disabled={submitting}>
              Create Card
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
