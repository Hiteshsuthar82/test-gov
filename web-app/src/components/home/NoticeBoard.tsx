import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

interface NoticeBoardProps {
  notices?: Notice[]
  isLoading?: boolean
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function NoticeBoard({ notices, isLoading }: NoticeBoardProps) {
  if (!notices || notices.length === 0) {
    return null
  }

  const hasMoreNotices = notices.length > 2

  return (
    <div className="mb-12 flex justify-center">
      <Card className="w-full max-w-4xl shadow-lg border border-gray-200 bg-white">
        <CardContent className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="bg-blue-600 p-2.5 rounded-lg">
              <FiBell className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Latest Updates & Announcements</h2>
          </div>

          {/* Notices List - Show only 2 */}
          <div className="space-y-4 mb-6">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-20 bg-gray-100 rounded-lg"></div>
                <div className="h-20 bg-gray-100 rounded-lg"></div>
              </div>
            ) : (
              notices.slice(0, 2).map((notice: Notice) => (
                <div
                  key={notice._id}
                  className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-base md:text-lg">
                          {notice.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                        <FiCalendar className="w-3.5 h-3.5" />
                        <span>Published on {formatDate(notice.createdAt)}</span>
                      </div>
                      <p className="text-gray-600 text-sm md:text-base leading-relaxed mb-3">
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
                </div>
              ))
            )}
          </div>

          {/* Show More Button */}
          {hasMoreNotices && (
            <div className="flex justify-center pt-4 border-t border-gray-200">
              <Link to="/notices">
                <Button variant="outline" className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50">
                  Show More Notices
                  <FiArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

