import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from './store/appStore'

// View Pages
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import ComplaintsPage from './pages/Complaints'
import ComplaintDetailPage from './pages/ComplaintDetail'
import NewComplaintPage from './pages/NewComplaint'
import RelatedCasesPage from './pages/RelatedCases'
import CaseTimelinePage from './pages/CaseTimeline'
import CaseComparePage from './pages/CaseCompare'
import InstitutionsPage from './pages/Institutions'
import SmartTriagePage from './pages/SmartTriage'
import BureauCoordinationPage from './pages/BureauCoordination'
import AuditLedgerPage from './pages/AuditLedger'
import AdminRulesPage from './pages/AdminRules'
import NotificationsPage from './pages/Notifications'
import HelpPage from './pages/Help'

function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isLoggedIn, currentUser } = useAppStore()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminOnly && currentUser?.role !== 'ADMINISTRATOR') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default function App() {
  const isLoggedIn = useAppStore(s => s.isLoggedIn)

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root Redirect */}
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
        />

        {/* Protected Dashboard & Operations */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/complaints"
          element={
            <ProtectedRoute>
              <ComplaintsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/complaints/new"
          element={
            <ProtectedRoute>
              <NewComplaintPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/complaints/:id"
          element={
            <ProtectedRoute>
              <ComplaintDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/complaints/:id/related"
          element={
            <ProtectedRoute>
              <RelatedCasesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/complaints/:id/timeline"
          element={
            <ProtectedRoute>
              <CaseTimelinePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/complaints/:id/compare"
          element={
            <ProtectedRoute>
              <CaseComparePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/complaints/compare"
          element={
            <ProtectedRoute>
              <CaseComparePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/institutions"
          element={
            <ProtectedRoute>
              <InstitutionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/triage"
          element={
            <ProtectedRoute>
              <SmartTriagePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bureaus"
          element={
            <ProtectedRoute>
              <BureauCoordinationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit"
          element={
            <ProtectedRoute>
              <AuditLedgerPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/rules"
          element={
            <ProtectedRoute adminOnly>
              <AdminRulesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AdminRulesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <HelpPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
