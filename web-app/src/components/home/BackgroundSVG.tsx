export default function BackgroundSVG() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Top decorative circles */}
      <svg className="absolute top-0 left-0 w-full h-full opacity-20" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="200" cy="100" r="150" fill="url(#gradient1)" opacity="0.3" />
        <circle cx="1200" cy="200" r="200" fill="url(#gradient2)" opacity="0.2" />
        <circle cx="800" cy="500" r="180" fill="url(#gradient3)" opacity="0.25" />
        <circle cx="100" cy="600" r="120" fill="url(#gradient1)" opacity="0.2" />
        <circle cx="1300" cy="700" r="160" fill="url(#gradient2)" opacity="0.3" />
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9333EA" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F472B6" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Geometric patterns */}
      <svg className="absolute top-0 right-0 w-96 h-96 opacity-10" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0 L400 0 L400 400 L0 400 Z" fill="url(#pattern1)" />
        <defs>
          <pattern id="pattern1" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M0 20 L20 0 L40 20 L20 40 Z" fill="#9333EA" opacity="0.1" />
          </pattern>
        </defs>
      </svg>
      
      {/* Bottom left decorative shapes */}
      <svg className="absolute bottom-0 left-0 w-96 h-96 opacity-10" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="0,400 200,200 400,400" fill="url(#gradient4)" />
        <defs>
          <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#F472B6" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(147, 51, 234, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(147, 51, 234, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}></div>
    </div>
  )
}

