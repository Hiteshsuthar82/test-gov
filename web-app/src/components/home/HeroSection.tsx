import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FiArrowRight } from 'react-icons/fi'

interface Category {
  _id: string
}

interface HeroSectionProps {
  categories?: Category[]
}

export default function HeroSection({ categories }: HeroSectionProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-rose-500 to-pink-500 text-white">
      {/* Hero background SVG patterns */}
      <div className="absolute inset-0 overflow-hidden">
        <svg className="absolute top-0 right-0 w-full h-full opacity-20" viewBox="0 0 1440 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0 L1440 0 L1440 600 Q720 550 0 600 Z" fill="url(#heroGradient1)" />
          <path d="M1440 0 L1440 600 L0 600 Q720 500 1440 0 Z" fill="url(#heroGradient2)" />
          <defs>
            <linearGradient id="heroGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="heroGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Floating circles */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-40 w-48 h-48 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-40 right-1/4 w-36 h-36 bg-white/10 rounded-full blur-xl"></div>
      </div>
      <div className="absolute inset-0 bg-black opacity-10"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Master Banking Exams with
            <span className="block text-yellow-300">Speed & Precision</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-purple-100 max-w-3xl mx-auto">
            India's #1 Test Platform for Government Banking Exams
            <br />
            <span className="text-lg">Practice • Analyze • Improve • Succeed</span>
          </p>
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[180px]">
              <div className="text-3xl font-bold">50K+</div>
              <div className="text-sm text-purple-100">Active Students</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[180px]">
              <div className="text-3xl font-bold">1M+</div>
              <div className="text-sm text-purple-100">Tests Attempted</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[180px]">
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-purple-100">Test Sets</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[180px]">
              <div className="text-3xl font-bold">95%</div>
              <div className="text-sm text-purple-100">Success Rate</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to={categories && categories.length > 0 ? `/categories/${categories[0]._id}` : '#'}>
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50 text-lg px-8 py-6 h-auto">
                Start Free Tests
                <FiArrowRight className="ml-2" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6 h-auto">
              View All Categories
            </Button>
          </div>
        </div>
      </div>
      
      {/* Decorative waves with enhanced design */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="rgb(249 250 251)" />
          <path d="M0 100L60 95C120 90 240 80 360 75C480 70 600 70 720 72.5C840 75 960 80 1080 82.5C1200 85 1320 85 1380 85L1440 85V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="url(#waveGradient)" opacity="0.3" />
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9333EA" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#EC4899" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F472B6" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}

