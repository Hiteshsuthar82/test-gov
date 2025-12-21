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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse overflow-hidden bg-purple-50 rounded-lg">
              <div className="h-20 bg-gray-200 rounded-t-lg" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-8 bg-gray-200 rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-10">
            {categories.slice(0, 4).map((category: Category) => {
            const userCount = category.userCount || 0;
            const totalTests = category.totalTests || category.totalSetsCount || 0;
            const freeTests = category.freeTests || 0;
            const languages = category.languages || ['English', 'Hindi'];
            const userCountFormatted = formatUserCount(userCount);
            const hasDiscount = category.hasDiscount && category.originalPrice && category.discountedPrice;
            const discountPercentage = hasDiscount && category.originalPrice && category.discountedPrice
              ? Math.round(((category.originalPrice - category.discountedPrice) / category.originalPrice) * 100)
              : 0;
            
            return (
              <Card
                key={category._id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-purple-50 rounded-lg shadow-sm flex flex-col"
              >
                {/* Header Section with gradient background - Light Purple to Transparent (Top to Bottom) */}
                <div className="relative bg-gradient-to-b from-purple-200 to-transparent pt-3 px-4 pb-2 flex-shrink-0">
                  <div className="flex items-start justify-between">
                    {/* Left: Circular Logo/Icon */}
                    <div className="flex items-center">
                      {category.bannerImageUrl ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm border border-white">
                          <img
                            src={category.bannerImageUrl}
                            alt={category.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-rose-500 flex items-center justify-center shadow-sm">
                          <FiTarget className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Right: User Count Badge */}
                    {userCount > 0 && (
                      <div className="bg-purple-100 rounded-full px-2 py-1 flex items-center gap-1">
                        <FiZap className="w-3 h-3 text-yellow-500" />
                        <span className="text-[10px] font-medium text-gray-700">
                          {userCountFormatted} students
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <CardContent className="px-4 pt-3 pb-4 flex-1 flex flex-col justify-between">
                  <div className="flex-1">
                    {/* Title Section */}
                    <h3 className="text-xs font-bold text-gray-900 mb-2 leading-tight line-clamp-2 min-h-[2rem]">
                      {category.name}
                    </h3>

                    {/* Price Section with Discount */}
                    <div className="mb-2">
                      {hasDiscount ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            ₹{category.discountedPrice}
                          </span>
                          <span className="text-xs text-gray-500 line-through">
                            ₹{category.originalPrice}
                          </span>
                          {discountPercentage > 0 && (
                            <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-semibold">
                              {discountPercentage}% OFF
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm font-bold text-gray-900">
                          {category.price > 0 ? `₹${category.price}` : 'Free'}
                        </div>
                      )}
                    </div>

                    {/* Test Statistics */}
                    <div className="mb-2">
                      <span className="text-[10px] text-gray-600">
                        {totalTests} Tests
                        {freeTests > 0 && (
                          <>
                            {' | '}
                            <span className="text-green-600 font-semibold">
                              {freeTests} Free
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Language Information */}
                    {languages && (Array.isArray(languages) ? languages.length > 0 : languages) && (
                      <div className="flex items-center gap-1 mb-2">
                        <FiGlobe className="w-2.5 h-2.5 text-blue-400 flex-shrink-0" />
                        <span className="text-[10px] text-blue-400 line-clamp-1">
                          {Array.isArray(languages) 
                            ? languages.join(', ')
                            : languages}
                        </span>
                      </div>
                    )}

                    {/* 2-Line Description */}
                    <div className="mb-2 min-h-[2rem]">
                      <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-2">
                        {category.description || 'Comprehensive test series for banking exam preparation.'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-auto flex items-center gap-2">
                    <Link 
                      to={`/categories/${category._id}`}
                      className="flex-1"
                    >
                      <button className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium text-[10px] py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-1">
                        View Tests
                        <FiArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </Link>
                    <button className="w-8 h-8 border-2 border-purple-500 rounded-md flex items-center justify-center hover:bg-purple-50 transition-colors duration-200 flex-shrink-0">
                      <FiPlus className="w-4 h-4 text-purple-500 font-bold" />
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
              <button className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg">
                View All Categories
                <FiArrowRight className="w-4 h-4" />
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
