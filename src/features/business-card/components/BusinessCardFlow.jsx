import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { fetchCard, createCard, updateCard, deleteCard } from '../services/api'
import { DetailsForm }         from './DetailsForm'
import { SetupDialog }         from './SetupDialog'
import { TemplateGallery }     from './TemplateGallery'
import { BusinessCardEditor }  from './BusinessCardEditor'
import '../businessCard.css'

// Steps: 'details' | 'gallery' | 'setup' | 'editor'
// The 'new' cardId is a routing sentinel, not a real DB id — no card row
// exists yet for it. Nothing in this flow (details form, template gallery,
// entering the editor) creates one; the DB row is only created lazily, on
// the user's first explicit Save, so cancelling out at any point before
// that never leaves a blank draft in the Business Cards list.
export function BusinessCardFlow() {
  const { cardId: routeCardId } = useParams()
  const navigate   = useNavigate()
  const location   = useLocation()
  const isNew      = routeCardId === 'new'

  // Set by whoever opened the editor (e.g. the Digital Card publish flow's
  // "Edit This Business Card"), so Back/Exit can return to that exact screen
  // instead of falling through to the Business Cards list.
  const returnTo    = location.state?.returnTo || null
  const returnLabel = location.state?.returnLabel || null

  // `reopen` tells the origin screen to restore whatever modal the user was
  // in when they left — plain navigation would land them on a bare page.
  function goBackToOrigin() {
    navigate(returnTo, { state: { reopen: returnLabel } })
  }

  const [step, setStep]       = useState('details')
  const [rawCard, setRawCard] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(isNew ? false : true)
  const [error, setError]     = useState(null)
  // The real DB id once a row exists — null for a brand-new, never-saved
  // card. Distinct from routeCardId, which stays 'new' in the URL until
  // the first save swaps it in via navigate(..., { replace: true }).
  const [dbCardId, setDbCardId] = useState(isNew ? null : routeCardId)

  const [selection, setSelection] = useState(null)

  useEffect(() => {
    if (isNew) {
      setRawCard({})
      setProfile({})
      setStep('details')
      setLoading(false)
      return
    }
    async function load() {
      try {
        const card = await fetchCard(routeCardId)
        setRawCard(card)
        const baseProfile = card.profile || card.card_data?.profile || {}

        // A purchased card's design is final — the list and preview screen
        // both hide their Edit affordances, but this guards the route
        // itself so a direct/bookmarked URL can't reopen the editor.
        const bc = card.card_data?.businessCard
        if (bc?.purchased) {
          navigate('/business-cards', { replace: true })
          return
        }

        // If a business card snapshot already exists, jump straight to editor
        if (bc?.setup && bc?.templateId) {
          setProfile(bc.profile || baseProfile)
          setSelection({
            templateId: bc.templateId,
            setup: bc.setup,
            savedFront: bc.frontJson || null,
            savedBack: bc.backJson || null,
            savedQrUpgrade: bc.qrUpgrade || null,
          })
          setStep('editor')
        } else {
          setProfile(baseProfile)
          setStep('details')
        }
      } catch {
        setError('Could not load card data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [routeCardId, isNew, navigate])

  function handleDetailsSubmit(formProfile) {
    setProfile(formProfile)
    setStep('gallery')
  }

  function handleCustomise() {
    setStep('setup')
  }

  function handleSetupContinue(setupCfg) {
    setSelection({ templateId: 'blank', setup: setupCfg })
    setStep('editor')
  }

  function handleSelectTemplate(templateId, setupCfg) {
    setSelection({ templateId, setup: setupCfg })
    setStep('editor')
  }

  // Writes the current editor state to the DB. Does NOT navigate — the
  // editor's own exit flow decides what happens after a successful save
  // (stay, go to the business cards list, go back to the gallery, etc.),
  // since a plain in-editor "Save Progress" and a "Save & Exit" triggered
  // from the unsaved-changes dialog need different follow-up navigation.
  // The DB row itself is created here, lazily, on the *first* save — not
  // when the details form or editor opens — so a card only ever exists in
  // the list once the user has actually chosen to keep it.
  async function handleSave(editorSnapshot) {
    try {
      let id = dbCardId
      let existing = {}
      if (!id) {
        const created = await createCard('Business Card', { productType: 'business' })
        id = created.id
      } else {
        const card = await fetchCard(id)
        existing = card.card_data || {}
      }
      await updateCard(id, {
        card_data: {
          ...existing,
          productType: 'business',
          businessCard: {
            ...existing.businessCard,
            ...editorSnapshot,
            profile,
            savedAt: new Date().toISOString(),
          },
        },
      })
      if (id !== dbCardId) {
        setDbCardId(id)
        navigate(`/business-card/${id}`, { replace: true })
      }
    } catch (e) {
      console.error('Failed to save business card', e)
      alert('Save failed. Please try again.')
      throw e // stop the editor's post-save flow (marking saved, navigating)
    }
  }

  // Scenario A of the exit-confirmation flow: the card was never saved. If
  // no DB row was ever created for it (the common case now that createCard
  // only runs on first save), there's nothing to delete — just leave. If
  // one does exist (e.g. an older card reached via a direct link before a
  // save completed), delete it rather than leaving a blank draft behind.
  async function handleDiscardNew() {
    try {
      if (dbCardId) await deleteCard(dbCardId)
    } catch (e) {
      console.error('Failed to discard unsaved business card', e)
    } finally {
      navigate('/business-cards')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="bc-spinner" />
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</p>
      </div>
    )
  }

  if (error || !rawCard) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: '#c0392b', fontSize: 15 }}>{error || 'Card not found.'}</p>
        <button type="button" className="secondary-button" onClick={() => navigate('/business-cards')}>
          ← Back to Business Cards
        </button>
      </div>
    )
  }

  return (
    <>
      {step === 'details' && (
        <DetailsForm
          initialProfile={profile}
          onBack={() => navigate('/business-cards')}
          onContinue={handleDetailsSubmit}
        />
      )}

      {step === 'gallery' && profile && (
        <TemplateGallery
          profile={profile}
          onBack={() => setStep('details')}
          onCustomise={handleCustomise}
          onSelectTemplate={handleSelectTemplate}
        />
      )}

      {step === 'setup' && (
        <SetupDialog
          onCancel={() => setStep('gallery')}
          onContinue={handleSetupContinue}
        />
      )}

      {step === 'editor' && selection && (
        <BusinessCardEditor
          key={selection.templateId + selection.setup.size + selection.setup.orientation}
          selection={selection}
          profile={profile}
          cardId={dbCardId}
          {...(returnTo
            // Opened from another screen: both ways out lead back there, so
            // there's no second, differently-labelled exit to offer.
            ? { onBack: goBackToOrigin, backLabel: `← Back to ${returnLabel}` }
            : { onBack: () => setStep('gallery'), onExit: () => navigate('/business-cards') })}
          onSave={handleSave}
          onDiscardNew={handleDiscardNew}
        />
      )}
    </>
  )
}
