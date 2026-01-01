import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { ConfirmationProvider } from './components/ui/confirmation-dialog'
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
import AllResultsPage from './pages/AllResultsPage'
import AllCategoriesPage from './pages/AllCategoriesPage'
import LeaderboardPage from './pages/LeaderboardPage'
import NoticesPage from './pages/NoticesPage'
import TestAttemptInstructionsPage from './pages/TestAttemptInstructionsPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import AnalysisPage from './pages/AnalysisPage'
import SolutionPage from './pages/SolutionPage'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmationProvider>
        <Toaster 
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#363636',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/categories" element={<AllCategoriesPage />} />
          <Route
            path="/categories/:categoryId"
            element={<CategoryPage />}
          />
          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <PaymentPage />
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
            path="/test/:testSetId/instructions"
            element={
              <ProtectedRoute>
                <TestAttemptInstructionsPage />
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
            path="/test/:testSetId/analysis/:attemptId"
            element={
              <ProtectedRoute>
                <AnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/:testSetId/solution/:attemptId"
            element={
              <ProtectedRoute>
                <SolutionPage />
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
          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <AllResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={<LeaderboardPage />}
          />
          <Route
            path="/notices"
            element={<NoticesPage />}
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
        </Routes>
        </BrowserRouter>
      </ConfirmationProvider>
    </QueryClientProvider>
  )
}

export default App
