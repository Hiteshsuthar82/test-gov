import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/auth/LoginPage'
import AdminLayout from './components/layout/AdminLayout'
import DashboardPage from './pages/dashboard/DashboardPage'
import BannersListPage from './pages/banners/BannersListPage'
import BannerFormPage from './pages/banners/BannerFormPage'
import NoticesListPage from './pages/notices/NoticesListPage'
import NoticeFormPage from './pages/notices/NoticeFormPage'
import CategoriesListPage from './pages/categories/CategoriesListPage'
import CategoryFormPage from './pages/categories/CategoryFormPage'
import CategorySetsPage from './pages/categories/CategorySetsPage'
import SetFormPage from './pages/categories/SetFormPage'
import SetQuestionsPage from './pages/categories/SetQuestionsPage'
import QuestionFormPage from './pages/categories/QuestionFormPage'
import UsersListPage from './pages/users/UsersListPage'
import UserDetailPage from './pages/users/UserDetailPage'
import PaymentsListPage from './pages/payments/PaymentsListPage'
import PaymentDetailPage from './pages/payments/PaymentDetailPage'
import SubscriptionsListPage from './pages/subscriptions/SubscriptionsListPage'
import SendNotificationPage from './pages/notifications/SendNotificationPage'
import NotificationsHistoryPage from './pages/notifications/NotificationsHistoryPage'
import PartnersListPage from './pages/partners/PartnersListPage'
import PartnerFormPage from './pages/partners/PartnerFormPage'
import LeaderboardListPage from './pages/leaderboard/LeaderboardListPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="banners" element={<BannersListPage />} />
          <Route path="banners/new" element={<BannerFormPage />} />
          <Route path="banners/:id/edit" element={<BannerFormPage />} />
          <Route path="notices" element={<NoticesListPage />} />
          <Route path="notices/new" element={<NoticeFormPage />} />
          <Route path="notices/:id/edit" element={<NoticeFormPage />} />
          <Route path="categories" element={<CategoriesListPage />} />
          <Route path="categories/new" element={<CategoryFormPage />} />
          <Route path="categories/:id/edit" element={<CategoryFormPage />} />
          <Route path="categories/:id/sets" element={<CategorySetsPage />} />
          <Route path="categories/:categoryId/sets/new" element={<SetFormPage />} />
          <Route path="sets/:id/edit" element={<SetFormPage />} />
          <Route path="sets/:id/questions" element={<SetQuestionsPage />} />
          <Route path="sets/:setId/questions/new" element={<QuestionFormPage />} />
          <Route path="questions/:id/edit" element={<QuestionFormPage />} />
          <Route path="users" element={<UsersListPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="payments" element={<PaymentsListPage />} />
          <Route path="payments/:id" element={<PaymentDetailPage />} />
          <Route path="subscriptions" element={<SubscriptionsListPage />} />
          <Route path="partners" element={<PartnersListPage />} />
          <Route path="partners/new" element={<PartnerFormPage />} />
          <Route path="partners/:id/edit" element={<PartnerFormPage />} />
          <Route path="leaderboard" element={<LeaderboardListPage />} />
          <Route path="notifications/send" element={<SendNotificationPage />} />
          <Route path="notifications" element={<NotificationsHistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

