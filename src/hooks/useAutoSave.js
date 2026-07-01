import { useEffect, useRef, useCallback } from 'react'

export function useAutoSave(cardId, profile, onSave, delay = 2000, shouldSkipSave = null) {
  const timer = useRef(null)
  const prev = useRef(null)
  const mounted = useRef(false)

  // Skip the very first render so we don't auto-save the initial load.
  useEffect(() => {
    if (!mounted.current) {
      prev.current = JSON.stringify(profile)
      mounted.current = true
      return
    }
    if (!cardId) return

    const current = JSON.stringify(profile)
    if (current === prev.current) return
    prev.current = current
    if (shouldSkipSave?.()) {
      return
    }

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onSave(), delay)

    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [profile, cardId, onSave, delay, shouldSkipSave])

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (cardId) onSave()
  }, [cardId, onSave])

  return { flush }
}
