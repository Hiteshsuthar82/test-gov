import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, useIsAuthenticated } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { FiUser, FiLogOut, FiHome, FiBook, FiMenu, FiX, FiAward, FiList, FiChevronDown } from 'react-icons/fi'
import type { IconType } from 'react-icons'

interface NavItem {
  path: string
  label: string
  icon: IconType
}

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Navigation items for profile popup
  const profileNavItems: NavItem[] = [
    { path: '/profile', label: 'Profile', icon: FiUser },
    { path: '/results', label: 'Results', icon: FiList },
    { path: '/leaderboard', label: 'Leaderboard', icon: FiAward },
    { path: '/subscriptions', label: 'My Subscriptions', icon: FiBook },
  ]

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileMenuOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
    setIsMobileMenuOpen(false)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <>
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-bold text-gray-900">TestPrep</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-2">
              {isAuthenticated ? (
                <>
                  {/* Profile Menu */}
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      {user?.profileImageUrl ? (
                        <img
                          src={user.profileImageUrl}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <FiUser className="w-5 h-5 text-slate-600" />
                        </div>
                      )}
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium text-slate-800">{user?.name}</span>
                        <span className="text-xs text-slate-500">{user?.email}</span>
                      </div>
                      <FiChevronDown className={`w-4 h-4 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Profile Dropdown Menu */}
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                        {/* User Info */}
                        {user && (
                          <div className="px-4 py-3 border-b border-slate-200">
                            <p className="font-semibold text-slate-800 truncate">{user.name}</p>
                            <p className="text-sm text-slate-500 truncate">{user.email}</p>
                          </div>
                        )}

                        {/* Navigation Links */}
                        <div className="py-1">
                          {profileNavItems.map((item) => {
                            const Icon = item.icon
                            const isActive = location.pathname === item.path
                            return (
                              <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsProfileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  isActive
                                    ? 'bg-purple-50 text-purple-700 font-medium'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                                <span>{item.label}</span>
                              </Link>
                            )
                          })}
                        </div>

                        {/* Logout */}
                        <div className="border-t border-slate-200 pt-1">
                          <button
                            onClick={() => {
                              setIsProfileMenuOpen(false)
                              handleLogout()
                            }}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
                          >
                            <FiLogOut className="w-4 h-4" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900">Login</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700">Sign Up</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <FiX className="w-6 h-6" />
              ) : (
                <FiMenu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-bold text-gray-900">TestPrep</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close menu"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isAuthenticated ? (
              <div className="space-y-4">
                {/* User Profile Section */}
                {user && (
                  <div className="pb-6 border-b border-slate-200">
                    <Link
                      to="/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.profileImageUrl ? (
                          <img
                            src={user.profileImageUrl}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiUser className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{user.name}</p>
                        <p className="text-sm text-slate-500 truncate">{user.email}</p>
                      </div>
                    </Link>
                  </div>
                )}

                {/* Navigation Links */}
                <nav className="space-y-2">
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      location.pathname === '/'
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FiHome className="w-5 h-5" />
                    <span>Home</span>
                  </Link>
                  <Link
                    to="/leaderboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      location.pathname === '/leaderboard'
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FiAward className="w-5 h-5" />
                    <span>Leaderboard</span>
                  </Link>
                  <Link
                    to="/subscriptions"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      location.pathname === '/subscriptions'
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FiBook className="w-5 h-5" />
                    <span>My Subscriptions</span>
                  </Link>
                  <Link
                    to="/results"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      location.pathname === '/results'
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FiList className="w-5 h-5" />
                    <span>Results</span>
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      location.pathname === '/profile'
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FiUser className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                </nav>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-600 mb-4">Welcome to TestPrep</p>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full"
                >
                  <Button variant="outline" className="w-full border-slate-300 text-slate-700">
                    Login
                  </Button>
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full"
                >
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          {isAuthenticated && (
            <div className="p-6 border-t border-slate-200">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <FiLogOut className="mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

