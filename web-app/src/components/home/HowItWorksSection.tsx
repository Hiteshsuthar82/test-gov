const steps = [
  {
    number: 1,
    title: 'Choose Category',
    description: 'Select your banking exam category'
  },
  {
    number: 2,
    title: 'Take Tests',
    description: 'Practice with multiple test sets'
  },
  {
    number: 3,
    title: 'Get Analysis',
    description: 'Receive detailed performance report'
  },
  {
    number: 4,
    title: 'Improve Speed',
    description: 'Identify weak areas and improve'
  }
]

export default function HowItWorksSection() {
  return (
    <div className="mb-16 bg-white rounded-2xl p-8 md:p-12 shadow-xl border-2 border-purple-100 relative overflow-hidden">
      {/* Section background SVG */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5">
        <svg className="w-full h-full" viewBox="0 0 1200 600" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <rect x="0" y="0" width="1200" height="600" fill="url(#howItWorksPattern)" />
          <defs>
            <pattern id="howItWorksPattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="50" cy="50" r="2" fill="#9333EA" />
              <circle cx="25" cy="25" r="1.5" fill="#EC4899" />
              <circle cx="75" cy="75" r="1.5" fill="#F472B6" />
            </pattern>
          </defs>
        </svg>
      </div>
      
      <div className="text-center mb-12 relative z-10">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
        <p className="text-xl text-gray-600">Simple steps to boost your banking exam preparation</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
        {steps.map((step) => (
          <div key={step.number} className="text-center">
            <div className="bg-gradient-to-br from-purple-500 to-rose-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
              {step.number}
            </div>
            <h3 className="font-bold text-lg mb-2">{step.title}</h3>
            <p className="text-gray-600 text-sm">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

