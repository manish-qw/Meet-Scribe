/** App shell with routing. */

import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { MeetingPage } from './pages/MeetingPage'
import { LandingPage } from './pages/LandingPage'
import { ProtectedRoute } from './components/layout/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meeting/:meetingId"
        element={
          <ProtectedRoute>
            <MeetingPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
