import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import Layout from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FiTarget, FiArrowRight, FiZap, FiGlobe, FiSearch } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'

interface Category {
  _id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  discountedPrice?: number
  hasDiscount?: boolean
  bannerImageUrl?: string
  isActive: boolean
  totalSetsCount?: number
  userCount?: number
  totalTests?: number
  freeTests?: number
  languages?: string | string[]
  completedSetsCount?: number
}

// Helper function to format user count
const formatUserCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return count.toString()
}

interface TestAttempt {
  _id: string
  testSetId: {
    _id: string
    name: string
  }
  categoryId: {
    _id: string
    name: string
    bannerImageUrl?: string
  }
  status: 'SUBMITTED' | 'AUTO_SUBMITTED' | 'IN_PROGRESS'
  createdAt: string
}

interface RecentTestSeries {
  categoryId: string
  categoryName: string
  bannerImageUrl?: string
  completedTests: number
  totalTests: number
  latestAttemptDate: string
  userCount?: number
}

export default function AllCategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const { user } = useAuthStore()

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch user attempts for recent test series
  const { data: attempts } = useQuery({
    queryKey: ['user-attempts'],
    queryFn: async () => {
      try {
        const response = await api.get('/attempts')
        return response.data.data || []
      } catch (error) {
        return []
      }
    },
    enabled: !!user,
  })

  // Fetch categories with search query
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', debouncedSearchQuery],
    queryFn: async () => {
      const params = debouncedSearchQuery.trim() 
        ? { search: debouncedSearchQuery.trim() }
        : {}
      const response = await api.get('/categories', { params })
      const categoriesData = response.data.data?.categories || response.data.data || []
      return Array.isArray(categoriesData) 
        ? categoriesData.filter((cat: Category) => cat.isActive)
        : []
    },
  })

  // Process attempts to get recent test series grouped by category
  const recentTestSeries = useMemo(() => {
    if (!attempts || !Array.isArray(attempts) || !categories) return []

    // Group attempts by category
    const categoryMap = new Map<string, {
      categoryId: string
      categoryName: string
      bannerImageUrl?: string
      completedTestSets: Set<string>
      latestAttemptDate: string
      userCount?: number
    }>()

    attempts.forEach((attempt: TestAttempt) => {
      if (attempt.status !== 'SUBMITTED' && attempt.status !== 'AUTO_SUBMITTED') return
      
      const categoryId = attempt.categoryId?._id || ''
      if (!categoryId) return

      const existing = categoryMap.get(categoryId)
      const testSetId = attempt.testSetId?._id || ''
      const attemptDate = attempt.createdAt

      if (existing) {
        existing.completedTestSets.add(testSetId)
        if (new Date(attemptDate) > new Date(existing.latestAttemptDate)) {
          existing.latestAttemptDate = attemptDate
        }
      } else {
        const category = categories.find((cat: Category) => cat._id === categoryId)
        categoryMap.set(categoryId, {
          categoryId,
          categoryName: attempt.categoryId?.name || category?.name || 'Unknown',
          bannerImageUrl: attempt.categoryId?.bannerImageUrl || category?.bannerImageUrl,
          completedTestSets: new Set([testSetId]),
          latestAttemptDate: attemptDate,
          userCount: category?.userCount,
        })
      }
    })

    // Convert to array and add total tests count
    const seriesArray: RecentTestSeries[] = Array.from(categoryMap.values()).map(item => {
      const category = categories.find((cat: Category) => cat._id === item.categoryId)
      return {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        bannerImageUrl: item.bannerImageUrl,
        completedTests: item.completedTestSets.size,
        totalTests: category?.totalTests || category?.totalSetsCount || 0,
        latestAttemptDate: item.latestAttemptDate,
        userCount: item.userCount || category?.userCount,
      }
    })

    // Sort by latest attempt date and return top 4
    return seriesArray
      .sort((a, b) => new Date(b.latestAttemptDate).getTime() - new Date(a.latestAttemptDate).getTime())
      .slice(0, 4)
  }, [attempts, categories])

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!categories) return []
    if (!searchQuery.trim()) return categories
    
    const query = searchQuery.toLowerCase()
    return categories.filter((category: Category) => 
      category.name.toLowerCase().includes(query) ||
      category.description?.toLowerCase().includes(query)
    )
  }, [categories, searchQuery])

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-4 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search Bar - Always on top */}
          <div className="mb-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>

          {/* Your Recent Test Series Section - Only show when not searching */}
          {user && recentTestSeries.length > 0 && !debouncedSearchQuery.trim() && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Your Recent Test Series
                </h2>
                {attempts && Array.isArray(attempts) && attempts.length > 4 && (
                  <Link 
                    to="/results" 
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View all Attempted Tests
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentTestSeries.map((series) => {
                  const progressPercentage = series.totalTests > 0 
                    ? Math.round((series.completedTests / series.totalTests) * 100) 
                    : 0
                  const userCountFormatted = formatUserCount(series.userCount || 0)
                  
                  return (
                    <Card
                      key={series.categoryId}
                      className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-white rounded-lg shadow-sm flex flex-col"
                    >
                      {/* Header with gradient */}
                      <div className="relative bg-gradient-to-b from-purple-200 to-transparent pt-3 px-4 pb-2 flex-shrink-0">
                        <div className="flex items-start justify-between">
                          {/* Left: Circular Logo/Icon */}
                          <div className="flex items-center">
                            {series.bannerImageUrl ? (
                              <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-sm border border-white">
                                <img
                                  src={series.bannerImageUrl}
                                  alt={series.categoryName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-rose-500 flex items-center justify-center shadow-sm">
                                <FiTarget className="w-6 h-6 text-white" />
                              </div>
                            )}
                          </div>
                          
                          {/* Right: User Count Badge */}
                          {series.userCount && series.userCount > 0 && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                              <FiZap className="w-3 h-3 text-yellow-500" />
                              <span className="text-[10px] font-medium text-gray-700">
                                {userCountFormatted}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <CardContent className="px-4 pt-3 pb-4 flex-1 flex flex-col justify-between">
                        <div className="flex-1">
                          {/* Title */}
                          <h3 className="text-sm font-bold text-gray-900 mb-3 leading-tight line-clamp-2 min-h-[2.5rem]">
                            {series.categoryName}
                          </h3>

                          {/* Progress Info */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-gray-600">
                                {series.completedTests}/{series.totalTests} tests
                              </span>
                              <span className="text-xs text-gray-500">
                                {progressPercentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="mt-auto">
                          <Link 
                            to={`/categories/${series.categoryId}`}
                            className="block"
                          >
                            <button className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium text-xs py-2.5 px-4 rounded-md transition-colors duration-200">
                              Go To Test Series
                            </button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Heading - Only show when not searching */}
          {!debouncedSearchQuery.trim() && (
            <div className="mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                All Exam Categories
              </h1>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-64 bg-gray-200 rounded-lg" />
                </Card>
              ))}
            </div>
          ) : filteredCategories && filteredCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCategories.map((category: Category) => {
                const userCount = category.userCount || 0
                const totalTests = category.totalTests || category.totalSetsCount || 0
                const freeTests = category.freeTests || 0
                const languages = category.languages || ['English', 'Hindi']
                const userCountFormatted = formatUserCount(userCount)
                
                return (
                  <Card
                    key={category._id}
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-purple-50 rounded-lg shadow-sm flex flex-col"
                  >
                    {/* Header Section with gradient background - Light Purple to Transparent (Top to Bottom) */}
                    <div className="relative bg-gradient-to-b from-purple-200 to-transparent pt-3 px-4 pb-2 flex-shrink-0">
                      <div className="flex items-start justify-between">
                        {/* Left: Circular Logo/Icon */}
                        <div className="flex items-center">
                          {category.bannerImageUrl ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm border border-white">
                              <img
                                src={category.bannerImageUrl}
                                alt={category.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-rose-500 flex items-center justify-center shadow-sm">
                              <FiTarget className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Right: User Count Badge */}
                        {userCount > 0 && (
                          <div className="bg-purple-100 rounded-full px-2 py-1 flex items-center gap-1">
                            <FiZap className="w-3 h-3 text-yellow-500" />
                            <span className="text-[10px] font-medium text-gray-700">
                              {userCountFormatted} students
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <CardContent className="px-4 pt-3 pb-4 flex-1 flex flex-col justify-between">
                      <div className="flex-1">
                        {/* Title Section */}
                        <h3 className="text-xs font-bold text-gray-900 mb-2 leading-tight line-clamp-2 min-h-[2rem]">
                          {category.name}
                        </h3>

                        {/* Progress Bar - Completed Sets / Total Sets */}
                        {totalTests > 0 && (
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-gray-600">
                                {category.completedSetsCount || 0}/{totalTests} Completed
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {totalTests > 0 ? Math.round(((category.completedSetsCount || 0) / totalTests) * 100) : 0}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                style={{
                                  width: `${totalTests > 0 ? ((category.completedSetsCount || 0) / totalTests) * 100 : 0}%`
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Test Statistics */}
                        <div className="mb-2">
                          <span className="text-[10px] text-gray-600">
                            {totalTests} Tests
                            {freeTests > 0 && (
                              <>
                                {' | '}
                                <span className="text-green-600 font-semibold">
                                  {freeTests} Free
                                </span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Language Information */}
                        {languages && (Array.isArray(languages) ? languages.length > 0 : languages) && (
                          <div className="flex items-center gap-1 mb-2">
                            <FiGlobe className="w-2.5 h-2.5 text-blue-400 flex-shrink-0" />
                            <span className="text-[10px] text-blue-400 line-clamp-1">
                              {Array.isArray(languages) 
                                ? languages.join(', ')
                                : languages}
                            </span>
                          </div>
                        )}

                        {/* 2-Line Description */}
                        <div className="mb-2 min-h-[2rem]">
                          <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-2">
                            {category.description || 'Comprehensive test series for banking exam preparation.'}
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-auto">
                        <Link 
                          to={`/categories/${category._id}`}
                          className="block"
                        >
                          <button className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium text-[10px] py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-1">
                            View Tests
                            <FiArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : searchQuery ? (
            <Card>
              <CardContent className="pt-4 text-center text-gray-600 py-8">
                <FiTarget className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No categories found matching "{searchQuery}"</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-4 text-center text-gray-600 py-8">
                <FiTarget className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No categories available at the moment.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}
