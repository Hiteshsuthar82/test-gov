import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Layout from '@/components/layout/Layout'
import { FiClock, FiFileText, FiCheckCircle, FiLock, FiX, FiPlay, FiEye } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { formatPriceWithDiscount } from '@/utils/pricing'

interface TestSet {
  _id: string
  name: string
  description: string
  durationMinutes: number
  totalMarks: number
  totalQuestions: number
  attemptCount?: number
  categoryId: string
  isActive: boolean
}

export default function CategoryPage() {
  const { categoryId } = useParams()
  const { user } = useAuthStore()

  const { data: categoryData } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      const response = await api.get(`/categories/${categoryId}/details`)
      return response.data.data
    },
    enabled: !!categoryId,
  })
  const category = categoryData?.category

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

  const isSubscriptionApproved = subscriptionStatus?.status === 'APPROVED'

  // Always fetch test sets (public endpoint) regardless of subscription status
  const { data: testSets, isLoading } = useQuery({
    queryKey: ['testSets', categoryId, subscriptionStatus?.status],
    queryFn: async () => {
      const approved = subscriptionStatus?.status === 'APPROVED'
      try {
        // Try to get sets with subscription (full access) if approved
        if (approved) {
          const response = await api.get(`/sets/categories/${categoryId}/sets`)
          return response.data.data.filter((set: TestSet) => set.isActive)
        }
      } catch (error: any) {
        // If subscription endpoint fails, continue to public endpoint
      }
      // Get public sets (locked preview) - always use this as fallback or when not subscribed
      const response = await api.get(`/sets/categories/${categoryId}/sets/public`)
      return response.data.data.filter((set: TestSet) => set.isActive)
    },
    enabled: !!categoryId,
    retry: false,
  })

  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [selectedTestSetId, setSelectedTestSetId] = useState<string | null>(null)

  // Fetch all attempts for all test sets in this category
  const { data: allAttempts } = useQuery({
    queryKey: ['allAttempts', categoryId],
    queryFn: async () => {
      try {
        const response = await api.get(`/attempts`)
        return response.data.data || []
      } catch {
        return []
      }
    },
    enabled: !!categoryId && isSubscriptionApproved,
  })

  // Fetch in-progress attempts for dialog
  const { data: inProgressAttempts } = useQuery({
    queryKey: ['inProgressAttempts', selectedTestSetId],
    queryFn: async () => {
      const response = await api.get(`/attempts/in-progress/list${selectedTestSetId ? `?testSetId=${selectedTestSetId}` : ''}`)
      return response.data.data
    },
    enabled: showResumeDialog && !!selectedTestSetId,
  })

  // Helper function to get attempt status for a test set
  const getAttemptStatus = (testSetId: string) => {
    if (!allAttempts || !Array.isArray(allAttempts)) return null
    
    const attempts = allAttempts.filter((attempt: any) => {
      const attemptTestSetId = attempt.testSetId?._id || attempt.testSetId?._id?.toString() || attempt.testSetId?.toString() || attempt.testSetId
      return attemptTestSetId === testSetId || attemptTestSetId?.toString() === testSetId
    })
    
    if (attempts.length === 0) return null
    
    // Check for in-progress attempts first
    const inProgress = attempts.find((a: any) => a.status === 'IN_PROGRESS')
    if (inProgress) {
      return { status: 'IN_PROGRESS', attemptId: inProgress._id }
    }
    
    // Check for completed attempts
    const completed = attempts.find((a: any) => 
      a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED'
    )
    if (completed) {
      return { status: 'COMPLETED', attemptId: completed._id }
    }
    
    return null
  }

  const startAttemptMutation = useMutation({
    mutationFn: async ({ testSetId, forceNew }: { testSetId: string; forceNew?: boolean }) => {
      const response = await api.post(`/attempts/start`, { testSetId, forceNew })
      return response.data.data
    },
    onSuccess: (data) => {
      window.location.href = `/test/${data.testSet?.id || data.testSetId}/attempt/${data.attemptId}`
    },
  })

  const handleStartTest = async (testSetId: string) => {
    if (!subscriptionStatus || subscriptionStatus.status !== 'APPROVED') {
      alert('Please subscribe to this category first')
      return
    }

    // Check if test is already completed
    const attemptStatus = getAttemptStatus(testSetId)
    if (attemptStatus?.status === 'COMPLETED') {
      // Navigate to results page instead
      window.location.href = `/test/${testSetId}/results/${attemptStatus.attemptId}`
      return
    }

    // Check for in-progress attempts
    try {
      const response = await api.get(`/attempts/in-progress/list?testSetId=${testSetId}`)
      const inProgress = response.data.data || []
      
      if (inProgress.length > 0) {
        setSelectedTestSetId(testSetId)
        setShowResumeDialog(true)
      } else {
        startAttemptMutation.mutate({ testSetId, forceNew: false })
      }
    } catch (error) {
      // If check fails, just start new test
      startAttemptMutation.mutate({ testSetId, forceNew: false })
    }
  }

  const handleResumeAttempt = (attemptId: string) => {
    const testSet = testSets?.find((ts: TestSet) => ts._id === selectedTestSetId)
    if (testSet) {
      window.location.href = `/test/${selectedTestSetId}/attempt/${attemptId}`
    }
  }

  const handleStartNewTest = () => {
    if (selectedTestSetId) {
      // Force creating a new attempt even if one exists
      startAttemptMutation.mutate({ testSetId: selectedTestSetId, forceNew: true })
      setShowResumeDialog(false)
      setSelectedTestSetId(null)
    }
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {category && (
          <Card className="mb-8 overflow-hidden shadow-lg">
            <div className={`grid gap-0 ${category.bannerImageUrl ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Image Section - Left Side on Desktop */}
              {category.bannerImageUrl && (
                <div className="lg:order-1 relative">
                  <img
                    src={category.bannerImageUrl}
                    alt={category.name}
                    className="w-full h-64 lg:h-full lg:min-h-[450px] object-cover"
                  />
                </div>
              )}
              
              {/* Details Section - Right Side on Desktop */}
              <div className={`lg:order-2 p-6 lg:p-10 ${category.bannerImageUrl ? 'bg-white' : 'bg-white'}`}>
                <div className="h-full flex flex-col justify-center space-y-4">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">
                      {category.name}
                    </h1>
                    {category.description && (
                      <p className="text-lg text-gray-600 leading-relaxed">
                        {category.description}
                      </p>
                    )}
                  </div>
                  
                  {category.detailsFormatted || category.details ? (
                    <div className="mt-2 prose prose-sm lg:prose-base max-w-none text-gray-700">
                      {category.detailsFormatted ? (
                        <div 
                          className="prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                          dangerouslySetInnerHTML={{ __html: category.detailsFormatted }} 
                        />
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{category.details}</p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
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
                  {(() => {
                    const { discountedPrice, originalPrice, hasDiscount } = formatPriceWithDiscount(
                      category?.price || 0,
                      user?.partnerDiscountPercentage
                    )
                    return (
                      <div className="text-center">
                        {hasDiscount ? (
                          <div>
                            <div className="text-3xl font-bold text-purple-600">₹{discountedPrice}</div>
                            <div className="text-lg text-gray-500 line-through">₹{originalPrice}</div>
                          </div>
                        ) : (
                          <div className="text-3xl font-bold text-purple-600">₹{originalPrice}</div>
                        )}
                        <div className="text-sm text-gray-600 mt-1">One-time payment</div>
                      </div>
                    )
                  })()}
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
        ) : testSets && testSets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testSets.map((testSet: TestSet) => {
              const isLocked = !isSubscriptionApproved
              return (
                <Card 
                  key={testSet._id} 
                  className={`hover:shadow-lg transition-shadow relative ${isLocked ? 'opacity-75 border-gray-300' : ''}`}
                >
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {isLocked && (
                      <FiLock className="text-2xl text-gray-400" />
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className={isLocked ? 'text-gray-500' : ''}>
                      {testSet.name}
                    </CardTitle>
                    <CardDescription className={isLocked ? 'text-gray-400' : ''}>
                      {testSet.description || 'No description available'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-4">
                      <div className={`flex items-center text-sm ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                        <FiClock className="mr-2" />
                        {testSet.durationMinutes} minutes
                      </div>
                      <div className={`flex items-center text-sm ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                        <FiFileText className="mr-2" />
                        {testSet.totalQuestions || 0} questions
                      </div>
                      <div className={`flex items-center text-sm ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                        <FiCheckCircle className="mr-2" />
                        {testSet.totalMarks} marks
                      </div>
                    </div>
                    {isLocked ? (
                      <Link to={`/categories/${categoryId}/payment`} className="block">
                        <Button className="w-full bg-purple-600 hover:bg-purple-700">
                          <FiLock className="mr-2" />
                          Unlock to Start
                        </Button>
                      </Link>
                    ) : (() => {
                      const attemptStatus = getAttemptStatus(testSet._id)
                      
                      if (attemptStatus?.status === 'IN_PROGRESS') {
                        return (
                          <Link to={`/test/${testSet._id}/attempt/${attemptStatus.attemptId}`} className="block">
                            <Button className="w-full bg-green-600 hover:bg-green-700">
                              <FiPlay className="mr-2" />
                              Resume
                            </Button>
                          </Link>
                        )
                      }
                      
                      if (attemptStatus?.status === 'COMPLETED') {
                        return (
                          <Link to={`/test/${testSet._id}/results/${attemptStatus.attemptId}`} className="block">
                            <Button className="w-full bg-purple-600 hover:bg-purple-700">
                              <FiEye className="mr-2" />
                              Show Result
                            </Button>
                          </Link>
                        )
                      }
                      
                      return (
                        <Button
                          className="w-full"
                          onClick={() => handleStartTest(testSet._id)}
                          disabled={startAttemptMutation.isPending}
                        >
                          {startAttemptMutation.isPending ? 'Starting...' : 'Attempt'}
                        </Button>
                      )
                    })()}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="border-gray-300 bg-gray-50">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-gray-600">No test series available in this category yet.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resume Dialog */}
        {showResumeDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Resume Test or Start New?</CardTitle>
                  <button
                    onClick={() => {
                      setShowResumeDialog(false)
                      setSelectedTestSetId(null)
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  You have {inProgressAttempts?.length || 0} in-progress test{inProgressAttempts?.length !== 1 ? 's' : ''}. Choose an option:
                </p>
                <div className="space-y-4">
                  {inProgressAttempts && inProgressAttempts.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Resume Existing Test:</h3>
                      <div className="space-y-2">
                        {inProgressAttempts.map((attempt: any) => (
                          <Card key={attempt._id} className="hover:bg-gray-50 cursor-pointer">
                            <CardContent className="pt-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">{attempt.testSetId?.name || 'Test'}</p>
                                  <p className="text-sm text-gray-600">
                                    Started: {new Date(attempt.startedAt).toLocaleString()}
                                  </p>
                                </div>
                                <Button
                                  onClick={() => handleResumeAttempt(attempt._id)}
                                  variant="outline"
                                >
                                  Resume
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-4 border-t">
                    <Button onClick={handleStartNewTest} className="w-full">
                      Start New Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}

