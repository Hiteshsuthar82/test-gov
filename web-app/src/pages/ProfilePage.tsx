import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Layout from '@/components/layout/Layout'
import { FiUser, FiMail, FiPhone, FiBook, FiCheckCircle, FiClock } from 'react-icons/fi'

export default function ProfilePage() {
  const { user } = useAuthStore()

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/me')
      return response.data.data
    },
  })

  const { data: attempts } = useQuery({
    queryKey: ['user-attempts'],
    queryFn: async () => {
      const response = await api.get('/attempts')
      return response.data.data
    },
  })

  // Note: Subscriptions are created through payment flow
  // Users need to submit payment first, then admin approves

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Profile</h1>

        {/* User Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <FiUser className="mr-3 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{user?.name}</p>
                </div>
              </div>
              <div className="flex items-center">
                <FiMail className="mr-3 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center">
                <FiPhone className="mr-3 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Mobile</p>
                  <p className="font-medium">{user?.mobile}</p>
                </div>
              </div>
              {user?.preparingForExam && (
                <div className="flex items-center">
                  <FiBook className="mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Preparing For</p>
                    <p className="font-medium">{user.preparingForExam}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">My Subscriptions</h2>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : subscriptions?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscriptions.map((sub: any) => (
                <Card key={sub._id}>
                  <CardHeader>
                    <CardTitle>{sub.categoryId?.name || 'Category'}</CardTitle>
                    <CardDescription>
                      Status: <span className={sub.status === 'APPROVED' ? 'text-green-600' : 'text-yellow-600'}>
                        {sub.status}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sub.status === 'APPROVED' ? (
                      <div className="flex items-center text-green-600">
                        <FiCheckCircle className="mr-2" />
                        Active
                      </div>
                    ) : (
                      <div className="flex items-center text-yellow-600">
                        <FiClock className="mr-2" />
                        Pending Approval
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-gray-600">
                No subscriptions yet. Browse categories to subscribe.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Attempts */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Test Attempts</h2>
          {attempts?.length > 0 ? (
            <div className="space-y-4">
              {attempts.slice(0, 10).map((attempt: any) => (
                <Card key={attempt._id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{attempt.testSetId?.name || 'Test'}</h3>
                        <p className="text-sm text-gray-600">
                          Score: {attempt.totalScore} | Correct: {attempt.totalCorrect} | Wrong: {attempt.totalWrong}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(attempt.startedAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          window.location.href = `/test/${attempt.testSetId?._id}/results/${attempt._id}`
                        }}
                      >
                        View Results
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-gray-600">
                No test attempts yet. Start a test to see your attempts here.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}

