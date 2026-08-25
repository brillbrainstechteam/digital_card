import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCards } from '../features/digital-card/services/api'
import { fetchMyQrCodes } from '../features/qr/services/qrApi'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'

function EditProfileModal({ user, onCancel, onSave, busy, error }) {
  const [name, setName] = useState(user?.name || '')
  const [businessName, setBusinessName] = useState(user?.business_name || '')
  const [phone, setPhone] = useState(user?.phone || '')

  return (
    <div className="confirm-overlay">
      <form
        className="confirm-dialog account-delete-dialog"
        onSubmit={(event) => { event.preventDefault(); onSave({ name, business_name: businessName, phone }) }}
      >
        <h2>Edit Profile</h2>
        <label className="field deletion-feedback-field">
          <span>Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field deletion-feedback-field">
          <span>Business name</span>
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
        </label>
        <label className="field deletion-feedback-field">
          <span>Phone <small>Optional</small></span>
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, ''))} placeholder="+91 98765 43210" />
        </label>
        {error && <p className="modal-error">{error}</p>}
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  )
}

function ChangePasswordModal({ onCancel, onSave, busy, error }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setLocalError('New passwords do not match')
      return
    }
    setLocalError('')
    onSave({ currentPassword, newPassword })
  }

  return (
    <div className="confirm-overlay">
      <form className="confirm-dialog account-delete-dialog" onSubmit={handleSubmit}>
        <h2>Change Password</h2>
        <label className="field deletion-feedback-field">
          <span>Current password</span>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </label>
        <label className="field deletion-feedback-field">
          <span>New password</span>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required />
        </label>
        <label className="field deletion-feedback-field">
          <span>Confirm new password</span>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required />
        </label>
        {(localError || error) && <p className="modal-error">{localError || error}</p>}
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Updating...' : 'Update Password'}</button>
        </div>
      </form>
    </div>
  )
}

function DeleteAccountModal({ onCancel, onConfirm, busy, error }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="confirm-overlay">
      <form className="confirm-dialog account-delete-dialog" onSubmit={(event) => { event.preventDefault(); onConfirm({ reason, details, password }) }}>
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
        {/* Re-authentication. Deletion is irreversible and wipes every card,
            QR code and captured lead, so a stolen session token must not be
            enough on its own to trigger it. */}
        <label className="field deletion-feedback-field">
          <span>Confirm your password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Your account password"
            required
          />
        </label>
        {error && <p className="modal-error">{error}</p>}
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="danger-button" type="submit" disabled={busy || !reason || !password}>
            {busy ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout, deleteAccount, updateProfile, changePassword } = useAuth()
  const toast = useToast()
  const [cardStats, setCardStats] = useState({ total: 0, draft: 0, published: 0, archived: 0 })
  const [qrCount, setQrCount] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [pwdOpen, setPwdOpen] = useState(false)
  const [pwdBusy, setPwdBusy] = useState(false)
  const [pwdError, setPwdError] = useState('')

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

  async function handleUpdateProfile(fields) {
    setEditBusy(true)
    setEditError('')
    try {
      await updateProfile(fields)
      setEditOpen(false)
      toast.success('Profile updated')
    } catch (error) {
      setEditError(error.message || 'Could not update profile.')
    } finally {
      setEditBusy(false)
    }
  }

  async function handleChangePassword({ currentPassword, newPassword }) {
    setPwdBusy(true)
    setPwdError('')
    try {
      await changePassword(currentPassword, newPassword)
      setPwdOpen(false)
      toast.success('Password updated')
    } catch (error) {
      setPwdError(error.message || 'Could not update password.')
    } finally {
      setPwdBusy(false)
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
      {editOpen && (
        <EditProfileModal
          user={user}
          busy={editBusy}
          error={editError}
          onCancel={() => { setEditOpen(false); setEditError('') }}
          onSave={handleUpdateProfile}
        />
      )}
      {pwdOpen && (
        <ChangePasswordModal
          busy={pwdBusy}
          error={pwdError}
          onCancel={() => { setPwdOpen(false); setPwdError('') }}
          onSave={handleChangePassword}
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
                  <div><dt>Business</dt><dd>{user?.business_name || '-'}</dd></div>
                  <div><dt>Email</dt><dd>{user?.email || '-'}</dd></div>
                  <div><dt>Phone</dt><dd>{user?.phone || '-'}</dd></div>
                </dl>
                <button className="secondary-button" type="button" style={{ marginTop: 12 }} onClick={() => setEditOpen(true)}>
                  Edit Profile
                </button>
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
                <button className="profile-action-button" type="button" onClick={() => setPwdOpen(true)}>Change Password</button>
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
