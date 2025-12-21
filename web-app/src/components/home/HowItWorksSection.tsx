const steps = [
  {
    number: 1,
    icon: (
      <svg className="w-12 h-12 md:w-16 md:h-16" viewBox="0 0 24 24" fill="none">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2h16z" fill="#C084FC" />
        <circle cx="12" cy="7" r="4" fill="#7C3AED" />
      </svg>
    ),
    title: 'Choose Category',
    description: 'Select your banking exam category'
  },
  {
    number: 2,
    icon: (
      <svg className="w-12 h-12 md:w-16 md:h-16" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#C084FC" />
        <path d="M14 2v6h6" fill="#7C3AED" />
        <rect x="8" y="13" width="8" height="2" rx="1" fill="#7C3AED" />
        <rect x="8" y="17" width="8" height="2" rx="1" fill="#7C3AED" />
        <rect x="8" y="9" width="2" height="2" rx="0.5" fill="#7C3AED" />
      </svg>
    ),
    title: 'Take Tests',
    description: 'Practice with multiple test sets'
  },
  {
    number: 3,
    icon: (
      <svg className="w-12 h-12 md:w-16 md:h-16" viewBox="0 0 24 24" fill="none">
        <rect x="17" y="10" width="2" height="10" rx="1" fill="#C084FC" />
        <rect x="11" y="4" width="2" height="16" rx="1" fill="#7C3AED" />
        <rect x="5" y="14" width="2" height="6" rx="1" fill="#C084FC" />
      </svg>
    ),
    title: 'Get Analysis',
    description: 'Receive detailed performance report'
  },
  {
    number: 4,
    icon: (
      <svg className="w-12 h-12 md:w-16 md:h-16" viewBox="0 0 24 24" fill="none">
        <path d="M1 18l8.5-7.5 5 5L23 6" stroke="#C084FC" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M17 6h6v6" stroke="#7C3AED" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
    title: 'Improve Speed',
    description: 'Identify weak areas and improve'
  }
]

export default function HowItWorksSection() {
  return (
    <div className="mb-16 bg-gradient-to-b from-gray-50 to-white rounded-2xl p-8 md:p-16 relative overflow-hidden">
      {/* Decorative stars/sparkles at top */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
        <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
          <path d="M10 8 L12 12 L16 14 L12 16 L10 20 L8 16 L4 14 L8 12 Z" fill="#1F2937" />
          <path d="M30 2 L31.5 5 L34.5 6.5 L31.5 8 L30 11 L28.5 8 L25.5 6.5 L28.5 5 Z" fill="#1F2937" />
          <path d="M50 6 L51.5 9 L54.5 10.5 L51.5 12 L50 15 L48.5 12 L45.5 10.5 L48.5 9 Z" fill="#1F2937" />
          <path d="M20 0 L21 2 L23 3 L21 4 L20 6 L19 4 L17 3 L19 2 Z" fill="#1F2937" />
          <path d="M42 1 L43 3 L45 4 L43 5 L42 7 L41 5 L39 4 L41 3 Z" fill="#1F2937" />
        </svg>
      </div>

      <div className="text-center mb-16 relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Learn More About Process</h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Was are delightful solicitude discovered collecting man day. Resolving neglected sir tolerably.
        </p>
      </div>
      
      <div className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 lg:gap-4 relative">
          {steps.map((step, index) => (
            <div key={step.number} className="relative flex flex-col items-center">
              {/* Step number badge */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-gray-200 text-sm font-bold text-gray-900 z-20">
                {step.number}
              </div>

              {/* Icon circle with dashed border */}
              <div className="relative mb-8">
                <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full flex items-center justify-center bg-purple-50 border-2 border-dashed border-gray-300">
                  {step.icon}
                </div>
                
                {/* Connecting dashed line - hidden on mobile, shown on tablet and desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-1/2 left-full w-full h-16 transform -translate-y-1/2 z-10">
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
                      <path 
                        d="M 0 10 Q 50 0, 100 10" 
                        stroke="#D1D5DB" 
                        strokeWidth="1" 
                        strokeDasharray="8,8"
                        fill="none"
                        className={index === 0 ? "animate-pulse" : ""}
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="text-center relative z-10">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">{step.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}