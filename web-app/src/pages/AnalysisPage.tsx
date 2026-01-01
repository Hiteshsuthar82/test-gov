import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Layout from '@/components/layout/Layout'
import { FiTrendingUp, FiAward, FiTarget, FiCheckCircle, FiClock } from 'react-icons/fi'

export default function AnalysisPage() {
  const { testSetId, attemptId } = useParams()

  // Fetch attempt deep dive data
  const { data: results, isLoading: isLoadingResults } = useQuery({
    queryKey: ['results', attemptId],
    queryFn: async () => {
      const response = await api.get(`/attempts/${attemptId}/deep-dive`)
      return response.data.data
    },
  })

  // Fetch leaderboard for top rankers
  const { data: leaderboardData, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['leaderboard', testSetId],
    queryFn: async () => {
      if (!results?.categoryId || !testSetId) return null
      const response = await api.get(`/leaderboard?categoryId=${results.categoryId}&testSetId=${testSetId}&limit=10`)
      return response.data.data
    },
    enabled: !!results?.categoryId && !!testSetId,
  })

  // Fetch all attempts for this test set to calculate percentile
  const { data: allAttemptsData } = useQuery({
    queryKey: ['allAttempts', testSetId],
    queryFn: async () => {
      if (!testSetId) return null
      const response = await api.get(`/attempts?testSetId=${testSetId}`)
      return response.data.data
    },
    enabled: !!testSetId,
  })

  if (isLoadingResults) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">Loading...</div>
      </Layout>
    )
  }

  if (!results) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">Results not found</div>
      </Layout>
    )
  }

  // Calculate stats
  const totalMarks = results.totalMarks || results.questions?.reduce((sum: number, q: any) => sum + (q.marks || 1), 0) || 0
  const totalScore = results.totalScore || 0
  const totalCorrect = results.totalCorrect || 0
  const totalWrong = results.totalWrong || 0
  const attemptedQuestions = totalCorrect + totalWrong
  const accuracy = attemptedQuestions > 0 ? (totalCorrect / attemptedQuestions) * 100 : 0

  // Calculate percentile
  let percentile = 0
  if (allAttemptsData && Array.isArray(allAttemptsData)) {
    const scores = allAttemptsData
      .filter((a: any) => a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED')
      .map((a: any) => a.totalScore || 0)
      .sort((a: number, b: number) => b - a)
    
    if (scores.length > 0) {
      const rank = scores.findIndex((score: number) => score <= totalScore) + 1
      percentile = ((scores.length - rank) / scores.length) * 100
    }
  }

  // Get user's rank
  let userRank = 0
  if (leaderboardData?.leaderboard) {
    const userEntry = leaderboardData.leaderboard.find((entry: any) => entry.score === totalScore)
    userRank = userEntry?.rank || 0
  }

  // Calculate sectional summary
  const sections = results.testSet?.sections || []
  const sectionalData: any[] = []

  sections.forEach((section: any) => {
    const sectionQuestions = results.questions?.filter((q: any) => q.sectionId === section.sectionId) || []
    const sectionCorrect = sectionQuestions.filter((q: any) => q.isCorrect).length
    const sectionWrong = sectionQuestions.filter((q: any) => q.isCorrect === false && q.selectedOptionId).length
    const sectionAttempted = sectionCorrect + sectionWrong
    const sectionTotal = sectionQuestions.length
    const sectionGainedMarks = sectionQuestions.reduce((sum: number, q: any) => {
      if (q.isCorrect) return sum + (q.marks || 1)
      if (q.selectedOptionId && !q.isCorrect && results.testSet?.negativeMarking) {
        return sum - (results.testSet.negativeMarking || 0)
      }
      return sum
    }, 0)
    const sectionTotalMarks = sectionQuestions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0)
    const sectionAccuracy = sectionAttempted > 0 ? (sectionCorrect / sectionAttempted) * 100 : 0
    const sectionTimeTaken = sectionQuestions.reduce((sum: number, q: any) => sum + (q.timeSpentSeconds || 0), 0)
    const sectionTotalTime = section.durationMinutes ? section.durationMinutes * 60 : 0

    sectionalData.push({
      sectionName: section.name,
      score: `${sectionGainedMarks} / ${sectionTotalMarks}`,
      attempted: `${sectionAttempted} / ${sectionTotal}`,
      accuracy: `${sectionAccuracy.toFixed(1)}%`,
      time: sectionTotalTime > 0 
        ? `${Math.floor(sectionTimeTaken / 60)}m ${sectionTimeTaken % 60}s / ${Math.floor(sectionTotalTime / 60)}m ${sectionTotalTime % 60}s`
        : `${Math.floor(sectionTimeTaken / 60)}m ${sectionTimeTaken % 60}s`,
    })
  })

  // Overall row
  const overallAccuracy = attemptedQuestions > 0 ? (totalCorrect / attemptedQuestions) * 100 : 0
  const totalTimeTaken = results.questions?.reduce((sum: number, q: any) => sum + (q.timeSpentSeconds || 0), 0) || 0
  const totalTime = results.testSet?.durationMinutes ? results.testSet.durationMinutes * 60 : 0

  sectionalData.push({
    sectionName: 'Overall',
    score: `${totalScore} / ${totalMarks}`,
    attempted: `${attemptedQuestions} / ${results.questions?.length || 0}`,
    accuracy: `${overallAccuracy.toFixed(1)}%`,
    time: totalTime > 0
      ? `${Math.floor(totalTimeTaken / 60)}m ${totalTimeTaken % 60}s / ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`
      : `${Math.floor(totalTimeTaken / 60)}m ${totalTimeTaken % 60}s`,
  })

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Test Analysis</h1>
          <p className="text-gray-600">Detailed performance analysis and insights</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Rank</p>
                  <p className="text-3xl font-bold text-purple-700">
                    {userRank > 0 ? `#${userRank}` : 'N/A'}
                  </p>
                </div>
                <FiAward className="w-12 h-12 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Score</p>
                  <p className="text-3xl font-bold text-green-700">{totalScore}</p>
                </div>
                <FiTrendingUp className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Attempted Questions</p>
                  <p className="text-3xl font-bold text-blue-600">{attemptedQuestions}</p>
                </div>
                <FiCheckCircle className="w-12 h-12 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Accuracy</p>
                  <p className="text-3xl font-bold text-orange-600">{accuracy.toFixed(1)}%</p>
                </div>
                <FiTarget className="w-12 h-12 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Percentile</p>
                  <p className="text-3xl font-bold text-indigo-600">{percentile.toFixed(1)}%</p>
                </div>
                <FiClock className="w-12 h-12 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sectional Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Sectional Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold">Section Name</th>
                    <th className="text-center py-3 px-4 font-semibold">Score</th>
                    <th className="text-center py-3 px-4 font-semibold">Attempted</th>
                    <th className="text-center py-3 px-4 font-semibold">Accuracy</th>
                    <th className="text-center py-3 px-4 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionalData.map((row, index) => (
                    <tr
                      key={index}
                      className={`border-b ${row.sectionName === 'Overall' ? 'bg-gray-50 font-semibold' : ''}`}
                    >
                      <td className="py-3 px-4">{row.sectionName}</td>
                      <td className="py-3 px-4 text-center">{row.score}</td>
                      <td className="py-3 px-4 text-center">{row.attempted}</td>
                      <td className="py-3 px-4 text-center">{row.accuracy}</td>
                      <td className="py-3 px-4 text-center">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Rankers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Rankers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingLeaderboard ? (
              <div className="text-center py-8">Loading rankers...</div>
            ) : leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboardData.leaderboard.slice(0, 10).map((ranker: any) => (
                  <div
                    key={ranker.userId}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      ranker.rank === 1
                        ? 'bg-yellow-50 border-yellow-200'
                        : ranker.rank === 2
                        ? 'bg-gray-50 border-gray-200'
                        : ranker.rank === 3
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          ranker.rank === 1
                            ? 'bg-yellow-400 text-yellow-900'
                            : ranker.rank === 2
                            ? 'bg-gray-400 text-gray-900'
                            : ranker.rank === 3
                            ? 'bg-orange-400 text-orange-900'
                            : 'bg-blue-400 text-blue-900'
                        }`}
                      >
                        {ranker.rank}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{ranker.userName}</p>
                        <p className="text-sm text-gray-500">{ranker.userEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">{ranker.score}</p>
                      <p className="text-xs text-gray-500">
                        {Math.floor(ranker.timeSeconds / 60)}m {ranker.timeSeconds % 60}s
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No rankers available yet</div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center gap-4">
          <Link to={`/test/${testSetId}/solution/${attemptId}`}>
            <Button variant="outline">View Solution</Button>
          </Link>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    </Layout>
  )
}

