import { useState } from 'react'
import { DestinationPicker } from './DestinationPicker'
import { buildDestinationValue } from '../utils/destinations'
import { updateQrDestination } from '../services/qrApi'

export function QrManagementPanel({ qr, onUpdated, onClose, toast }) {
  const [type, setType] = useState(qr.settings?.destinationType || 'website')
  const [fields, setFields] = useState(qr.settings?.destinationFields || { url: '' })
  const [busy, setBusy] = useState(false)

  async function saveDestination() {
    if (!buildDestinationValue(type, fields)) {
      toast.error('Add a valid destination before saving.')
      return
    }
    setBusy(true)
    try {
      const updated = await updateQrDestination(qr.id, type, fields)
      onUpdated(updated)
      toast.success('Destination updated. Your QR image has not changed.')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Could not update the destination')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="qr-management-panel">
      <div className="qr-management-heading">
        <div>
          <h4>Redirect destination</h4>
          <p>Change where this QR leads without replacing its image.</p>
        </div>
        <button type="button" className="secondary-button" onClick={onClose}>Close</button>
      </div>

      <DestinationPicker type={type} fields={fields} onChange={(nextType, nextFields) => { setType(nextType); setFields(nextFields) }} />
      <button type="button" className="primary-button qr-save-destination" disabled={busy} onClick={saveDestination}>
        {busy ? 'Saving...' : 'Update Destination'}
      </button>
    </div>
  )
}
