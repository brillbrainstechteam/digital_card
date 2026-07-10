import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { Landing } from './components/Landing'
import { AuthPage } from './components/AuthPage'
import { SettingsPage } from './components/SettingsPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { Dashboard, StudioPage, AnalyticsPage, ActivityPage, PublicCard } from './features/digital-card'
import { QRStudioPage } from './features/qr/generator/QRStudioPage'
import { QrScanRedirect } from './features/qr'

function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <main className="auth-view"><div className="auth-loading">Loading…</div></main>
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<GuestRoute><AuthPage mode="login" /></GuestRoute>} />
            <Route path="/signup" element={<GuestRoute><AuthPage mode="signup" /></GuestRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/qr-studio" element={<ProtectedRoute><QRStudioPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/studio/:cardId" element={<ProtectedRoute><StudioPage /></ProtectedRoute>} />
          </Route>
          <Route path="/card/:slug" element={<PublicCard />} />
          <Route path="/q/:slug" element={<QrScanRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
