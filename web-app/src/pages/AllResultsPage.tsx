import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Layout from '@/components/layout/Layout'
import { FiCheckCircle, FiXCircle, FiClock, FiCalendar, FiPlay, FiEye, FiList } from 'react-icons/fi'

interface TestAttempt {
  _id: string
  totalScore: number
  totalCorrect: number
  totalWrong: number
  totalUnanswered: number
  status: 'SUBMITTED' | 'AUTO_SUBMITTED' | 'IN_PROGRESS'
  startedAt: string
  endedAt?: string
  totalTimeSeconds?: number
  createdAt: string
  testSetId: {
    _id: string
    name: string
    totalMarks: number
    categoryId?: string
  }
  categoryId: {
    _id: string
    name: string
  }
}

export default function AllResultsPage() {
  const { data: attempts, isLoading } = useQuery({
    queryKey: ['all-attempts'],
    queryFn: async () => {
      const response = await api.get(`/attempts`)
      return response.data.data || []
    },
  })

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

  // Group attempts by test set and get the latest attempt for each
  const getLatestAttemptsByTestSet = () => {
    if (!attempts || !Array.isArray(attempts)) return []
    
    const testSetMap = new Map<string, TestAttempt>()
    
    attempts.forEach((attempt: TestAttempt) => {
      const testSetId = attempt.testSetId?._id || attempt.testSetId?.toString() || ''
      if (!testSetId) return
      
      const existing = testSetMap.get(testSetId)
      if (!existing || new Date(attempt.createdAt) > new Date(existing.createdAt)) {
        testSetMap.set(testSetId, attempt)
      }
    })
    
    return Array.from(testSetMap.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  const latestAttempts = getLatestAttemptsByTestSet()

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            All Test Results
          </h1>
          <p className="text-lg text-gray-600">
            View all your test attempts from all categories
          </p>
        </div>

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
        ) : latestAttempts && latestAttempts.length > 0 ? (
          <div className="space-y-4">
            {latestAttempts.map((attempt: TestAttempt) => {
              const testSetId = attempt.testSetId?._id || attempt.testSetId?.toString() || ''
              const testSetName = attempt.testSetId?.name || 'Unknown Test'
              const categoryName = attempt.categoryId?.name || 'Unknown Category'
              const totalMarks = attempt.testSetId?.totalMarks || 0
              
              return (
                <Card key={attempt._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {testSetName}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {attempt.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Category: {categoryName}
                        </p>
                        
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
                                {attempt.totalScore} / {totalMarks || 'N/A'}
                              </p>
                              {totalMarks > 0 && (
                                <p className="text-xs text-gray-500">
                                  {getScorePercentage(attempt.totalScore, totalMarks)}%
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
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {attempt.status === 'IN_PROGRESS' ? (
                          <Link to={`/test/${testSetId}/attempt/${attempt._id}`}>
                            <Button className="w-full bg-green-600 hover:bg-green-700">
                              <FiPlay className="mr-2" />
                              Resume
                            </Button>
                          </Link>
                        ) : (attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED') ? (
                          <Link to={`/test/${testSetId}/results/${attempt._id}`}>
                            <Button className="w-full bg-purple-600 hover:bg-purple-700">
                              <FiEye className="mr-2" />
                              View Result
                            </Button>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <div className="text-gray-400 mb-4">
                <FiList className="mx-auto text-6xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Attempts Yet</h3>
              <p className="text-gray-600 mb-6">
                You haven't attempted any tests yet. Start your first test to see results here.
              </p>
              <Link to="/">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Browse Categories
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}

