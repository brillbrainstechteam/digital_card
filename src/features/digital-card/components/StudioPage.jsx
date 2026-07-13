import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { defaultProfile, getVisibilityFlags } from '../data'
import { extractPaletteFromLogo, detectBackdrop, rgbToHex } from '../theme'
import { fetchCard, createCard, updateCard, uploadLogo } from '../services/api'
import { loadDraft, saveDraft, clearDraft } from '../utils/draft'
import { useHistory } from '../hooks/useHistory'
import { useToast } from '../../../context/ToastContext'
import { useAuth } from '../../../context/AuthContext'
import { createDefaultQrSettings, fetchCardQr, saveCardQr, removeCardQr, QrIntegrationPanel } from '../../qr'
import { Studio } from './Studio'
import { PublishFlowModal } from './PublishFlow/PublishFlowModal'
import { PublishProgress } from './PublishFlow/PublishProgress'
import { AuthModal } from '../../../components/AuthModal'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
  const { search } = useLocation()
  const backTo = new URLSearchParams(search).get('from') === 'qr-studio' ? '/qr-studio/codes' : null
  const toast = useToast()
  const { isAuthenticated } = useAuth()
  // No :cardId in the URL means this is the guest-accessible /create route —
  // everything is edited and saved purely in local state / localStorage
  // until the user actually publishes (see runPublishSequence below).
  const isGuest = !cardId
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(!isGuest)
  const [saveStatus, setSaveStatus] = useState({ type: 'idle', text: '' })
  const [paletteStatus, setPaletteStatus] = useState({ type: 'ready', text: 'Auto-matched' })
  const [cardSlug, setCardSlug] = useState(null)
  const [cardStatus, setCardStatus] = useState('draft')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [pendingLogoTheme, setPendingLogoTheme] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [qr, setQr] = useState(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrDraftSettings, setQrDraftSettings] = useState(null)
  const [qrSaving, setQrSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishStage, setPublishStage] = useState(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [publishFlowOpen, setPublishFlowOpen] = useState(false)
  // The real backend card id — starts out equal to the route param for an
  // existing card, or null for a guest draft until publish creates one. All
  // API calls key off this, never the raw `cardId` param, so a guest draft
  // can seamlessly become a real card mid-publish without remounting.
  const [resolvedCardId, setResolvedCardId] = useState(cardId || null)
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
    if (isGuest) {
      // No account, no backend calls — resume a saved draft if one exists,
      // otherwise start fresh. Nothing here ever touches the server.
      const draft = loadDraft()
      const loadedProfile = draft || { ...defaultProfile }
      initialProfileRef.current = loadedProfile
      savedSnapshotRef.current = JSON.stringify(loadedProfile)
      setProfile(loadedProfile)
      resetEditorProfile(loadedProfile)
      setLoading(false)
      return
    }

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

    fetchCardQr(cardId).then(setQr).catch(() => setQr(null))
  }, [cardId, isGuest])

  // Guest drafts autosave to localStorage on every change so a refresh or
  // an interruption for login never loses work.
  useEffect(() => {
    if (!isGuest || !editorProfile) return
    saveDraft(editorProfile)
  }, [isGuest, editorProfile])

  const handleSave = useCallback(async () => {
    if (!editorProfile) return

    if (isGuest) {
      // Guests have no card record to save to yet — the autosave effect
      // above already persisted this to localStorage. Just reflect it.
      saveDraft(editorProfile)
      savedSnapshotRef.current = JSON.stringify(editorProfile)
      liveEditSnapshotRef.current = null
      history.clear()
      setHasUnsavedChanges(false)
      setSaveStatus({ type: 'saved', text: 'Saved' })
      setTimeout(() => setSaveStatus((s) => s.type === 'saved' ? { type: 'idle', text: '' } : s), 2000)
      return
    }

    setSaveStatus({ type: 'saving', text: 'Saving...' })
    try {
      const updated = await updateCard(resolvedCardId, {
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
  }, [isGuest, resolvedCardId, editorProfile])

  // The actual publish work, run only once a session exists (either the
  // user was already logged in, or just finished the AuthModal). Drives
  // PublishProgress through its stages — each stage holds long enough to
  // read even when the underlying request is instant — then hands off to
  // the existing business-card/QR/cart flow.
  const runPublishSequence = useCallback(async () => {
    if (!editorProfile) return
    setPublishing(true)
    setPublishStage(0) // Saving your design...
    try {
      let id = resolvedCardId
      if (!id) {
        const created = await createCard(editorProfile.brandName || editorProfile.companyName || 'My Card')
        id = created.id
      }
      await sleep(650)
      setPublishStage(1) // Curating your customized Business Card...
      await sleep(900)
      setPublishStage(2) // Generating your branded QR Code...
      await sleep(900)
      setPublishStage(3) // Publishing your content...
      const updated = await updateCard(id, {
        title: editorProfile.brandName,
        logo_url: editorProfile.logo,
        card_data: editorProfile,
        status: 'published',
      })
      setResolvedCardId(id)
      setCardSlug(updated.slug)
      setCardStatus(updated.status)
      savedSnapshotRef.current = JSON.stringify(editorProfile)
      liveEditSnapshotRef.current = null
      history.clear()
      setHasUnsavedChanges(false)
      clearDraft()
      // Cosmetic only — swaps /create for /studio/:id in the address bar
      // without a router navigation, so nothing here remounts and the
      // in-progress publish flow is never interrupted.
      if (isGuest) window.history.replaceState(null, '', `/studio/${id}`)

      await sleep(400)
      setPublishStage(4) // Done!
      await sleep(500)
      setPublishStage(null)
      toast.success('Card published')
      setPublishFlowOpen(true)
    } catch (err) {
      setPublishStage(null)
      toast.error('Publish failed: ' + err.message)
    } finally {
      setPublishing(false)
    }
  }, [isGuest, resolvedCardId, editorProfile])

  // Guests (and anyone whose session has expired) get an auth modal instead
  // of publishing outright — the draft itself is untouched either way.
  const handlePublish = useCallback(() => {
    if (!editorProfile) return
    if (!isAuthenticated) {
      setAuthModalOpen(true)
      return
    }
    runPublishSequence()
  }, [editorProfile, isAuthenticated, runPublishSequence])

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

  // Requirement: creating a QR from a Digital Card should need zero manual
  // setup — brand colors, logo, and destination are all pre-filled from the
  // card itself. The user can still change any of it afterwards.
  function buildAutoQrSettings() {
    const base = createDefaultQrSettings()
    return {
      ...base,
      destinationType: 'digitalCard',
      destinationFields: { url: publicUrl || '' },
      foreground: editorProfile.palette?.primary || base.foreground,
      background: editorProfile.palette?.surface || base.background,
      logo: editorProfile.logo || null,
    }
  }

  // Only the "Save Contact" destination has card-derived defaults worth
  // prefilling — everything else falls back to the QR module's own blank
  // defaults (returning undefined signals "use the generic default").
  function getCardDefaultFields(type) {
    if (type === 'digitalCard') return { url: publicUrl || '' }
    if (type === 'saveContact') {
      return {
        fullName: editorProfile.personName || editorProfile.brandName || '',
        companyName: editorProfile.companyName || '',
        designation: editorProfile.designation || '',
        phone: editorProfile.phone || '',
        phone2: '',
        phone3: '',
        email: editorProfile.email || '',
        website: editorProfile.website || '',
        address: editorProfile.location || '',
      }
    }
    return undefined
  }

  function openQrModal() {
    setQrDraftSettings(qr ? qr.settings : buildAutoQrSettings())
    setQrModalOpen(true)
  }

  function closeQrModal() {
    setQrModalOpen(false)
    setQrDraftSettings(null)
  }

  async function handleSaveQr() {
    setQrSaving(true)
    try {
      const saved = await saveCardQr(resolvedCardId, qrDraftSettings)
      setQr(saved)
      toast.success('QR code saved')
      closeQrModal()
    } catch (err) {
      toast.error(err.message || 'Could not save QR code')
    } finally {
      setQrSaving(false)
    }
  }

  async function handleRemoveQr() {
    setQrSaving(true)
    try {
      await removeCardQr(resolvedCardId)
      setQr(null)
      toast.success('QR code removed')
      closeQrModal()
    } catch (err) {
      toast.error(err.message || 'Could not remove QR code')
    } finally {
      setQrSaving(false)
    }
  }

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
      <PublishProgress stage={publishStage} />
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={() => {
          setAuthModalOpen(false)
          runPublishSequence()
        }}
      />
      <PublishFlowModal
        open={publishFlowOpen}
        onClose={() => setPublishFlowOpen(false)}
        profile={editorProfile}
        cardId={resolvedCardId}
        existingQr={qr}
        onQrSaved={setQr}
      />
      {qrModalOpen && qrDraftSettings && (
        <div className="confirm-overlay" onClick={closeQrModal}>
          <div className="qr-integration-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>{qr ? 'Edit QR Code' : 'Add QR Code'}</h2>
            <p>Customize the QR code for this card. It appears automatically on the public view once saved.</p>
            <QrIntegrationPanel
              settings={qrDraftSettings}
              onSettingsChange={setQrDraftSettings}
              brandTheme={editorProfile.palette}
              getDefaultFields={getCardDefaultFields}
              onSave={handleSaveQr}
              onRemove={qr ? handleRemoveQr : undefined}
              saving={qrSaving}
              isExisting={Boolean(qr)}
            />
            <button type="button" className="secondary-button qr-integration-close" onClick={closeQrModal}>
              Close
            </button>
          </div>
        </div>
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
      hasQrCode={Boolean(qr)}
      onOpenQrCode={openQrModal}
      onPublicView={() => {
        // A temporary, session-only preview link — works for unsaved/draft
        // cards and can't be opened by anyone outside this browser tab,
        // since the data lives only in sessionStorage, never the server.
        const token = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
        try {
          sessionStorage.setItem(`bb_preview_${token}`, JSON.stringify(editorProfile))
          window.open(`/preview/${token}`, '_blank')
        } catch {
          toast.error('Could not open preview')
        }
      }}
      onSave={handleSave}
      onDiscard={handleDiscardChanges}
      publicUrl={publicUrl}
      saveStatus={saveStatus}
      cardId={resolvedCardId}
      cardStatus={cardStatus}
      onPublish={handlePublish}
      publishing={publishing}
      hasUnsavedChanges={hasUnsavedChanges}
      onUndo={history.undo}
      onRedo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          backTo={backTo}
        />
    </>
  )
}
