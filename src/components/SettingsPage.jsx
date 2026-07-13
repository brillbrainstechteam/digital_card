import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCards } from '../features/digital-card/services/api'
import { fetchMyQrCodes } from '../features/qr/services/qrApi'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'

function DeleteAccountModal({ onCancel, onConfirm, busy, error }) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog account-delete-dialog">
        <h2>Delete Account?</h2>
        <p>
          This action is permanent.
          <br />
          Deleting your account will remove your profile, cards, and associated data.
        </p>
        {error && <p className="modal-error">{error}</p>}
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="danger-button" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout, deleteAccount } = useAuth()
  const [cardStats, setCardStats] = useState({ total: 0, draft: 0, published: 0, archived: 0 })
  const [qrCount, setQrCount] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    fetchCards()
      .then((cards) => {
        setCardStats({
          total: cards.length,
          draft: cards.filter((card) => card.status === 'draft').length,
          published: cards.filter((card) => card.status === 'published').length,
          archived: cards.filter((card) => card.status === 'archived').length,
        })
      })
      .catch(() => {})
    fetchMyQrCodes()
      .then((qrs) => setQrCount(qrs.length))
      .catch(() => {})
  }, [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  async function handleDeleteAccount() {
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await deleteAccount()
      navigate('/login', { replace: true })
    } catch (error) {
      setDeleteError(error.message || 'Delete account failed.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <>
      {deleteOpen && (
        <DeleteAccountModal
          busy={deleteBusy}
          error={deleteError}
          onCancel={() => {
            setDeleteOpen(false)
            setDeleteError('')
          }}
          onConfirm={handleDeleteAccount}
        />
      )}
      <main className="studio studio-workspace">
        <Sidebar mode="app" activeApp="settings" />
        <section className="editor-panel editor-panel--wide">
          <PageHeader
            badge="SETTINGS"
            title="Manage your account"
            subtitle="View your personal information and account statistics."
          />
          <section className="editor-section profile-page">
            <div className="profile-page-grid">
              <div className="profile-page-section">
                <h3>Account</h3>
                <dl>
                  <div><dt>Name</dt><dd>{user?.name || 'User'}</dd></div>
                  <div><dt>Email</dt><dd>{user?.email || '-'}</dd></div>
                </dl>
              </div>
              <div className="profile-page-section">
                <h3>Statistics</h3>
                <dl>
                  <div><dt>Total Cards</dt><dd>{cardStats.total}</dd></div>
                  <div><dt>Draft Cards</dt><dd>{cardStats.draft}</dd></div>
                  <div><dt>Published Cards</dt><dd>{cardStats.published}</dd></div>
                  <div><dt>Archived Cards</dt><dd>{cardStats.archived}</dd></div>
                  <div><dt>QR Codes</dt><dd>{qrCount}</dd></div>
                </dl>
              </div>
              <div className="profile-page-section profile-page-actions">
                <h3>Account Actions</h3>
                <button className="profile-action-button" type="button" onClick={handleLogout}>Logout</button>
                <button className="profile-action-button danger-link-button" type="button" onClick={() => setDeleteOpen(true)}>Delete Account</button>
              </div>
            </div>
          </section>
        </section>
      </main>
    </>
  )
}
