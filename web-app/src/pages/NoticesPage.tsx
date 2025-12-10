import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Layout from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { FiBell, FiArrowRight, FiCalendar } from 'react-icons/fi'

interface Notice {
  _id: string
  title: string
  description: string
  linkUrl?: string
  linkText?: string
  isActive: boolean
  createdAt: string
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function NoticesPage() {
  const { data: notices, isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      const response = await api.get('/notices?active=true')
      return response.data.data || []
    },
  })

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-600 p-3 rounded-lg">
                <FiBell className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Notice Board</h1>
            </div>
            <p className="text-gray-600 ml-14">Stay updated with the latest announcements and important information</p>
          </div>

          {/* Notices List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
                ))}
              </div>
            ) : notices && notices.length > 0 ? (
              notices.map((notice: Notice) => (
                <Card key={notice._id} className="shadow-md border border-gray-200 bg-white hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg md:text-xl">
                            {notice.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                          <FiCalendar className="w-4 h-4" />
                          <span>Published on {formatDate(notice.createdAt)}</span>
                        </div>
                        <p className="text-gray-600 text-base leading-relaxed mb-4">
                          {notice.description}
                        </p>
                        {notice.linkUrl && notice.linkText && (
                          <a
                            href={notice.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1.5 transition-colors"
                          >
                            {notice.linkText}
                            <FiArrowRight className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="shadow-md border border-gray-200 bg-white">
                <CardContent className="p-12 text-center">
                  <FiBell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No notices available at the moment</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

