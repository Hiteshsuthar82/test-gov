import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FiTarget, FiArrowRight, FiZap, FiGlobe, FiPlus } from "react-icons/fi";

interface Category {
  _id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountedPrice?: number;
  hasDiscount?: boolean;
  bannerImageUrl?: string;
  isActive: boolean;
  totalSetsCount?: number;
  userCount?: number;
  totalTests?: number;
  freeTests?: number;
  languages?: string | string[];
}

interface CategoriesSectionProps {
  categories?: Category[];
  isLoading?: boolean;
}

// Helper function to format user count
const formatUserCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
};

export default function CategoriesSection({
  categories,
  isLoading,
}: CategoriesSectionProps) {

  return (
    <div className="mb-16 relative">
      {/* Section background decoration */}
      <div className="absolute -top-10 -right-10 w-80 h-80 opacity-5">
        <svg
          viewBox="0 0 320 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="160,20 300,120 240,280 80,280 20,120"
            fill="url(#categoryGradient)"
          />
          <defs>
            <linearGradient
              id="categoryGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#9333EA" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#EC4899" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="text-center mb-12 relative z-10">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Banking Exam Categories
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Comprehensive test series for all government banking exams
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-64 bg-gray-200 rounded-lg" />
            </Card>
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {categories.slice(0, 4).map((category: Category) => {
            const userCount = category.userCount || 0;
            const totalTests = category.totalTests || category.totalSetsCount || 0;
            const freeTests = category.freeTests || 0;
            const languages = category.languages || ['English', 'Hindi'];
            const userCountFormatted = formatUserCount(userCount);
            
            return (
              <Card
                key={category._id}
                className="overflow-hidden hover:shadow-xl transition-all duration-300 bg-white rounded-xl shadow-md"
              >
                {/* Header Section with gradient background */}
                <div className="relative bg-gradient-to-br from-purple-50 via-pink-50 to-white pt-6 px-6 pb-4">
                  <div className="flex items-start justify-between">
                    {/* Left: Circular Logo/Icon */}
                    <div className="flex items-center">
                      {category.bannerImageUrl ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-white shadow-md border-2 border-white">
                          <img
                            src={category.bannerImageUrl}
                            alt={category.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-rose-500 flex items-center justify-center shadow-md">
                          <FiTarget className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Right: User Count Badge */}
                    {userCount > 0 && (
                      <div className="bg-purple-100 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                        <FiZap className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs font-medium text-gray-700">
                          {userCountFormatted} Users
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <CardContent className="px-6 pt-4 pb-6">
                  {/* Title Section */}
                  <h3 className="text-xl font-bold text-gray-900 mb-4 leading-tight">
                    {category.name}
                  </h3>

                  {/* Test Statistics */}
                  <div className="mb-4">
                    <span className="text-sm text-gray-600">
                      {totalTests} Total Tests
                      {freeTests > 0 && (
                        <>
                          {' | '}
                          <span className="text-green-600 font-semibold">
                            {freeTests} Free Tests
                          </span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Language Information */}
                  {languages && (Array.isArray(languages) ? languages.length > 0 : languages) && (
                    <div className="flex items-center gap-2 mb-4">
                      <FiGlobe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-400">
                        {Array.isArray(languages) 
                          ? languages.join(', ')
                          : languages}
                      </span>
                    </div>
                  )}

                  {/* 2-Line Description */}
                  <div className="mb-6 min-h-[3rem]">
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                      {category.description || 'Comprehensive test series designed to help you excel in your banking exam preparation with detailed explanations and performance analytics.'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Link 
                      to={`/categories/${category._id}`}
                      className="flex-1"
                    >
                      <button className="w-full bg-blue-400 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
                        View Test Series
                        <FiArrowRight className="w-4 h-4" />
                      </button>
                    </Link>
                    <button className="w-12 h-12 border-2 border-blue-400 rounded-lg flex items-center justify-center hover:bg-blue-50 transition-colors duration-200">
                      <FiPlus className="w-6 h-6 text-blue-400 font-bold" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
          
          {/* View All Button */}
          <div className="flex justify-center mt-8 relative z-10">
            <Link to="/categories">
              <button className="bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105">
                View All Categories
                <FiArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </>
      ) : (
        <Card className="relative z-10">
          <CardContent className="pt-6 text-center text-gray-600 py-12">
            <FiTarget className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">No categories available at the moment.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
