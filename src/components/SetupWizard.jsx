import { useEffect, useMemo, useState } from 'react'
import { createCard, updateCard, uploadImage } from '../api'
import { defaultProfile, PRESET_DEFAULTS, getVisibilityFlags, ABOUT_MAX_LENGTH } from '../data'
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
  { platform: 'linkedin', url: 'https://linkedin.com' },
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

const PRESET_INFO = {
  personal: { label: 'Personal', desc: 'Photo, name, designation & social links', icon: '👤' },
  professional: { label: 'Professional', desc: 'Logo, photo, name, company & full details', icon: '💼' },
  business: { label: 'Business', desc: 'Logo & company branding focused', icon: '🏢' },
}

function getWizardSteps(cardType) {
  if (cardType === 'personal') return ['assets_photo', 'details_personal', 'theme']
  if (cardType === 'business') return ['assets_logo', 'details_business', 'theme']
  return ['assets_both', 'details_personal', 'details_business', 'theme']
}

export function SetupWizard({ onCancel, onComplete, toast }) {
  const [cardType, setCardType] = useState(null)
  const [step, setStep] = useState(0)
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
    location: '',
    palette: defaultProfile.palette,
    theme: defaultProfile.theme,
    logoBg: defaultProfile.logoBg,
    logoSettings: defaultProfile.logoSettings,
  })

  const wizardSteps = cardType ? getWizardSteps(cardType) : []
  const totalSteps = wizardSteps.length
  const currentStepId = wizardSteps[step - 1]
  const [uploadProgress, setUploadProgress] = useState({ logo: 0, profilePhoto: 0 })
  const [uploadErrors, setUploadErrors] = useState({ logo: '', profilePhoto: '' })
  const [error, setError] = useState('')

  const extractedColors = useMemo(() => [
    form.theme.primaryButton,
    form.theme.cardBackground,
    form.theme.headingText,
  ], [form.theme])

  const curationStep = totalSteps + 1
  useEffect(() => {
    if (step !== curationStep) return undefined
    const interval = setInterval(() => {
      setCurationIndex((current) => Math.min(current + 1, CURATION_MESSAGES.length - 1))
      setCurationProgress((current) => Math.min(current + 22, 100))
    }, 700)
    return () => clearInterval(interval)
  }, [step, curationStep])

  async function handleAsset(field, event) {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setUploadErrors((current) => ({ ...current, [field]: '' }))
    try {
      const preview = await readFile(file)
      let uploadSource = file
      if (field === 'logo') {
        setForm((current) => ({ ...current, logoPreview: preview, logo: preview }))
        const [palette, backdrop] = await Promise.all([
          extractPaletteFromLogo(preview),
          detectBackdrop(preview),
        ])
        setForm((current) => ({
          ...current,
          logo: preview,
          logoPreview: preview,
          palette,
          theme: { ...current.theme, ...themeFromPalette(palette) },
          logoBg: backdrop ? rgbToHex(backdrop) : current.logoBg,
        }))
      } else {
        setForm((current) => ({ ...current, profilePhotoPreview: preview, profilePhoto: preview }))
      }

      const cloudUrl = await uploadImage(uploadSource, (progress) => {
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
    if (currentStepId === 'assets_both' && !form.logo) {
      setError('Business Logo is required.')
      return false
    }
    if (currentStepId === 'assets_logo' && !form.logo) {
      setError('Business Logo is required.')
      return false
    }
    if (currentStepId === 'details_personal' && !form.personName.trim()) {
      setError('Person Name is required.')
      return false
    }
    if (currentStepId === 'details_business' && (!form.companyName.trim() || !form.tagline.trim())) {
      setError('Company Name and Tagline are required.')
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
    setStep(curationStep)
    setSubmitting(true)
    setError('')
    try {
      await new Promise((resolve) => setTimeout(resolve, 3300))
      const flags = getVisibilityFlags(cardType)
      const titleName = form.personName.trim() || form.companyName.trim()
      const profile = {
        ...defaultProfile,
        ...flags,
        cardType,
        personName: form.personName.trim(),
        designation: form.designation.trim(),
        companyName: form.companyName.trim(),
        brandName: titleName,
        handle: titleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        tagline: form.tagline.trim(),
        about: form.about.trim(),
        email: '',
        phone: '',
        website: 'https://example.com',
        whatsapp: '',
        location: form.location.trim(),
        socials: DEFAULT_SOCIALS,
        logo: form.logo,
        logoSource: form.logo,
        coverImage: form.profilePhoto || '',
        palette: form.palette,
        theme: form.theme,
        logoBg: form.logoBg,
        logoSettings: form.logoSettings,
        branding: { ...defaultProfile.branding, poweredBy: true },
      }
      const card = await createCard(titleName)
      await updateCard(card.id, {
        title: titleName,
        logo_url: profile.logo,
        // productType distinguishes Digital Cards from Business Cards (which
        // share the same `cards` table) so each product's dashboard only
        // ever lists its own cards. NOTE: this is deliberately NOT named
        // `cardType` — that key already exists on the digital-card profile
        // itself (professional/creative style selector) and must not be
        // overwritten.
        card_data: { ...profile, productType: 'digital' },
      })
      onComplete(card.id)
    } catch (err) {
      setSubmitting(false)
      setStep(totalSteps)
      setError(err.message)
      toast.error(err.message)
    }
  }

  if (step === curationStep) {
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

  if (step === 0) {
    return (
      <main className="setup-wizard">
        <section className="editor-section setup-wizard-card">
          <p className="eyebrow">Card Setup</p>
          <h1>What type of card are you creating?</h1>
          <div className="preset-selector preset-selector--wizard">
            {Object.entries(PRESET_INFO).map(([key, info]) => (
              <button
                key={key}
                type="button"
                className={`preset-card ${cardType === key ? 'preset-card--active' : ''}`}
                onClick={() => setCardType(key)}
              >
                <span className="preset-card-icon">{info.icon}</span>
                <strong>{info.label}</strong>
                <span className="preset-card-desc">{info.desc}</span>
              </button>
            ))}
          </div>
          {error && <p className="dashboard-error">{error}</p>}
          <div className="wizard-actions">
            <button className="secondary-button" type="button" onClick={onCancel}>Back</button>
            <button className="primary-button" type="button" onClick={() => {
              if (!cardType) { setError('Please select a card type.'); return }
              setError('')
              setStep(1)
            }}>Next</button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="setup-wizard">
      <section className="editor-section setup-wizard-card">
        <p className="eyebrow">Step {step} of {totalSteps}</p>

        {currentStepId === 'assets_both' && (
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

        {currentStepId === 'assets_photo' && (
          <>
            <h1>Upload Profile Photo</h1>
            <div className="wizard-upload-grid">
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

        {currentStepId === 'assets_logo' && (
          <>
            <h1>Upload Business Logo</h1>
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
            </div>
          </>
        )}

        {currentStepId === 'details_personal' && (
          <>
            <h1>Personal Details</h1>
            <div className="field-grid">
              <label className="field">
                <span>Person Name *</span>
                <input value={form.personName} onChange={(event) => updateDetails('personName', event.target.value)} />
              </label>
              <label className="field">
                <span>Designation</span>
                <input value={form.designation} onChange={(event) => updateDetails('designation', event.target.value)} />
              </label>
              <label className="field">
                <span>Location</span>
                <input value={form.location} onChange={(event) => updateDetails('location', event.target.value)} />
              </label>
              {cardType === 'personal' && (
                <>
                  <label className="field">
                    <span>Tagline</span>
                    <input value={form.tagline} onChange={(event) => updateDetails('tagline', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>About</span>
                    <textarea rows={4} maxLength={ABOUT_MAX_LENGTH} value={form.about} onChange={(event) => updateDetails('about', event.target.value.slice(0, ABOUT_MAX_LENGTH))} />
                    <span className="field-char-counter">{form.about.length} / {ABOUT_MAX_LENGTH}</span>
                  </label>
                </>
              )}
            </div>
          </>
        )}

        {currentStepId === 'details_business' && (
          <>
            <h1>Business Details</h1>
            <div className="field-grid">
              <label className="field">
                <span>Company Name *</span>
                <input value={form.companyName} onChange={(event) => updateDetails('companyName', event.target.value)} />
              </label>
              <label className="field">
                <span>Tagline *</span>
                <input value={form.tagline} onChange={(event) => updateDetails('tagline', event.target.value)} />
              </label>
              {cardType === 'business' && (
                <label className="field">
                  <span>Location</span>
                  <input value={form.location} onChange={(event) => updateDetails('location', event.target.value)} />
                </label>
              )}
              <label className="field">
                <span>About</span>
                <textarea rows={4} maxLength={ABOUT_MAX_LENGTH} value={form.about} onChange={(event) => updateDetails('about', event.target.value.slice(0, ABOUT_MAX_LENGTH))} />
                <span className="field-char-counter">{form.about.length} / {ABOUT_MAX_LENGTH}</span>
              </label>
            </div>
          </>
        )}

        {currentStepId === 'theme' && (
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
          <button className="secondary-button" type="button" onClick={step === 1 ? () => setStep(0) : () => setStep((current) => current - 1)}>
            Back
          </button>
          {step < totalSteps ? (
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
