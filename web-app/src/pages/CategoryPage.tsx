import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Layout from '@/components/layout/Layout'
import { FiClock, FiFileText, FiCheckCircle } from 'react-icons/fi'

interface TestSet {
  _id: string
  name: string
  description: string
  durationMinutes: number
  totalMarks: number
  totalQuestions: number
  categoryId: string
  isActive: boolean
}

export default function CategoryPage() {
  const { categoryId } = useParams()

  const { data: categoryData } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      const response = await api.get(`/categories/${categoryId}/details`)
      return response.data.data
    },
    enabled: !!categoryId,
  })
  const category = categoryData?.category

  const { data: testSets, isLoading } = useQuery({
    queryKey: ['testSets', categoryId],
    queryFn: async () => {
      const response = await api.get(`/sets/categories/${categoryId}/sets`)
      return response.data.data.filter((set: TestSet) => set.isActive)
    },
    enabled: !!categoryId,
  })

  const { data: subscriptionStatus } = useQuery({
    queryKey: ['subscriptionStatus', categoryId],
    queryFn: async () => {
      try {
        const response = await api.get(`/subscriptions/check-status/${categoryId}`)
        return response.data.data
      } catch {
        return null
      }
    },
    enabled: !!categoryId,
  })

  const startAttemptMutation = useMutation({
    mutationFn: async (testSetId: string) => {
      const response = await api.post(`/attempts/start`, { testSetId })
      return response.data.data
    },
    onSuccess: (data) => {
      window.location.href = `/test/${data.testSetId}/attempt/${data.attemptId}`
    },
  })

  const handleStartTest = (testSetId: string) => {
    if (!subscriptionStatus || subscriptionStatus.status !== 'APPROVED') {
      alert('Please subscribe to this category first')
      return
    }
    startAttemptMutation.mutate(testSetId)
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {category && (
          <div className="mb-8">
            {category.bannerImageUrl && (
              <img
                src={category.bannerImageUrl}
                alt={category.name}
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
            )}
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{category.name}</h1>
            <p className="text-lg text-gray-600">{category.description}</p>
          </div>
        )}

        {!subscriptionStatus || subscriptionStatus.status !== 'APPROVED' ? (
          <Card className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Subscribe to Access All Tests
                </h3>
                <p className="text-gray-700 mb-4">
                  Get unlimited access to all test series in this category
                </p>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="text-3xl font-bold text-purple-600">₹{category?.price}</div>
                  <div className="text-sm text-gray-600">One-time payment</div>
                </div>
                <Link to={`/categories/${categoryId}/payment`}>
                  <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                    Buy Now
                  </Button>
                </Link>
                {subscriptionStatus && subscriptionStatus.status === 'PENDING_REVIEW' && (
                  <p className="text-sm text-yellow-600 mt-4">
                    Your payment is under review. You'll be notified once approved.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Test Series</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testSets?.map((testSet: TestSet) => (
              <Card key={testSet._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{testSet.name}</CardTitle>
                  <CardDescription>{testSet.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <FiClock className="mr-2" />
                      {testSet.durationMinutes} minutes
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <FiFileText className="mr-2" />
                      {testSet.totalQuestions} questions
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <FiCheckCircle className="mr-2" />
                      {testSet.totalMarks} marks
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handleStartTest(testSet._id)}
                    disabled={!subscriptionStatus || subscriptionStatus.status !== 'APPROVED' || startAttemptMutation.isPending}
                  >
                    {startAttemptMutation.isPending ? 'Starting...' : 'Start Test'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

