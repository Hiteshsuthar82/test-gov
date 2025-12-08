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
    <div className="mb-16 text-center bg-gradient-to-r from-purple-600 via-rose-500 to-pink-500 rounded-2xl p-12 text-white shadow-2xl relative overflow-hidden">
      {/* CTA background SVG */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 1200 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <ellipse cx="600" cy="200" rx="500" ry="300" fill="url(#ctaGradient1)" />
          <path d="M0 200 Q300 150 600 200 T1200 200" stroke="white" strokeWidth="2" fill="none" opacity="0.3" />
          <path d="M0 250 Q300 200 600 250 T1200 250" stroke="white" strokeWidth="2" fill="none" opacity="0.2" />
          <defs>
            <radialGradient id="ctaGradient1" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
      
      <div className="relative z-10">
        <h2 className="text-4xl font-bold mb-4">Ready to Boost Your Banking Exam Speed?</h2>
        <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
          Join thousands of students who are improving their speed and accuracy every day
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to={categories && categories.length > 0 ? `/categories/${categories[0]._id}` : '#'}>
            <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50 text-lg px-8 py-6 h-auto">
              Start Your First Test
              <FiArrowRight className="ml-2" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6 h-auto">
            View All Categories
          </Button>
        </div>
      </div>
    </div>
  )
}

