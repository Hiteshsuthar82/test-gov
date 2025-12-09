import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Layout from '@/components/layout/Layout'
import { FiArrowLeft, FiCheckCircle, FiXCircle, FiClock, FiCalendar, FiTrendingUp, FiList, FiPlay } from 'react-icons/fi'

interface TestAttempt {
  _id: string
  totalScore: number
  totalCorrect: number
  totalWrong: number
  totalUnanswered: number
  status: 'SUBMITTED' | 'AUTO_SUBMITTED' | 'IN_PROGRESS'
  startedAt: string
  endedAt?: string
  totalTimeSeconds?: number // Sum of time spent on all questions
  createdAt: string
}

export default function TestAttemptsHistoryPage() {
  const { testSetId } = useParams()

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['test-attempts', testSetId],
    queryFn: async () => {
      const response = await api.get(`/sets/${testSetId}/attempts`)
      return response.data.data
    },
    enabled: !!testSetId,
  })

  const { data: testSetData } = useQuery({
    queryKey: ['test-set', testSetId],
    queryFn: async () => {
      try {
        const response = await api.get(`/sets/${testSetId}/details`)
        return response.data.data
      } catch {
        return null
      }
    },
    enabled: !!testSetId,
  })

  const testSet = testSetData?.set
  const stats = testSetData?.stats

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDuration = (attempt: TestAttempt) => {
    // Use totalTimeSeconds (sum of question times) if available, otherwise calculate from dates
    if (attempt.totalTimeSeconds !== undefined && attempt.totalTimeSeconds > 0) {
      const totalSeconds = attempt.totalTimeSeconds
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      
      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`
      } else {
        return `${seconds}s`
      }
    }
    
    // Fallback to date calculation if totalTimeSeconds is not available
    if (!attempt.endedAt) return 'N/A'
    const start = new Date(attempt.startedAt).getTime()
    const end = new Date(attempt.endedAt).getTime()
    const minutes = Math.floor((end - start) / 60000)
    return `${minutes} minutes`
  }

  const getScorePercentage = (score: number, totalMarks: number) => {
    if (totalMarks === 0) return 0
    return ((score / totalMarks) * 100).toFixed(1)
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link to={testSet?.categoryId ? `/categories/${testSet.categoryId}` : '/'}>
            <Button variant="outline" className="mb-4">
              <FiArrowLeft className="mr-2" />
              Back to Category
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {testSet?.name || 'Test Attempts History'}
          </h1>
          {testSet && (
            <p className="text-lg text-gray-600">
              View all your past attempts for this test
            </p>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Attempts</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
                  </div>
                  <FiTrendingUp className="text-3xl text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Best Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.bestScore} / {testSet.totalMarks}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getScorePercentage(stats.bestScore, testSet.totalMarks)}%
                    </p>
                  </div>
                  <FiCheckCircle className="text-3xl text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Last Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.lastScore} / {testSet.totalMarks}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getScorePercentage(stats.lastScore, testSet.totalMarks)}%
                    </p>
                  </div>
                  <FiClock className="text-3xl text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Attempt History</h2>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : attempts && attempts.length > 0 ? (
          <div className="space-y-4">
            {attempts.map((attempt: TestAttempt) => (
              <Card key={attempt._id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Attempt #{attempts.indexOf(attempt) + 1}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {attempt.status.replace('_', ' ')}
                        </span>
                      </div>
                      {attempt.status === 'IN_PROGRESS' ? (
                        <div className="mb-3">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                              <FiClock className="inline mr-2" />
                              This test is in progress. Resume to continue where you left off.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Score</p>
                            <p className="text-lg font-bold text-gray-900">
                              {attempt.totalScore} / {testSet?.totalMarks || 'N/A'}
                            </p>
                            {testSet && (
                              <p className="text-xs text-gray-500">
                                {getScorePercentage(attempt.totalScore, testSet.totalMarks)}%
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Correct</p>
                            <p className="text-lg font-bold text-green-600 flex items-center">
                              <FiCheckCircle className="mr-1" />
                              {attempt.totalCorrect}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Wrong</p>
                            <p className="text-lg font-bold text-red-600 flex items-center">
                              <FiXCircle className="mr-1" />
                              {attempt.totalWrong}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Unanswered</p>
                            <p className="text-lg font-bold text-gray-600">
                              {attempt.totalUnanswered}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <FiCalendar className="mr-2" />
                          <span>Started: {formatDate(attempt.startedAt)}</span>
                        </div>
                        {attempt.endedAt && (
                          <div className="flex items-center">
                            <FiClock className="mr-2" />
                            <span>Duration: {getDuration(attempt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {attempt.status === 'IN_PROGRESS' ? (
                        <Link to={`/test/${testSetId}/attempt/${attempt._id}`}>
                          <Button className="bg-green-600 hover:bg-green-700">
                            <FiPlay className="mr-2" />
                            Resume Test
                          </Button>
                        </Link>
                      ) : (attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED') ? (
                        <Link to={`/test/${testSetId}/results/${attempt._id}`}>
                          <Button className="bg-purple-600 hover:bg-purple-700">
                            View Results
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <div className="text-gray-400 mb-4">
                <FiClock className="mx-auto text-6xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Attempts Yet</h3>
              <p className="text-gray-600 mb-6">
                You haven't attempted this test yet. Start your first attempt to see results here.
              </p>
              {testSet?.categoryId && (
                <Link to={`/categories/${testSet.categoryId}`}>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Go to Category
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}

