import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FiClock, FiAward, FiTrendingUp, FiArrowRight } from 'react-icons/fi'

export default function WeeklyLiveExamBanner() {
  return (
    <Card className="mb-16 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 border border-purple-200 shadow-lg relative overflow-hidden rounded-xl">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 1200 300" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <pattern id="dots-banner" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#9333EA" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-banner)" />
        </svg>
      </div>
      
      <CardContent className="p-8 md:p-12 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4 shadow-sm border border-purple-200">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              LIVE THIS SUNDAY
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Weekly Live Exam
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Join thousands of students every Sunday at 1:00 PM
            </p>
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <FiClock className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-medium">Every Sunday, 1:00 PM</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <FiAward className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-medium">Real-time Rankings</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <FiTrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-medium">Detailed Performance Report</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-white rounded-2xl p-6 mb-4 shadow-md border border-purple-200">
              <div className="text-4xl font-bold text-purple-600 mb-2">SUN</div>
              <div className="text-xl text-gray-700 font-semibold">1:00 PM</div>
            </div>
            <Button size="lg" className="bg-purple-600 text-white hover:bg-purple-700 shadow-md">
              Register Now
              <FiArrowRight className="ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

