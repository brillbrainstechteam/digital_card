import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Each product gets its own dedicated nav — Digital Card and Business Card
// are separate products and should never mix items in the same sidebar.
const DIGITAL_ITEMS = [
  { key: 'cards', label: 'Your Cards', path: '/dashboard' },
  { key: 'analytics', label: 'Analytics', path: '/analytics' },
  { key: 'activity', label: 'Activity', path: '/activity' },
  { key: 'settings', label: 'Settings', path: '/settings' },
]

const BUSINESS_ITEMS = [
  { key: 'business', label: 'Your Business Cards', path: '/business-cards' },
  { key: 'templates', label: 'Templates', path: '/business-cards/templates' },
  { key: 'settings', label: 'Settings', path: '/settings' },
]

const EDITOR_ITEMS = [
  { key: 'design', label: 'Design' },
  { key: 'colors', label: 'Colors' },
  { key: 'fonts', label: 'Fonts' },
]

function UnsavedChangesModal({ onSave, onDiscard, onCancel, busy }) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog unsaved-changes-dialog">
        <h2>Unsaved Changes</h2>
        <p>You have unsaved changes.<br />Would you like to save this card before leaving the editor?</p>
        <div className="confirm-actions confirm-actions--stacked">
          <button className="primary-button" type="button" onClick={onSave} disabled={busy}>
            {busy ? 'Saving...' : 'Save & Continue'}
          </button>
          <button className="danger-button" type="button" onClick={onDiscard} disabled={busy}>Discard Changes</button>
          <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export function Sidebar({
  mode,
  product = 'digital',
  activeApp,
  activeEditor,
  onEditorNav,
  hasUnsavedChanges = false,
  onSave,
  onDiscard,
}) {
  const navigate = useNavigate()
  const [pendingPath, setPendingPath] = useState(null)
  const [busy, setBusy] = useState(false)
  const appItems = product === 'business' ? BUSINESS_ITEMS : DIGITAL_ITEMS
  const appGroupLabel = product === 'business' ? 'Business Card' : 'Digital Card'

  function handleAppNav(item) {
    if (item.key === activeApp && mode === 'app') return
    if (mode === 'editor' && hasUnsavedChanges) {
      setPendingPath(item.path)
      return
    }
    navigate(item.path)
  }

  async function handleSaveAndContinue() {
    setBusy(true)
    try {
      await onSave?.()
      navigate(pendingPath)
    } finally {
      setBusy(false)
      setPendingPath(null)
    }
  }

  async function handleDiscardAndContinue() {
    setBusy(true)
    try {
      await onDiscard?.()
      navigate(pendingPath)
    } finally {
      setBusy(false)
      setPendingPath(null)
    }
  }

  return (
    <>
      {pendingPath && (
        <UnsavedChangesModal
          busy={busy}
          onSave={handleSaveAndContinue}
          onDiscard={handleDiscardAndContinue}
          onCancel={() => setPendingPath(null)}
        />
      )}
      <aside className="editor-sidebar">
        <div className="editor-sidebar-nav">
          <span className="sidebar-group-label">{appGroupLabel}</span>
          {appItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={mode === 'app' && activeApp === item.key ? 'active' : ''}
              onClick={() => handleAppNav(item)}
            >
              {item.label}
            </button>
          ))}
          {mode === 'editor' && (
            <>
              <div className="sidebar-divider" />
              <span className="sidebar-group-label">Card Editor</span>
              {EDITOR_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={activeEditor === item.key ? 'active' : ''}
                  onClick={() => onEditorNav?.(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </>
          )}
        </div>
      </aside>
    </>
  )
}
