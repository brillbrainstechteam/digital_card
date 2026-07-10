import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCard, updateCard, fetchCard } from '../api'
import { TemplateGallery } from './TemplateGallery'
import { SetupDialog } from './SetupDialog'
import { DetailsForm } from './DetailsForm'
import { BusinessCardEditor } from './features/business-cardEditor'
import './features/business-card.css'

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

  async function handleSave(editorSnapshot) {
    try {
      await updateCard(cardId, {
        card_data: {
          productType: 'business',
          businessCard: {
            ...editorSnapshot,
            profile,
            savedAt: new Date().toISOString(),
          },
        },
      })
      navigate('/business-cards')
    } catch (err) {
      console.error('Failed to save business card', err)
      alert('Save failed. Please try again.')
    }
  }

  async function handleExport() {
    try {
      const card = await fetchCard(cardId)
      const existing = card.card_data || {}
      await updateCard(cardId, {
        card_data: {
          ...existing,
          productType: 'business',
          businessCard: { ...existing.businessCard, status: 'completed' },
        },
      })
    } catch (err) {
      console.error('Failed to mark business card as completed', err)
    }
  }

  if (step === 'editor' && pendingSelection && profile) {
    return (
      <BusinessCardEditor
        key={pendingSelection.templateId + pendingSelection.setup.size + pendingSelection.setup.orientation}
        selection={pendingSelection}
        profile={profile}
        onBack={() => setStep('gallery')}
        onExit={() => navigate('/business-cards')}
        onSave={handleSave}
        onExport={handleExport}
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
