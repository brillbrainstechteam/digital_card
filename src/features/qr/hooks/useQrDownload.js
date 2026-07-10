import { useCallback, useState } from 'react'
import { downloadQrCode } from '../services/qrEngine'

// Reusable download trigger — same hook works for the standalone QR Studio
// today and for any future "Download QR" button embedded in the Digital
// Card or Business Card editors.
export function useQrDownload(settings, fileName = 'qr-code') {
  const [pending, setPending] = useState(null)

  const download = useCallback(async (extension) => {
    setPending(extension)
    try {
      await downloadQrCode(settings, { extension, fileName })
    } finally {
      setPending(null)
    }
  }, [settings, fileName])

  return { download, pending }
}
