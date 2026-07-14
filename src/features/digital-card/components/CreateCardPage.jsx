import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SetupWizard } from './SetupWizard'
import { StudioPage } from './StudioPage'
import { useToast } from '../../../context/ToastContext'
import { saveDraft } from '../utils/draft'

// Guest-accessible entry point for /create — mirrors the authenticated
// Dashboard flow (pick a type -> SetupWizard -> editor) without requiring
// an account. The wizard hands back a fully-designed profile instead of a
// server-created card id; it's stashed as the local draft and the same
// StudioPage guest mode (see StudioPage.jsx) picks it up from there. A
// Every visit starts a new setup flow. The completed wizard profile is saved
// locally before the editor mounts, so a guest can preview it and authenticate
// from Publish without losing any of the information they entered.
export function CreateCardPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [phase, setPhase] = useState('wizard')

  if (phase === 'wizard') {
    return (
      <SetupWizard
        toast={toast}
        onCancel={() => navigate('/')}
        onComplete={(_cardId, profile) => {
          if (profile) saveDraft(profile)
          setPhase('editor')
        }}
      />
    )
  }

  return <StudioPage />
}
