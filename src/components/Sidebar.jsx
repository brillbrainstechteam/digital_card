import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ── App nav tree ─────────────────────────────────────────────
const NAV_TREE = [
  {
    key: 'cards',
    label: 'Digital Card',
    icon: '🪪',
    createPath: '/create',
    activePaths: ['/create', '/dashboard', '/analytics', '/activity', '/studio'],
    children: [
      { key: 'analytics', label: 'Analytics', path: '/analytics' },
      { key: 'activity',  label: 'Activity',  path: '/activity'  },
    ],
  },
  {
    key: 'qr',
    label: 'QR Code',
    icon: '◻',
    createPath: '/qr-studio',
    activePaths: ['/qr-studio'],
    children: [
      { key: 'qrcodes',    label: 'My QR Codes', path: '/qr-studio/codes'     },
      { key: 'qranalytics',label: 'Analytics',   path: '/qr-studio/analytics' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: '⚙',
    path: '/settings',
  },
]

const EDITOR_ITEMS = [
  { key: 'design',   label: 'Design'          },
  { key: 'info',     label: 'Info'            },
  { key: 'buttons',  label: 'Button Settings' },
  { key: 'leads',    label: 'Leads'           },
  { key: 'social',   label: 'Social Links'    },
  { key: 'settings', label: 'Logo Settings'   },
  { key: 'colors',   label: 'Colors'          },
  { key: 'fonts',    label: 'Fonts'           },
  { key: 'footer',   label: 'Footer'          },
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

function detectExpanded(pathname) {
  if (pathname.startsWith('/qr-studio')) return 'qr'
  if (
    pathname.startsWith('/create') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/activity') ||
    pathname.startsWith('/studio')
  ) return 'cards'
  return null
}

export function Sidebar({
  mode,
  activeEditor,
  onEditorNav,
  hasUnsavedChanges = false,
  onSave,
  onDiscard,
  backTo = null,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [pendingPath, setPendingPath] = useState(null)
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(() => detectExpanded(location.pathname))

  useEffect(() => {
    setExpanded(detectExpanded(location.pathname))
  }, [location.pathname])

  function goTo(path) {
    if (mode === 'editor' && hasUnsavedChanges) {
      setPendingPath(path)
    } else {
      navigate(path)
    }
  }

  function handleParentClick(item) {
    if (item.path) {
      goTo(item.path)
      return
    }
    // Accordion: expand and navigate to create page
    const next = expanded === item.key ? item.key : item.key
    setExpanded(next)
    goTo(item.createPath)
  }

  function isChildActive(childPath) {
    return location.pathname === childPath || location.pathname.startsWith(childPath + '/')
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
              <button type="button" onClick={() => goTo('/dashboard')}>
                &larr; Digital Cards
              </button>
              {backTo && (
                <button type="button" onClick={() => goTo(backTo)}>
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
              <span className="sidebar-group-label">Navigation</span>
              {NAV_TREE.map((item) => {
                const isExpanded = expanded === item.key
                const isParentActive = isExpanded || (item.path && location.pathname === item.path)

                return (
                  <div key={item.key} className="sidebar-nav-group">
                    <button
                      type="button"
                      className={`sidebar-nav-parent${isParentActive ? ' active' : ''}`}
                      onClick={() => handleParentClick(item)}
                    >
                      <span className="sidebar-nav-icon">{item.icon}</span>
                      <span className="sidebar-nav-label">{item.label}</span>
                      {item.children && (
                        <span className={`sidebar-nav-chevron${isExpanded ? ' sidebar-nav-chevron--open' : ''}`}>
                          ›
                        </span>
                      )}
                    </button>

                    {item.children && isExpanded && (
                      <div className="sidebar-nav-children">
                        {item.children.map((child) => (
                          <button
                            key={child.key}
                            type="button"
                            className={`sidebar-nav-child${isChildActive(child.path) ? ' active' : ''}`}
                            onClick={() => goTo(child.path)}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
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
