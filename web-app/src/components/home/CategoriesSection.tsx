import { Link, useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { FiTarget, FiArrowRight, FiZap, FiGlobe, FiShoppingCart } from "react-icons/fi";
import { BsCartCheck } from "react-icons/bs";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { confirm } = useConfirmation();

  // Fetch user subscriptions to check subscription status
  const { data: userSubscriptions } = useQuery({
    queryKey: ['userSubscriptions'],
    queryFn: async () => {
      try {
        const response = await api.get('/subscriptions/me');
        return response.data.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });

  // Fetch cart to check if category is in cart
  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      try {
        const response = await api.get('/cart');
        return response.data.data;
      } catch {
        return null;
      }
    },
    enabled: !!user,
  });

  // Helper function to check if a category is in cart
  const isCategoryInCart = (categoryId: string): boolean => {
    if (!cart || !cart.items || !categoryId) return false;
    return cart.items.some((item: any) => 
      (item.categoryId?._id || item.categoryId)?.toString() === categoryId
    );
  };

  // Helper function to check if a category is subscribed
  const isCategorySubscribed = (categoryId: string): boolean => {
    if (!user || !userSubscriptions || !categoryId) return false;

    const now = new Date();

    // Check for direct category subscription
    const hasDirectSubscription = userSubscriptions.some((sub: any) => {
      if (!sub.isComboOffer && sub.categoryId) {
        const subCategoryId = (sub.categoryId._id || sub.categoryId).toString();
        if (subCategoryId === categoryId && sub.status === 'APPROVED') {
          // Check if subscription is still valid (not expired)
          if (!sub.expiresAt || new Date(sub.expiresAt) >= now) {
            return true;
          }
        }
      }
      return false;
    });

    if (hasDirectSubscription) return true;

    // Check for combo offer subscription that includes this category
    const hasComboSubscription = userSubscriptions.some((sub: any) => {
      if (sub.isComboOffer && sub.comboOfferDetails?.categoryIds && sub.status === 'APPROVED') {
        const includesCategory = sub.comboOfferDetails.categoryIds.some(
          (cat: any) => (cat._id || cat).toString() === categoryId
        );
        if (includesCategory) {
          // Check if combo subscription is still valid (not expired)
          if (!sub.expiresAt || new Date(sub.expiresAt) >= now) {
            return true;
          }
        }
      }
      return false;
    });

    return hasComboSubscription;
  };

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      await api.post('/cart', { categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to add to cart';
      if (errorMessage.includes('already in cart')) {
        toast.error('This item is already in your cart!');
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const handleAddToCart = async (categoryId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      const confirmed = await confirm({
        title: 'Login Required',
        message: 'Please login to add items to cart. Do you want to login?',
        confirmText: 'Login',
        cancelText: 'Cancel',
      });
      
      if (confirmed) {
        navigate('/login');
      }
      return;
    }

    addToCartMutation.mutate(categoryId);
  };

  return (
    <div className="mb-16 relative py-12 overflow-hidden">
      {/* Dotted connecting lines background - Same as FeaturesSection */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" style={{ zIndex: 0 }}>
        <defs>
          <pattern id="dots-category" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#9333EA" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots-category)" />
      </svg>
      
      <div className="max-w-4xl mx-auto relative z-10">
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
            <Card
              key={i}
              className="animate-pulse overflow-hidden bg-purple-50 rounded-lg"
            >
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
              const totalTests =
                category.totalTests || category.totalSetsCount || 0;
              const freeTests = category.freeTests || 0;
              const languages = category.languages || ["English", "Hindi"];
              const userCountFormatted = formatUserCount(userCount);
              const hasDiscount =
                category.hasDiscount &&
                category.originalPrice &&
                category.discountedPrice;
              const discountPercentage =
                hasDiscount &&
                category.originalPrice &&
                category.discountedPrice
                  ? Math.round(
                      ((category.originalPrice - category.discountedPrice) /
                        category.originalPrice) *
                        100
                    )
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
                            {category.price > 0 ? `₹${category.price}` : "Free"}
                          </div>
                        )}
                      </div>

                      {/* Test Statistics */}
                      <div className="mb-2">
                        <span className="text-[10px] text-gray-600">
                          {totalTests} Tests
                          {freeTests > 0 && (
                            <>
                              {" | "}
                              <span className="text-green-600 font-semibold">
                                {freeTests} Free
                              </span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Language Information */}
                      {languages &&
                        (Array.isArray(languages)
                          ? languages.length > 0
                          : languages) && (
                          <div className="flex items-center gap-1 mb-2">
                            <FiGlobe className="w-2.5 h-2.5 text-blue-400 flex-shrink-0" />
                            <span className="text-[10px] text-blue-400 line-clamp-1">
                              {Array.isArray(languages)
                                ? languages.join(", ")
                                : languages}
                            </span>
                          </div>
                        )}

                      {/* 2-Line Description */}
                      <div className="mb-2 min-h-[2rem]">
                        <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-2">
                          {category.description ||
                            "Comprehensive test series for banking exam preparation."}
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
                      {!isCategorySubscribed(category._id) && (
                        isCategoryInCart(category._id) ? (
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate('/cart');
                            }}
                            className="w-8 h-8 border-2 border-purple-500 rounded-md flex items-center justify-center hover:bg-purple-50 transition-colors duration-200 flex-shrink-0"
                          >
                            <BsCartCheck className="w-4 h-4 text-purple-500 font-bold" />
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => handleAddToCart(category._id, e)}
                            disabled={addToCartMutation.isPending}
                            className="w-8 h-8 border-2 border-purple-500 rounded-md flex items-center justify-center hover:bg-purple-50 transition-colors duration-200 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FiShoppingCart className="w-4 h-4 text-purple-500 font-bold" />
                          </button>
                        )
                      )}
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
    </div>
  );
}
