import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FiClock, FiAward, FiTrendingUp, FiArrowRight } from 'react-icons/fi'

export default function WeeklyLiveExamBanner() {
  return (
    <Card className="mb-16 bg-gradient-to-r from-purple-600 via-rose-500 to-pink-500 text-white border-0 shadow-2xl relative overflow-hidden">
      {/* Banner background SVG */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 1200 300" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 0 L1200 0 L1200 300 Q600 250 0 300 Z" fill="url(#bannerGradient1)" />
          <path d="M1200 0 L1200 300 L0 300 Q600 200 1200 0 Z" fill="url(#bannerGradient2)" />
          <circle cx="200" cy="150" r="100" fill="white" opacity="0.1" />
          <circle cx="1000" cy="150" r="80" fill="white" opacity="0.1" />
          <defs>
            <linearGradient id="bannerGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="bannerGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      <CardContent className="p-8 md:p-12 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-block bg-yellow-400 text-purple-900 px-4 py-1 rounded-full text-sm font-bold mb-4">
              🎯 LIVE THIS SUNDAY
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Weekly Live Exam
            </h2>
            <p className="text-lg text-purple-100 mb-4">
              Join thousands of students every Sunday at 1:00 PM
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FiClock className="w-5 h-5" />
                <span>Every Sunday, 1:00 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <FiAward className="w-5 h-5" />
                <span>Real-time Rankings</span>
              </div>
              <div className="flex items-center gap-2">
                <FiTrendingUp className="w-5 h-5" />
                <span>Detailed Performance Report</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-4">
              <div className="text-5xl font-bold mb-2">SUN</div>
              <div className="text-2xl">1:00 PM</div>
            </div>
            <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
              Register Now
              <FiArrowRight className="ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

