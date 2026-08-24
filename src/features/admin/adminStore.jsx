// One shared data layer for every admin tab.
//
// Each tab used to run its own useEffect + fetch on mount, so switching tabs
// re-hit the API, edits made on one tab never showed up on another, and there
// was no way to refresh short of reloading the page. This caches per-endpoint,
// exposes a single refresh that invalidates everything, and tracks when the
// data was last known-good so the header can say how stale it is.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const StoreCtx = createContext(null)

export function AdminStoreProvider({ children }) {
  const [version, setVersion] = useState(0)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [inFlight, setInFlight] = useState(0)
  const cache = useRef(new Map())

  const refresh = useCallback(() => {
    cache.current.clear()
    setVersion((v) => v + 1)
  }, [])

  // Mutations update the cached row in place rather than refetching the whole
  // table, so a status dropdown doesn't flash the entire list.
  const patchCache = useCallback((key, updater) => {
    const entry = cache.current.get(key)
    if (!entry || entry.status !== 'ready') return
    cache.current.set(key, { ...entry, data: updater(entry.data) })
    setVersion((v) => v + 1)
  }, [])

  const value = useMemo(() => ({
    version, refresh, cache, fetchedAt, setFetchedAt, inFlight, setInFlight, patchCache,
  }), [version, refresh, fetchedAt, inFlight, patchCache])

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useAdminStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useAdminStore must be used inside AdminStoreProvider')
  return ctx
}

/**
 * Fetch (and cache) one admin endpoint.
 * @param {string} key      cache key, also the identity for patchResource
 * @param {Function} fetcher zero-arg async function returning the data
 */
export function useAdminResource(key, fetcher) {
  const { version, cache, setFetchedAt, setInFlight } = useAdminStore()
  const [, forceRender] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const entry = cache.current.get(key)

  useEffect(() => {
    const existing = cache.current.get(key)
    if (existing && existing.status !== 'idle') return undefined

    let cancelled = false
    cache.current.set(key, { status: 'loading', data: null, error: null })
    setInFlight((n) => n + 1)
    forceRender((n) => n + 1)

    fetcherRef.current()
      .then((data) => {
        if (cancelled) return
        cache.current.set(key, { status: 'ready', data, error: null })
        setFetchedAt(new Date())
      })
      .catch((err) => {
        if (cancelled) return
        cache.current.set(key, { status: 'error', data: null, error: err.message || 'Request failed' })
      })
      .finally(() => {
        if (cancelled) return
        setInFlight((n) => Math.max(0, n - 1))
        forceRender((n) => n + 1)
      })

    return () => { cancelled = true }
    // `version` is the invalidation signal: refresh() clears the cache and
    // bumps it, which re-runs this effect and refetches.
  }, [key, version, cache, setFetchedAt, setInFlight])

  return {
    data: entry?.data ?? null,
    loading: !entry || entry.status === 'loading',
    error: entry?.status === 'error' ? entry.error : null,
  }
}

export function useLastUpdatedLabel() {
  const { fetchedAt } = useAdminStore()
  const [, tick] = useState(0)

  // Re-render once a minute so "2m ago" doesn't sit frozen at "just now".
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  if (!fetchedAt) return null
  const s = Math.floor((Date.now() - fetchedAt) / 1000)
  if (s < 60) return 'updated just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `updated ${m}m ago`
  return `updated ${Math.floor(m / 60)}h ago`
}
