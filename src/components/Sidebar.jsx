import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const APP_ITEMS = [
  { key: 'cards', label: 'Digital Cards', path: '/dashboard' },
  { key: 'analytics', label: 'Analytics', path: '/analytics' },
  { key: 'activity', label: 'Activity', path: '/activity' },
  { key: 'settings', label: 'Settings', path: '/settings' },
]

const QR_APP_ITEMS = [
  { key: 'qrstudio', label: 'QR Studio', path: '/qr-studio' },
  { key: 'qrcodes', label: 'My QR Codes', path: '/qr-studio/codes' },
  { key: 'settings', label: 'Settings', path: '/settings' },
]

const BUSINESS_ITEMS = [
  { key: 'business', label: 'Your Business Cards', path: '/business-cards' },
  { key: 'templates', label: 'Templates', path: '/business-cards/templates' },
  { key: 'settings', label: 'Settings', path: '/settings' },
]

const EDITOR_ITEMS = [
  { key: 'design', label: 'Design' },
  { key: 'buttons', label: 'Button Settings' },
  { key: 'social', label: 'Social Links' },
  { key: 'settings', label: 'Logo Settings' },
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
  section = 'cards',
  product = 'digital',
  activeApp,
  activeEditor,
  onEditorNav,
  hasUnsavedChanges = false,
  onSave,
  onDiscard,
  backTo = null,
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pendingPath, setPendingPath] = useState(null)
  const [busy, setBusy] = useState(false)

  const appItems = section === 'qr'
    ? QR_APP_ITEMS
    : product === 'business'
      ? BUSINESS_ITEMS
      : APP_ITEMS
  const appGroupLabel = section === 'qr'
    ? 'QR Studio'
    : product === 'business'
      ? 'Business Card'
      : 'Digital Card'
  const backItem = product === 'business'
    ? { label: 'Business Cards', path: '/business-cards' }
    : { label: 'Digital Cards', path: '/dashboard' }

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
          {mode === 'editor' ? (
            <>
              <span className="sidebar-group-label">Application</span>
              <button type="button" onClick={() => handleAppNav(backItem)}>
                &larr; {backItem.label}
              </button>
              {backTo && (
                <button type="button" onClick={() => handleAppNav({ path: backTo })}>
                  &larr; QR Studio
                </button>
              )}
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
          ) : (
            <>
              <span className="sidebar-group-label">{appGroupLabel}</span>
              {appItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={activeApp === item.key ? 'active' : ''}
                  onClick={() => handleAppNav(item)}
                >
                  {item.label}
                </button>
              ))}
            </>
          )}
          {user && (
            <div className="editor-sidebar-profile-wrap">
              <button
                type="button"
                className="editor-sidebar-profile"
                onClick={() => navigate('/settings')}
                title={user.email}
              >
                <span className="sidebar-avatar">{(user.name || user.email || '?')[0].toUpperCase()}</span>
                <span className="sidebar-profile-text">
                  <strong className="sidebar-profile-name">{user.name || user.email}</strong>
                  {user.name && <span className="sidebar-profile-email">{user.email}</span>}
                </span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
