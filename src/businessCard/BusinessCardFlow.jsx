import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchCard, updateCard } from '../api'
import { DetailsForm }         from './DetailsForm'
import { SetupDialog }         from './SetupDialog'
import { TemplateGallery }     from './TemplateGallery'
import { BusinessCardEditor }  from './BusinessCardEditor'
import './businessCard.css'

// Steps: 'details' | 'gallery' | 'setup' | 'editor'
export function BusinessCardFlow() {
  const { cardId } = useParams()
  const navigate   = useNavigate()

  const [step, setStep]       = useState('details')
  const [rawCard, setRawCard] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const [selection, setSelection] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const card = await fetchCard(cardId)
        setRawCard(card)
        const baseProfile = card.profile || card.card_data?.profile || {}

        // If a business card snapshot already exists, jump straight to editor
        const bc = card.card_data?.businessCard
        if (bc?.setup && bc?.templateId) {
          setProfile(bc.profile || baseProfile)
          setSelection({
            templateId: bc.templateId,
            setup: bc.setup,
            savedFront: bc.frontJson || null,
            savedBack: bc.backJson || null,
          })
          setStep('editor')
        } else {
          setProfile(baseProfile)
          setStep('details')
        }
      } catch (e) {
        setError('Could not load card data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [cardId])

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

  async function handleSave(editorSnapshot) {
    try {
      const card = await fetchCard(cardId)
      const existing = card.card_data || {}
      await updateCard(cardId, {
        card_data: {
          ...existing,
          businessCard: {
            ...editorSnapshot,
            profile,
            savedAt: new Date().toISOString(),
          },
        },
      })
      navigate('/business-cards')
    } catch (e) {
      console.error('Failed to save business card', e)
      alert('Save failed. Please try again.')
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
          onBack={() => setStep('gallery')}
          onExit={() => navigate('/business-cards')}
          onSave={handleSave}
        />
      )}
    </>
  )
}
