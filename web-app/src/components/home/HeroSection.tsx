import { Link } from 'react-router-dom'
import { FiArrowRight } from 'react-icons/fi'
import heroImage from '@/assets/test-checklist-hero-img3.png'
import endlessConstellation from '@/assets/background-svgs/liquid-cheese.svg'

interface Category {
  _id: string
}

interface HeroSectionProps {
  categories?: Category[]
}

export default function HeroSection({ categories }: HeroSectionProps) {
  return (
    <div className="relative bg-white overflow-hidden">
      {/* Background SVG - Constellation pattern */}
      <img
        src={endlessConstellation}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ 
          zIndex: 1,
          opacity: 1,
          mixBlendMode: 'multiply'
        }}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 lg:py-24 relative z-10">
        <div className="relative">
          {/* Mobile: Image on top */}
          <div className="lg:hidden mb-8 -mx-4 sm:-mx-6">
            <div className="relative w-full h-64 sm:h-80 overflow-hidden">
              <img
                src={heroImage}
                alt="Exam Preparation"
                className="w-full h-full object-cover object-center"
              />
              {/* Overlay gradient for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left relative z-10">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                One Destination for
                <span className="block text-purple-600 mt-2">Complete Exam Preparation</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                India's trusted platform for government banking exam preparation. Practice, analyze, and succeed with our comprehensive test series.
              </p>
              
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                <div className="text-center lg:text-left">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">50K+</div>
                  <div className="text-sm text-gray-600">Active Students</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">1M+</div>
                  <div className="text-sm text-gray-600">Tests Attempted</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">500+</div>
                  <div className="text-sm text-gray-600">Test Sets</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">95%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to={categories && categories.length > 0 ? `/categories/${categories[0]._id}` : '#'}>
                  <button className="group bg-purple-600 hover:bg-purple-700 text-white font-semibold text-lg px-10 py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 w-full sm:w-auto justify-center">
                    <span>Start Free Tests</span>
                    <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>
                </Link>
                <Link to="/categories">
                  <button className="group bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-600 font-semibold text-lg px-10 py-4 rounded-lg border-2 border-gray-300 hover:border-purple-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 w-full sm:w-auto justify-center">
                    <span>View All Categories</span>
                    <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>
                </Link>
              </div>
            </div>

            {/* Desktop: Image overlapping left section */}
            <div className="hidden lg:flex items-center justify-end relative">
              <div className="relative w-full max-w-lg -ml-20 xl:-ml-32 z-0">
                <img
                  src={heroImage}
                  alt="Exam Preparation"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

