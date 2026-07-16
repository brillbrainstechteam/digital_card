import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCard, updateCard, fetchCard, deleteCard } from '../services/api'
import { TemplateGallery } from './TemplateGallery'
import { SetupDialog } from './SetupDialog'
import { DetailsForm } from './DetailsForm'
import { BusinessCardEditor } from './BusinessCardEditor'
import '../businessCard.css'

// Browse-first entry point: gallery (generic placeholders) -> details -> editor.
// Mirrors BusinessCardFlow's "details first" order in reverse — the card
// record itself is only created once the user commits to a template by
// entering their details.
// Steps: 'gallery' | 'setup' | 'details' | 'editor'
export function BusinessCardTemplatesPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('gallery')
  const [pendingSelection, setPendingSelection] = useState(null)
  const [profile, setProfile] = useState(null)
  const [cardId, setCardId] = useState(null)
  const [saving, setSaving] = useState(false)

  function handleSelectTemplate(templateId, setupCfg) {
    setPendingSelection({ templateId, setup: setupCfg })
    setStep('details')
  }

  function handleCustomise() {
    setStep('setup')
  }

  function handleSetupContinue(setupCfg) {
    setPendingSelection({ templateId: 'blank', setup: setupCfg })
    setStep('details')
  }

  async function handleDetailsSubmit(formProfile) {
    setSaving(true)
    try {
      const card = await createCard('Business Card', { productType: 'business' })
      await updateCard(card.id, {
        card_data: {
          productType: 'business',
          businessCard: {
            templateId: pendingSelection.templateId,
            setup: pendingSelection.setup,
            profile: formProfile,
          },
        },
      })
      setCardId(card.id)
      setProfile(formProfile)
      setStep('editor')
    } catch (err) {
      console.error('Could not start card from template', err)
      alert('Could not start this card. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Persists only — deliberately does NOT navigate, matching
  // BusinessCardFlow.handleSave. "Save Progress" should leave the user in
  // the editor; only the editor's own Back/Gallery/Exit actions navigate
  // away (they call this first via the unsaved-changes dialog when needed).
  async function handleSave(editorSnapshot) {
    try {
      // Read-then-merge rather than replacing card_data outright (same as
      // BusinessCardFlow.handleSave). A blind write would drop any field
      // this flow doesn't know about — most importantly `purchased`, which
      // can be set from the cart in another tab while this editor is open.
      const current = await fetchCard(cardId)
      const existing = current.card_data || {}
      await updateCard(cardId, {
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
    } catch (err) {
      console.error('Failed to save business card', err)
      alert('Save failed. Please try again.')
      throw err // stop the editor's post-save flow (marking saved, navigating)
    }
  }

  // This flow creates the card row eagerly in handleDetailsSubmit (unlike
  // BusinessCardFlow, which creates it lazily on first save) — so by the
  // time the editor's exit-confirmation dialog can show the 'new' scenario,
  // a real row already exists and must be deleted rather than left as an
  // orphaned blank draft. Without this, the editor's Discard button had
  // nothing to call and silently did nothing.
  async function handleDiscardNew() {
    try {
      if (cardId) await deleteCard(cardId)
    } catch (err) {
      console.error('Failed to discard unsaved business card', err)
    } finally {
      navigate('/business-cards')
    }
  }

  if (step === 'editor' && pendingSelection && profile) {
    return (
      <BusinessCardEditor
        key={pendingSelection.templateId + pendingSelection.setup.size + pendingSelection.setup.orientation}
        selection={pendingSelection}
        profile={profile}
        // This flow creates the card row up front (handleDetailsSubmit), so
        // the id always exists here — without it the editor's cart actions
        // silently no-op, since they're all guarded on cardId.
        cardId={cardId}
        onBack={() => setStep('gallery')}
        onExit={() => navigate('/business-cards')}
        onSave={handleSave}
        onDiscardNew={handleDiscardNew}
      />
    )
  }

  if (step === 'setup') {
    return (
      <SetupDialog
        onCancel={() => setStep('gallery')}
        onContinue={handleSetupContinue}
      />
    )
  }

  if (step === 'details') {
    return (
      <DetailsForm
        initialProfile={profile}
        title="Almost there"
        message="Enter your details to use this template. They'll be filled in automatically."
        submitLabel={saving ? 'Starting…' : 'Start Editing'}
        onBack={() => setStep('gallery')}
        onContinue={handleDetailsSubmit}
      />
    )
  }

  // Gallery step — generic/sample data only, no details entered yet.
  return (
    <TemplateGallery
      profile={{}}
      onBack={() => navigate('/business-cards')}
      onCustomise={handleCustomise}
      onSelectTemplate={handleSelectTemplate}
    />
  )
}
