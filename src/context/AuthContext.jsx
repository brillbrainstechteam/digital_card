import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getToken } from '../api/client'
import { loginRequest, signupRequest, fetchMe, logoutRequest, deleteAccountRequest, updateProfileRequest, changePasswordRequest } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Auto-login on refresh: if a token exists, validate it by loading the user.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    fetchMe()
      .then((me) => setUser(me))
      .catch(() => {
        logoutRequest()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const me = await loginRequest(email, password)
    setUser(me)
    return me
  }, [])

  const signup = useCallback(async (fields) => {
    const me = await signupRequest(fields)
    setUser(me)
    return me
  }, [])

  const logout = useCallback(() => {
    logoutRequest()
    setUser(null)
  }, [])

  const deleteAccount = useCallback(async (feedback) => {
    await deleteAccountRequest(feedback)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (fields) => {
    const me = await updateProfileRequest(fields)
    setUser(me)
    return me
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    await changePasswordRequest(currentPassword, newPassword)
  }, [])

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    signup,
    logout,
    deleteAccount,
    updateProfile,
    changePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
