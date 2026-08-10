import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

import { useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { CartProvider } from './context/CartContext'
import { Landing } from './components/Landing'
import { AuthPage } from './components/AuthPage'
import { SettingsPage } from './components/SettingsPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { CartPage } from './components/CartPage'
import { CheckoutPage } from './components/CheckoutPage'
import {
  Dashboard,
  StudioPage,
  CreateCardPage,
  AnalyticsPage,
  ActivityPage,
  PublicCard,
  CardPreviewTemp,
} from './features/digital-card'
import { QRStudioPage } from './features/qr/generator/QRStudioPage'
import { QrCodesListPage } from './features/qr/generator/QrCodesListPage'
import { QrAnalyticsPage } from './features/qr/generator/QrAnalyticsPage'
import { QrScanRedirect } from './features/qr'
import { AdminPanel } from './features/admin/AdminPanel'

function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <main className="auth-view"><div className="auth-loading">Loading...</div></main>
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CartProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<GuestRoute><AuthPage mode="login" /></GuestRoute>} />
              <Route path="/signup" element={<GuestRoute><AuthPage mode="signup" /></GuestRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/qr-studio" element={<QRStudioPage />} />
              <Route path="/qr-studio/codes" element={<ProtectedRoute><QrCodesListPage /></ProtectedRoute>} />
              <Route path="/qr-studio/analytics" element={<ProtectedRoute><QrAnalyticsPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
              <Route path="/studio/:cardId" element={<ProtectedRoute><StudioPage /></ProtectedRoute>} />
              <Route path="/create" element={<CreateCardPage />} />
            </Route>
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/*" element={<AdminPanel />} />
            <Route path="/card/:slug" element={<PublicCard />} />
            <Route path="/preview/:token" element={<CardPreviewTemp />} />
            <Route path="/q/:slug" element={<QrScanRedirect />} />
            <Route path="/:slug" element={<PublicCard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
