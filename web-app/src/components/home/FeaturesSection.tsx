import { Card, CardContent } from '@/components/ui/card'
import { 
  FiZap, 
  FiBarChart2, 
  FiCalendar, 
  FiUsers, 
  FiActivity,
  FiRefreshCw
} from 'react-icons/fi'

const features = [
  {
    icon: FiZap,
    title: 'Boost Your Speed',
    description: 'Multiple tests designed to increase your solving speed. Practice regularly and watch your time per question improve dramatically.',
    color: 'purple'
  },
  {
    icon: FiBarChart2,
    title: 'Detailed Analysis',
    description: 'Know exactly where you\'re stuck. See which questions take too much time and identify your weak areas with comprehensive analytics.',
    color: 'rose'
  },
  {
    icon: FiCalendar,
    title: 'Weekly Live Exams',
    description: 'Join our weekly live exam every Sunday at 1 PM. Compete with thousands of students and see where you stand.',
    color: 'pink'
  },
  {
    icon: FiUsers,
    title: 'Competitor Analysis',
    description: 'See how you compare with other students. Know where your competitors are spending time and where you need to focus more.',
    color: 'purple'
  },
  {
    icon: FiActivity,
    title: 'Speed Booster Tools',
    description: 'Special calculation speed booster tools to enhance your mental math and problem-solving speed. Practice makes perfect!',
    color: 'rose'
  },
  {
    icon: FiRefreshCw,
    title: 'Always Updated',
    description: 'We continuously add new test sets for each category. Your preparation never stops with fresh content every week.',
    color: 'pink'
  }
]

const colorClasses = {
  purple: 'bg-purple-600',
  rose: 'bg-rose-600',
  pink: 'bg-pink-600'
}

export default function FeaturesSection() {
  return (
    <div className="mb-16 relative">
      {/* Section background decoration */}
      <div className="absolute -top-20 -left-20 w-96 h-96 opacity-5">
        <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0 L400 0 L400 400 L0 400 Z" fill="url(#featurePattern)" />
          <defs>
            <pattern id="featurePattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <circle cx="40" cy="40" r="30" fill="#9333EA" opacity="0.1" />
            </pattern>
          </defs>
        </svg>
      </div>
      
      <div className="text-center mb-12 relative z-10">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Us?</h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          We focus solely on making you faster and better through comprehensive test practice
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {features.map((feature, index) => {
          const Icon = feature.icon
          const bgColor = colorClasses[feature.color as keyof typeof colorClasses] || 'bg-purple-600'
          
          return (
            <Card 
              key={index}
              className="bg-gradient-to-br from-purple-50 to-rose-50 border-2 border-purple-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-6">
                <div className={`${bgColor} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

