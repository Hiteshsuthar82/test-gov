import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiTarget, FiArrowRight } from "react-icons/fi";
import { useAuthStore } from "@/store/authStore";
import { formatPriceWithDiscount } from "@/utils/pricing";

interface Category {
  _id: string;
  name: string;
  description: string;
  price: number;
  bannerImageUrl?: string;
  isActive: boolean;
}

interface CategoriesSectionProps {
  categories?: Category[];
  isLoading?: boolean;
}

export default function CategoriesSection({
  categories,
  isLoading,
}: CategoriesSectionProps) {
  const { user } = useAuthStore();

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg" />
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {categories.map((category: Category) => (
            <Card
              key={category._id}
              className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 border-purple-100 bg-white"
            >
              {category.bannerImageUrl ? (
                <div className="relative h-48 overflow-hidden border-b-1 border-gray-600">
                  <img
                    src={category.bannerImageUrl}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                  {/* <div className="absolute inset-0 bg-gradient-to-t from-purple-900/80 to-transparent"></div> */}
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-purple-500 to-rose-500 flex items-center justify-center">
                  <FiTarget className="w-16 h-16 text-white opacity-50" />
                </div>
              )}
              <CardContent className="p-6">
                <h3 className="text-xl text-gray-900 mb-1">
                  {category.name}
                </h3>
                <p className="text-gray-600 mb-3 line-clamp-2">
                  {category.description}
                </p>
                <div className="flex justify-between items-end">
                  <Link to={`/categories/${category._id}`}>
                    <div className="flex items-center uppercase bg-transparent text-purple-600 underline text-lg font-semibold hover:scale-105 transition-all duration-300 ">
                      View Tests
                      <FiArrowRight className="ml-2" />
                    </div>
                  </Link>
                  <div>
                    {(() => {
                      const { discountedPrice, originalPrice, hasDiscount } =
                        formatPriceWithDiscount(
                          category.price,
                          user?.partnerDiscountPercentage
                        );
                      return (
                        <div>
                          {hasDiscount ? (
                            <div>
                              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-rose-600 bg-clip-text text-transparent">
                                ₹{discountedPrice}
                              </div>
                              <div className="text-sm text-gray-500 line-through">
                                ₹{originalPrice}
                              </div>
                            </div>
                          ) : (
                            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-rose-600 bg-clip-text text-transparent">
                              ₹{originalPrice}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
