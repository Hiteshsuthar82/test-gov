import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FiBook, FiClock, FiUsers, FiTrendingUp } from 'react-icons/fi'
import Layout from '@/components/layout/Layout'

interface Category {
  _id: string
  name: string
  description: string
  price: number
  bannerImageUrl?: string
  isActive: boolean
}

export default function HomePage() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories')
      // API returns { data: { categories: [...], pagination: {...} } }
      const categoriesData = response.data.data?.categories || response.data.data || []
      return Array.isArray(categoriesData) 
        ? categoriesData.filter((cat: Category) => cat.isActive)
        : []
    },
  })

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            One Destination for Complete Exam Preparation
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Learn • Practice • Improve • Succeed
          </p>
          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-purple-600">7.8+ Crore</div>
              <div className="text-sm text-gray-600">Registered Students</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">4+ Lacs</div>
              <div className="text-sm text-gray-600">Student Selections</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">242+ Crore</div>
              <div className="text-sm text-gray-600">Tests Attempted</div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Popular Categories</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-t-lg" />
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : categories && categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category: Category) => (
                <Card key={category._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {category.bannerImageUrl && (
                    <img
                      src={category.bannerImageUrl}
                      alt={category.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <CardHeader>
                    <CardTitle>{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-2xl font-bold text-purple-600">
                        ₹{category.price}
                      </div>
                      <Link to={`/categories/${category._id}`}>
                        <Button>View Tests</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-gray-600">
                No categories available at the moment.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <Card className="text-center p-6">
            <FiBook className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Complete Study Material</h3>
            <p className="text-sm text-gray-600">Access comprehensive study materials for all exams</p>
          </Card>
          <Card className="text-center p-6">
            <FiClock className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Mock Tests</h3>
            <p className="text-sm text-gray-600">Practice with thousands of mock tests</p>
          </Card>
          <Card className="text-center p-6">
            <FiUsers className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Expert Guidance</h3>
            <p className="text-sm text-gray-600">Learn from India's best teachers</p>
          </Card>
          <Card className="text-center p-6">
            <FiTrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Performance Analytics</h3>
            <p className="text-sm text-gray-600">Track your progress and improve</p>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

