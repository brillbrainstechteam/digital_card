import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'bb_cart_items'

/**
 * The one way a cart line's price is rendered. `amount` (a number) is the
 * single source of truth — items used to also carry a pre-formatted `price`
 * string, which drifted out of sync (QR Studio shipped a literal '₹X'
 * placeholder, and different surfaces disagreed on the same item's price).
 *
 * Falls back to 0, not to a default price: a missing amount is a bug, and
 * showing 0 surfaces it, whereas silently substituting some other product's
 * price mischarges the user.
 */
export function formatCartAmount(amount) {
  return `INR ${Number(amount || 0).toLocaleString('en-IN')}`
}

export function cartTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Global, persisted cart shared across the whole app — the top navbar cart
// icon, the post-publish flow's cart step, and (later) any other product
// surface that wants to add a line item all read/write through this one
// context so the cart never gets out of sync between screens.
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage can fail (private browsing, quota) — the cart just won't
      // persist across reloads, which isn't worth surfacing to the user.
    }
  }, [items])

  const addItem = useCallback((item) => {
    setItems((current) => {
      const exists = current.some((entry) => entry.id === item.id)
      if (exists) return current.map((entry) => (entry.id === item.id ? { ...entry, ...item } : entry))
      return [...current, item]
    })
  }, [])

  const removeItem = useCallback((id) => {
    setItems((current) => current.filter((entry) => entry.id !== id))
  }, [])

  const hasItem = useCallback((id) => items.some((entry) => entry.id === id), [items])

  const clear = useCallback(() => setItems([]), [])

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, hasItem, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
