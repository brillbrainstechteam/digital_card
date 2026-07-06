import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { defaultProfile, getVisibilityFlags } from '../data'
import { extractPaletteFromLogo, detectBackdrop, rgbToHex } from '../theme'
import { fetchCard, updateCard, uploadLogo } from '../api'
import { useHistory } from '../hooks/useHistory'
import { useToast } from '../context/ToastContext'
import { Studio } from './Studio'

function ConfirmModal({ message, confirmLabel = 'OK', cancelLabel = 'Cancel', onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>{cancelLabel}</button>
          <button className="primary-button" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function profileFromCardData(card) {
  const cd = card.card_data || {}
  const cardType = cd.cardType || 'professional'
  return {
    ...defaultProfile,
    ...getVisibilityFlags(cardType),
    ...cd,
    cardType,
    personName: cd.personName || cd.brandName || card.title || defaultProfile.personName,
    companyName: cd.companyName || cd.brandName || card.title || defaultProfile.companyName,
    brandName: cd.personName || cd.brandName || card.title || defaultProfile.brandName,
    designation: cd.designation || '',
    logo: cd.logo || card.logo_url || defaultProfile.logo,
    logoSettings: { ...defaultProfile.logoSettings, ...cd.logoSettings },
    coverSettings: { ...defaultProfile.coverSettings, ...cd.coverSettings },
    theme: { ...defaultProfile.theme, ...cd.theme },
    typography: { ...defaultProfile.typography, ...cd.typography },
    branding: { ...defaultProfile.branding, ...cd.branding },
    socials: Array.isArray(cd.socials) ? cd.socials : defaultProfile.socials,
  }
}

function LogoThemeDialog({ logo, theme, onThemeChange, onCancel, onConfirm }) {
  return (
    <div className="confirm-overlay">
      <div className="logo-theme-dialog">
        <h2>Apply logo theme?</h2>
        <p>Review the detected colors before applying them to this card.</p>
        <div className="logo-theme-preview">
          <img src={logo} alt="" />
          <div className="logo-theme-colors">
            {[
              { key: 'primaryButton', label: 'Primary' },
              { key: 'cardBackground', label: 'Card Background' },
              { key: 'headingText', label: 'Text' },
            ].map(({ key, label }) => (
              <label key={key} className="logo-theme-color">
                <span>{label}</span>
                <input type="color" value={theme[key]} onChange={(event) => onThemeChange(key, event.target.value)} />
                <input value={theme[key]} onChange={(event) => onThemeChange(key, event.target.value)} />
              </label>
            ))}
          </div>
        </div>
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary-button" type="button" onClick={onConfirm}>OK</button>
        </div>
      </div>
    </div>
  )
}

export function StudioPage() {
  const { cardId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState({ type: 'idle', text: '' })
  const [paletteStatus, setPaletteStatus] = useState({ type: 'ready', text: 'Auto-matched' })
  const [cardSlug, setCardSlug] = useState(null)
  const [cardStatus, setCardStatus] = useState('draft')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [pendingLogoTheme, setPendingLogoTheme] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const initialProfileRef = useRef(null)
  const savedSnapshotRef = useRef('')
  const liveEditSnapshotRef = useRef(null)
  const editorProfileRef = useRef(null)
  const history = useHistory(profile)

  const editorProfile = history.state
  const setEditorProfile = history.set
  const resetEditorProfile = history.reset

  useEffect(() => {
    editorProfileRef.current = editorProfile
  }, [editorProfile])

  const beginLiveEdit = useCallback(() => {
    if (!liveEditSnapshotRef.current && editorProfile) {
      liveEditSnapshotRef.current = JSON.stringify(editorProfile)
    }
  }, [editorProfile])

  const setEditorProfileLive = useCallback((next) => {
    history.set(next, { commit: false })
  }, [history])

  const commitLiveEdit = useCallback(() => {
    if (!liveEditSnapshotRef.current || !editorProfileRef.current) return
    const fromSnapshot = liveEditSnapshotRef.current
    liveEditSnapshotRef.current = null
    history.set(editorProfileRef.current, { fromSnapshot })
  }, [history])

  useEffect(() => {
    setLoading(true)
    fetchCard(cardId)
      .then((card) => {
        setCardSlug(card.slug)
        setCardStatus(card.status)
        if (card.card_data && Object.keys(card.card_data).length > 0) {
          const loadedProfile = profileFromCardData(card)
          initialProfileRef.current = loadedProfile
          savedSnapshotRef.current = JSON.stringify(loadedProfile)
          setProfile(loadedProfile)
          resetEditorProfile(loadedProfile)
        } else {
          const loadedProfile = { ...defaultProfile, brandName: card.title }
          initialProfileRef.current = loadedProfile
          savedSnapshotRef.current = JSON.stringify(loadedProfile)
          setProfile(loadedProfile)
          resetEditorProfile(loadedProfile)
        }
      })
      .catch((err) => {
        toast.error(err.message)
        navigate('/dashboard', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [cardId])

  const handleSave = useCallback(async () => {
    if (!editorProfile) return
    setSaveStatus({ type: 'saving', text: 'Saving...' })
    try {
      const updated = await updateCard(cardId, {
        title: editorProfile.brandName,
        logo_url: editorProfile.logo,
        card_data: editorProfile,
      })
      setCardSlug(updated.slug)
      setCardStatus(updated.status)
      savedSnapshotRef.current = JSON.stringify(editorProfile)
      liveEditSnapshotRef.current = null
      history.clear()
      setHasUnsavedChanges(false)
      setSaveStatus({ type: 'saved', text: 'Saved' })
      setTimeout(() => setSaveStatus((s) => s.type === 'saved' ? { type: 'idle', text: '' } : s), 2000)
    } catch (err) {
      setSaveStatus({ type: 'error', text: err.message })
      toast.error('Save failed: ' + err.message)
      throw err
    }
  }, [cardId, editorProfile])

  const handleDiscardChanges = useCallback(() => {
    if (!savedSnapshotRef.current) return
    const restored = JSON.parse(savedSnapshotRef.current)
    liveEditSnapshotRef.current = null
    resetEditorProfile(restored)
    setHasUnsavedChanges(false)
  }, [resetEditorProfile])

  useEffect(() => {
    if (!editorProfile || !savedSnapshotRef.current) {
      setHasUnsavedChanges(false)
      return
    }
    setHasUnsavedChanges(JSON.stringify(editorProfile) !== savedSnapshotRef.current)
  }, [editorProfile])

  useEffect(() => {
    window.__bbHasUnsavedCardChanges = hasUnsavedChanges
    return () => { window.__bbHasUnsavedCardChanges = false }
  }, [hasUnsavedChanges])

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ''
    }

    function handleDocumentClick(event) {
      if (!hasUnsavedChanges) return
      const anchor = event.target.closest?.('a[href]')
      if (!anchor) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return
      event.preventDefault()
      setConfirmModal({
        message: 'You have unsaved changes. Save your card before leaving?',
        onConfirm: () => { setConfirmModal(null); window.location.href = anchor.href },
        onCancel: () => setConfirmModal(null),
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleDocumentClick, true)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleDocumentClick, true)
    }
  }, [hasUnsavedChanges])

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2_500_000) {
      setPaletteStatus({ type: 'error', text: 'Logo must be under 2.5 MB' })
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const localDataUrl = String(reader.result)
      setPaletteStatus({ type: 'working', text: 'Matching colors...' })
      try {
        const [palette, backdrop] = await Promise.all([
          extractPaletteFromLogo(localDataUrl),
          detectBackdrop(localDataUrl),
        ])
        setEditorProfile((cur) => ({
          ...cur,
          logo: localDataUrl,
          logoSource: localDataUrl,
          palette,
          theme: {
            ...cur.theme,
            pageBackground: palette.surface,
            cardBackground: palette.surface,
            headingText: palette.ink,
            taglineText: palette.ink,
            locationText: palette.ink,
            aboutText: palette.ink,
            bodyText: palette.ink,
            footerText: palette.ink,
            primaryButton: palette.primary,
            callButton: palette.primary,
            emailButton: palette.primary,
            whatsappButton: palette.primary,
            linkedinButton: palette.primary,
            instagramButton: palette.primary,
            facebookButton: palette.primary,
            twitterButton: palette.primary,
            youtubeButton: palette.primary,
            telegramButton: palette.primary,
            accentColor: palette.accent,
            borderColor: palette.accent,
            designationText: palette.ink,
            companyNameText: palette.ink,
          },
          logoBg: backdrop ? rgbToHex(backdrop) : null,
        }))
        setPaletteStatus({ type: 'ready', text: 'Theme auto-matched' })
      } catch (error) {
        setEditorProfile((cur) => ({ ...cur, logo: localDataUrl, logoSource: localDataUrl }))
        setPaletteStatus({ type: 'error', text: error.message })
      }

      try {
        setPaletteStatus((s) => ({ ...s, text: s.text + ' · Uploading...' }))
        const cloudUrl = await uploadLogo(file)
        setEditorProfile((cur) => ({ ...cur, logo: cloudUrl, logoSource: cloudUrl }))
        setPaletteStatus({ type: 'ready', text: 'Theme matched · Logo uploaded' })
        toast.success('Logo uploaded')
      } catch {
        setPaletteStatus((s) => ({ ...s, type: 'error', text: 'Theme matched · Upload failed' }))
        toast.error('Logo upload failed')
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function handleLogoSettingChange(field, value) {
    setEditorProfile((cur) => ({
      ...cur,
      logoSettings: { ...defaultProfile.logoSettings, ...cur.logoSettings, [field]: value },
    }))
  }

  async function handleLogoUploadWithReview(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2_500_000) {
      setPaletteStatus({ type: 'error', text: 'Logo must be under 2.5 MB' })
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const localDataUrl = String(reader.result)
      setPaletteStatus({ type: 'working', text: 'Matching colors...' })
      try {
        const [palette, backdrop] = await Promise.all([
          extractPaletteFromLogo(localDataUrl),
          detectBackdrop(localDataUrl),
        ])
        setPendingLogoTheme({
          file,
          logo: localDataUrl,
          logoSource: localDataUrl,
          palette,
          theme: {
            ...(editorProfile?.theme || defaultProfile.theme),
            pageBackground: palette.surface,
            cardBackground: palette.surface,
            headingText: palette.ink,
            taglineText: palette.ink,
            locationText: palette.ink,
            aboutText: palette.ink,
            bodyText: palette.ink,
            footerText: palette.ink,
            primaryButton: palette.primary,
            callButton: palette.primary,
            emailButton: palette.primary,
            whatsappButton: palette.primary,
            linkedinButton: palette.primary,
            instagramButton: palette.primary,
            facebookButton: palette.primary,
            twitterButton: palette.primary,
            youtubeButton: palette.primary,
            telegramButton: palette.primary,
            accentColor: palette.accent,
            borderColor: palette.accent,
            designationText: palette.ink,
            companyNameText: palette.ink,
          },
          logoBg: backdrop ? rgbToHex(backdrop) : null,
        })
        setPaletteStatus({ type: 'ready', text: 'Review detected theme' })
      } catch (error) {
        setPendingLogoTheme({
          file,
          logo: localDataUrl,
          logoSource: localDataUrl,
          palette: editorProfile?.palette || defaultProfile.palette,
          theme: editorProfile?.theme || defaultProfile.theme,
          logoBg: editorProfile?.logoBg || null,
        })
        setPaletteStatus({ type: 'error', text: error.message })
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  async function applyPendingLogoTheme() {
    if (!pendingLogoTheme) return
    const pending = pendingLogoTheme
    setPendingLogoTheme(null)

    try {
      setPaletteStatus({ type: 'working', text: 'Uploading logo...' })
      const cloudUrl = await uploadLogo(pending.file)
      setEditorProfile((cur) => ({
        ...cur,
        logo: cloudUrl,
        logoSource: cloudUrl,
        palette: pending.palette,
        theme: pending.theme,
        logoBg: pending.logoBg,
      }))
      setPaletteStatus({ type: 'ready', text: 'Theme applied - Logo uploaded' })
      toast.success('Logo uploaded')
    } catch {
      setEditorProfile((cur) => ({
        ...cur,
        logo: pending.logo,
        logoSource: pending.logo,
        palette: pending.palette,
        theme: pending.theme,
        logoBg: pending.logoBg,
      }))
      setPaletteStatus({ type: 'error', text: 'Theme applied - Upload failed' })
      toast.error('Logo upload failed')
    }
  }

  function handleCoverConfirm(dataUrl, cropSettings) {
    setEditorProfile((cur) => ({
      ...cur,
      coverImage: dataUrl,
      coverSettings: { ...defaultProfile.coverSettings, ...cur.coverSettings, ...cropSettings },
    }))
  }

  function resetSample() {
    setConfirmModal({
      message: 'Reset this card to the original setup details? Unsaved changes will be lost.',
      confirmLabel: 'Reset',
      onConfirm: () => {
        setConfirmModal(null)
        setEditorProfile(initialProfileRef.current || defaultProfile)
        setPaletteStatus({ type: 'ready', text: 'Created card restored' })
      },
      onCancel: () => setConfirmModal(null),
    })
  }

  const publicUrl = cardSlug ? `${window.location.origin}/card/${cardSlug}` : null

  if (loading || !editorProfile) {
    return (
      <main className="studio">
        <section className="editor-panel">
          <div className="studio-heading">
            <div>
              <p className="eyebrow">Card studio</p>
              <h1>Loading card...</h1>
            </div>
          </div>
          <div className="skeleton-editor">
            <div className="skeleton-line shimmer" style={{ width: '100%', height: '120px', borderRadius: '12px' }} />
            <div className="skeleton-line shimmer" style={{ width: '60%', height: '20px', marginTop: '24px' }} />
            <div className="skeleton-line shimmer" style={{ width: '80%', height: '20px', marginTop: '12px' }} />
            <div className="skeleton-line shimmer" style={{ width: '45%', height: '20px', marginTop: '12px' }} />
          </div>
        </section>
        <aside className="preview-panel">
          <div className="preview-toolbar"><span>Live preview</span></div>
          <div className="skeleton-card">
            <div className="skeleton-band shimmer" />
            <div className="skeleton-circle shimmer" />
            <div className="skeleton-line skeleton-line--title shimmer" />
            <div className="skeleton-line shimmer" />
          </div>
        </aside>
      </main>
    )
  }

  return (
    <>
      {pendingLogoTheme && (
        <LogoThemeDialog
          logo={pendingLogoTheme.logo}
          theme={pendingLogoTheme.theme}
          onThemeChange={(key, value) => {
            setPendingLogoTheme((current) => ({
              ...current,
              theme: {
                ...current.theme,
                [key]: value,
                ...(key === 'primaryButton' ? {
                  callButton: value,
                  emailButton: value,
                  whatsappButton: value,
                  linkedinButton: value,
                  instagramButton: value,
                  facebookButton: value,
                  twitterButton: value,
                  youtubeButton: value,
                  telegramButton: value,
                } : {}),
                ...(key === 'cardBackground' ? {
                  pageBackground: value,
                } : {}),
                ...(key === 'headingText' ? {
                  designationText: value,
                  companyNameText: value,
                  taglineText: value,
                  locationText: value,
                  aboutText: value,
                  bodyText: value,
                  footerText: value,
                } : {}),
              },
            }))
          }}
          onCancel={() => {
            setPendingLogoTheme(null)
            setPaletteStatus({ type: 'ready', text: 'Theme unchanged' })
          }}
          onConfirm={applyPendingLogoTheme}
        />
      )}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}
      <Studio
          profile={editorProfile}
          setProfile={setEditorProfile}
          setProfileLive={setEditorProfileLive}
          beginLiveEdit={beginLiveEdit}
          commitLiveEdit={commitLiveEdit}
      onLogoUpload={handleLogoUploadWithReview}
      onLogoSettingChange={handleLogoSettingChange}
      onCoverConfirm={handleCoverConfirm}
      paletteStatus={paletteStatus}
      onReset={resetSample}
      onPublicView={() => {
        if (hasUnsavedChanges) {
          setConfirmModal({
            message: 'You have unsaved changes. Save your card before leaving?',
            onConfirm: () => { setConfirmModal(null); if (cardSlug) window.open(`/card/${cardSlug}`, '_blank') },
            onCancel: () => setConfirmModal(null),
          })
        } else if (cardSlug) {
          window.open(`/card/${cardSlug}`, '_blank')
        }
      }}
      onSave={handleSave}
      onDiscard={handleDiscardChanges}
      publicUrl={publicUrl}
      saveStatus={saveStatus}
      cardId={cardId}
      cardStatus={cardStatus}
      hasUnsavedChanges={hasUnsavedChanges}
      onUndo={history.undo}
      onRedo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
        />
    </>
  )
}
