import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useIsAuthenticated } from './store/authStore'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import HomePage from './pages/HomePage'
import CategoryPage from './pages/CategoryPage'
import TestAttemptPage from './pages/TestAttemptPage'
import ResultsPage from './pages/ResultsPage'
import ProfilePage from './pages/ProfilePage'
import PaymentPage from './pages/PaymentPage'
import MySubscriptionsPage from './pages/MySubscriptionsPage'
import TestAttemptsHistoryPage from './pages/TestAttemptsHistoryPage'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<HomePage />} />
          <Route
            path="/categories/:categoryId"
            element={
              <ProtectedRoute>
                <CategoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories/:categoryId/payment"
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/:testSetId/attempt/:attemptId"
            element={
              <ProtectedRoute>
                <TestAttemptPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/:testSetId/results/:attemptId"
            element={
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute>
                <MySubscriptionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/:testSetId/attempts"
            element={
              <ProtectedRoute>
                <TestAttemptsHistoryPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
