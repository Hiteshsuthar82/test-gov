import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Layout from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { FiAward, FiStar, FiClock, FiUser, FiTrendingUp } from 'react-icons/fi'

interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  userEmail: string
  score: number
  timeSeconds: number
}

export default function LeaderboardPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTestSet, setSelectedTestSet] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 50

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories')
      const categoriesData = response.data.data?.categories || response.data.data || []
      return Array.isArray(categoriesData)
        ? categoriesData.filter((cat: any) => cat.isActive)
        : []
    },
  })

  // Fetch test sets for selected category
  const { data: testSetsData } = useQuery({
    queryKey: ['testSets', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return []
      const response = await api.get(`/sets/categories/${selectedCategory}/sets/public`)
      return response.data.data?.filter((set: any) => set.isActive) || []
    },
    enabled: !!selectedCategory,
  })

  // Fetch leaderboard
  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ['leaderboard', selectedCategory, selectedTestSet, page],
    queryFn: async () => {
      if (!selectedCategory) return null
      const params: any = {
        categoryId: selectedCategory,
        page,
        limit: pageSize,
      }
      if (selectedTestSet) {
        params.testSetId = selectedTestSet
      }
      const response = await api.get('/leaderboard', { params })
      return response.data.data
    },
    enabled: !!selectedCategory,
  })

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <FiStar className="w-6 h-6 text-yellow-500 fill-yellow-500" />
    }
    if (rank === 2) {
      return <FiAward className="w-6 h-6 text-gray-400" />
    }
    if (rank === 3) {
      return <FiAward className="w-6 h-6 text-amber-600" />
    }
    return null
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300'
    if (rank === 3) return 'bg-amber-100 text-amber-800 border-amber-300'
    return 'bg-slate-100 text-slate-800 border-slate-300'
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Leaderboard</h1>
            <p className="text-slate-600">Compete with others and see where you rank</p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Category
                  </label>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value)
                      setSelectedTestSet('')
                      setPage(1)
                    }}
                    className="w-full"
                  >
                    <option value="">Choose a category</option>
                    {categoriesData?.map((cat: any) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {selectedCategory && testSetsData && testSetsData.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select Test Set (Optional)
                    </label>
                    <Select
                      value={selectedTestSet}
                      onChange={(e) => {
                        setSelectedTestSet(e.target.value)
                        setPage(1)
                      }}
                      className="w-full"
                    >
                      <option value="">All Test Sets</option>
                      {testSetsData.map((set: any) => (
                        <option key={set._id} value={set._id}>
                          {set.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard Table */}
          {!selectedCategory ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FiAward className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">Please select a category to view the leaderboard</p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto" />
                  <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ) : leaderboardData?.leaderboard?.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {leaderboardData.leaderboard.map((entry: LeaderboardEntry) => (
                        <tr
                          key={entry.userId}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {getRankIcon(entry.rank) || (
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRankBadgeColor(
                                    entry.rank
                                  )}`}
                                >
                                  #{entry.rank}
                                </span>
                              )}
                              {entry.rank <= 3 && (
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRankBadgeColor(
                                    entry.rank
                                  )}`}
                                >
                                  #{entry.rank}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                <FiUser className="w-5 h-5 text-slate-400" />
                              </div>
                              <div>
                                <div className="font-medium text-slate-800">{entry.userName}</div>
                                <div className="text-sm text-slate-500">{entry.userEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-lg font-bold text-slate-800">{entry.score}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2 text-slate-600">
                              <FiClock className="w-4 h-4" />
                              <span>{formatTime(entry.timeSeconds)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {leaderboardData.pagination && leaderboardData.pagination.total > pageSize && (
                  <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
                    <div className="text-sm text-slate-600">
                      Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, leaderboardData.pagination.total)} of {leaderboardData.pagination.total} entries
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= Math.ceil(leaderboardData.pagination.total / pageSize)}
                        className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FiAward className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">No leaderboard entries found for this selection</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}

