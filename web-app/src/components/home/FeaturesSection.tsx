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
    description: 'Multiple tests designed to increase your solving speed. Practice regularly and watch your time improve.',
    bgColor: 'bg-yellow-50',
    iconBg: 'bg-yellow-400',
    blobColor: '#EAB308',
    rotation: '-rotate-3'
  },
  {
    icon: FiBarChart2,
    title: 'Detailed Analysis',
    description: 'Know exactly where you\'re stuck. See which questions take too much time and identify your weak areas.',
    bgColor: 'bg-purple-50',
    iconBg: 'bg-purple-500',
    blobColor: '#A855F7',
    rotation: 'rotate-2'
  },
  {
    icon: FiCalendar,
    title: 'Weekly Live Exams',
    description: 'Join our weekly live exam every Sunday at 1 PM. Compete with thousands of students.',
    bgColor: 'bg-pink-50',
    iconBg: 'bg-pink-500',
    blobColor: '#EC4899',
    rotation: '-rotate-2'
  },
  {
    icon: FiUsers,
    title: 'Competitor Analysis',
    description: 'See how you compare with other students. Know where your competitors are spending time.',
    bgColor: 'bg-blue-50',
    iconBg: 'bg-blue-500',
    blobColor: '#3B82F6',
    rotation: 'rotate-3'
  },
  {
    icon: FiActivity,
    title: 'Speed Booster Tools',
    description: 'Special calculation speed booster tools to enhance your mental math and problem-solving speed.',
    bgColor: 'bg-rose-50',
    iconBg: 'bg-rose-500',
    blobColor: '#F43F5E',
    rotation: '-rotate-1'
  },
  {
    icon: FiRefreshCw,
    title: 'Always Updated',
    description: 'We continuously add new test sets for each category. Your preparation never stops with fresh content.',
    bgColor: 'bg-indigo-50',
    iconBg: 'bg-indigo-500',
    blobColor: '#6366F1',
    rotation: 'rotate-2'
  }
]

export default function FeaturesSection() {
  return (
    <div className="mb-16 relative py-12 overflow-hidden">
      {/* Dotted connecting lines background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" style={{ zIndex: 0 }}>
        <defs>
          <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#9333EA" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
      
      <div className="text-center mb-12 relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Why <span className="text-blue-600">Choose</span> Us?
        </h2>
        <p className="text-base text-gray-600 max-w-2xl mx-auto">
          We focus solely on making you faster and better through comprehensive test practice
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10 px-4 max-w-6xl mx-auto">
        {features.map((feature, index) => {
          const Icon = feature.icon
          
          return (
            <div 
              key={index}
              className="relative group"
            >
              {/* Card */}
              <Card 
                className={`${feature.bgColor} ${feature.rotation} border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:rotate-0 relative overflow-visible`}
              >
                <CardContent className="p-5">
                  {/* Icon */}
                  <div className={`${feature.iconBg} w-10 h-10 rounded-lg flex items-center justify-center mb-3 shadow-md`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                    {feature.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
      
      {/* Decorative dotted line path */}
      <svg className="hidden lg:block absolute top-1/2 left-0 w-full h-full pointer-events-none opacity-10" style={{ zIndex: 0 }}>
        <path 
          d="M 100 300 Q 400 200 700 350 T 1200 300" 
          stroke="#9333EA" 
          strokeWidth="2" 
          strokeDasharray="8,8" 
          fill="none"
        />
      </svg>
    </div>
  )
}