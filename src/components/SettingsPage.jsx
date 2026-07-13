import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCards } from '../features/digital-card/services/api'
import { fetchMyQrCodes } from '../features/qr/services/qrApi'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'

function DeleteAccountModal({ onCancel, onConfirm, busy, error }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')

  return (
    <div className="confirm-overlay">
      <form className="confirm-dialog account-delete-dialog" onSubmit={(event) => { event.preventDefault(); onConfirm({ reason, details }) }}>
        <h2>Delete Account?</h2>
        <p>
          This action is permanent.
          <br />
          Deleting your account will remove your profile, cards, and associated data.
        </p>
        <label className="field deletion-feedback-field">
          <span>Why are you deleting your account?</span>
          <select value={reason} onChange={(event) => setReason(event.target.value)} required>
            <option value="">Select a reason</option>
            <option value="not_useful">I no longer need the service</option>
            <option value="too_expensive">The pricing does not work for me</option>
            <option value="missing_features">I am missing an important feature</option>
            <option value="privacy">Privacy or data concerns</option>
            <option value="temporary">I only need to leave temporarily</option>
            <option value="other">Another reason</option>
          </select>
        </label>
        <label className="field deletion-feedback-field">
          <span>Anything else we should know? <small>Optional</small></span>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={3} placeholder="Your feedback will help us improve." />
        </label>
        {error && <p className="modal-error">{error}</p>}
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="danger-button" type="submit" disabled={busy || !reason}>
            {busy ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </form>
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

  async function handleDeleteAccount(feedback) {
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await deleteAccount(feedback)
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
