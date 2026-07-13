import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SetupWizard } from './SetupWizard'
import { StudioPage } from './StudioPage'
import { useToast } from '../../../context/ToastContext'
import { loadDraft, saveDraft } from '../utils/draft'

// Guest-accessible entry point for /create — mirrors the authenticated
// Dashboard flow (pick a type -> SetupWizard -> editor) without requiring
// an account. The wizard hands back a fully-designed profile instead of a
// server-created card id; it's stashed as the local draft and the same
// StudioPage guest mode (see StudioPage.jsx) picks it up from there. A
// returning guest with an in-progress draft skips straight back into the
// editor instead of restarting the wizard.
export function CreateCardPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [phase, setPhase] = useState(() => (loadDraft() ? 'editor' : 'wizard'))

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
