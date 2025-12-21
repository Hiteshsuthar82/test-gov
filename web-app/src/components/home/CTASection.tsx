import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FiArrowRight } from 'react-icons/fi'

interface Category {
  _id: string
}

interface CTASectionProps {
  categories?: Category[]
}

export default function CTASection({ categories }: CTASectionProps) {
  return (
    <div className="mb-16 text-center bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 rounded-xl p-12 border border-purple-200 shadow-lg relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 1200 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <pattern id="dots-cta" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#9333EA" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-cta)" />
        </svg>
      </div>
      
      <div className="relative z-10 max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Ready to Boost Your Banking Exam Speed?
        </h2>
        <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
          Join thousands of students who are improving their speed and accuracy every day
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to={categories && categories.length > 0 ? `/categories/${categories[0]._id}` : '#'}>
            <button className="group bg-purple-600 hover:bg-purple-700 text-white font-semibold text-lg px-10 py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
              <span>Start Your First Test</span>
              <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </Link>
          <Link to="/categories">
            <button className="group bg-white hover:bg-purple-50 text-purple-600 font-semibold text-lg px-10 py-4 rounded-lg border-2 border-purple-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
              <span>View All Categories</span>
              <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

