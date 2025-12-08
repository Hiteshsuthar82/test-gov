import { Card, CardContent } from '@/components/ui/card'
import { FiBell, FiCheckCircle, FiArrowRight } from 'react-icons/fi'

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

export default function NoticeBoard({ notices, isLoading }: NoticeBoardProps) {
  if (!notices || notices.length === 0) {
    return null
  }

  return (
    <Card className="mb-12 shadow-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-rose-50 relative overflow-hidden">
      {/* Notice board background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="80" fill="url(#noticeGradient)" />
          <defs>
            <linearGradient id="noticeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9333EA" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-600 p-2 rounded-lg">
            <FiBell className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Latest Updates & Announcements</h2>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-16 bg-purple-100 rounded-lg"></div>
              <div className="h-16 bg-purple-100 rounded-lg"></div>
            </div>
          ) : (
            notices.slice(0, 3).map((notice: Notice) => (
              <div
                key={notice._id}
                className="bg-white rounded-lg p-4 border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                      <FiCheckCircle className="text-purple-600" />
                      {notice.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{notice.description}</p>
                    {notice.linkUrl && notice.linkText && (
                      <a
                        href={notice.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium mt-2 inline-flex items-center gap-1"
                      >
                        {notice.linkText}
                        <FiArrowRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

