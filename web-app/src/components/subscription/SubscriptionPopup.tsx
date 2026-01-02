import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiCheckCircle, FiX } from "react-icons/fi";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

interface TimePeriod {
  months: number;
  price: number;
  originalPrice: number;
}

interface Category {
  _id: string;
  name: string;
  description: string;
  bannerImageUrl?: string;
  totalSetsCount?: number;
  sections?: any[];
  updatedAt?: string;
  userCount?: number;
  languages?: string[];
  price?: number;
  originalPrice?: number;
  timePeriods?: TimePeriod[];
  freeTests?: number;
}

interface ComboOffer {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  originalPrice?: number;
  timePeriods?: TimePeriod[];
  benefits?: string[];
}

interface CategoryData {
  category?: {
    discountedPrice?: number;
    originalPrice?: number;
    hasDiscount?: boolean;
  };
}

interface SubscriptionPopupProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDurationMonths: number | undefined;
  onDurationChange: (months: number) => void;
  shouldShowComboOffer: boolean;
  latestComboOffer: ComboOffer | null;
  category: Category | undefined;
  categoryData: CategoryData | undefined;
  categoryId: string | undefined;
  hasPendingComboOfferForCategory: boolean;
  hasPendingCategorySubscription: boolean;
}

export default function SubscriptionPopup({
  isOpen,
  onOpenChange,
  selectedDurationMonths,
  onDurationChange,
  shouldShowComboOffer,
  latestComboOffer,
  category,
  categoryData,
  categoryId,
  hasPendingComboOfferForCategory,
  hasPendingCategorySubscription,
}: SubscriptionPopupProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'combo' | 'single'>(shouldShowComboOffer && latestComboOffer ? 'combo' : 'single');

  // Get the current pricing based on view mode and selected duration
  const getCurrentPrice = () => {
    if (viewMode === 'combo' && latestComboOffer) {
      const selectedPeriod = latestComboOffer.timePeriods?.find(p => p.months === selectedDurationMonths) || latestComboOffer.timePeriods?.[0];
      return selectedPeriod?.price || latestComboOffer.price || 0;
    } else if (category) {
      const selectedPeriod = category.timePeriods?.find(p => p.months === selectedDurationMonths) || category.timePeriods?.[0];
      return selectedPeriod?.price || category.price || 0;
    }
    return 0;
  };

  // Get pricing options based on view mode
  const getPricingOptions = () => {
    if (viewMode === 'combo' && latestComboOffer?.timePeriods) {
      return latestComboOffer.timePeriods;
    } else if (category?.timePeriods) {
      return category.timePeriods;
    }
    return [];
  };

  const pricingOptions = getPricingOptions();

  // Get benefits based on view mode
  const getBenefits = () => {
    if (viewMode === 'combo' && latestComboOffer?.benefits && latestComboOffer.benefits.length > 0) {
      return latestComboOffer.benefits;
    } else if (category) {
      const categoryBenefits: string[] = [];
      if (category.totalSetsCount !== undefined && category.totalSetsCount > 0) {
        categoryBenefits.push(`${category.totalSetsCount} Test Series`);
      }
      if (category.freeTests !== undefined && category.freeTests > 0) {
        categoryBenefits.push(`${category.freeTests} Free Tests`);
      }
      if (category.languages && category.languages.length > 0) {
        categoryBenefits.push(`Available in ${category.languages.join(", ")}`);
      }
    //   categoryBenefits.push('Weekly live test');
      categoryBenefits.push('Unlimited Practice');
      categoryBenefits.push('Unlimited Test Re-Attempts');
      return categoryBenefits;
    }
    return [];
  };

  const benefits = getBenefits();

  const handleProceedToPayment = () => {
    if (viewMode === 'combo' && latestComboOffer) {
      // Navigate directly to payment page with combo offer data
      const selectedPeriod = latestComboOffer.timePeriods?.find(
        (tp: TimePeriod) => tp.months === (selectedDurationMonths || pricingOptions[0]?.months)
      );
      const amount = selectedPeriod?.price || latestComboOffer.price || 0;
      
      navigate('/payment', {
        state: {
          type: 'combo',
          comboOfferId: latestComboOffer._id,
          comboOffer: latestComboOffer,
          durationMonths: selectedDurationMonths || pricingOptions[0]?.months || undefined,
          amount: amount,
        }
      });
    } else if (categoryId) {
      // Navigate to category payment page
      const durationParam = pricingOptions.length > 0
        ? `?duration=${selectedDurationMonths || pricingOptions[0]?.months}`
        : '';
      navigate(`/categories/${categoryId}/payment${durationParam}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto p-6 relative">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Close"
        >
          <FiX className="w-6 h-6" />
        </button>

        {/* Toggle Section at Top */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-white rounded-full border-2 border-gray-200 p-1">
            {shouldShowComboOffer && latestComboOffer && (
              <button
                onClick={() => setViewMode('combo')}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                  viewMode === 'combo'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">🎉</span>
                <span>Combo Offer</span>
                {/* {viewMode === 'combo' && ( */}
                  <span className="bg-yellow-400 text-black text-xs px-2 py-0.5 rounded">Suggested</span>
                {/* )} */}
              </button>
            )}
            <button
              onClick={() => setViewMode('single')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                viewMode === 'single'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">📚</span>
              <span>Single Category</span>
            </button>
          </div>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
          {/* Left Section - Plan Benefits */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Plan Benefits</h3>
            <ul className="space-y-3">
              {benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Section - Pricing Plans */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Select your Pass Plan:</h3>
            
            <div className="space-y-3">
              {pricingOptions.length > 0 ? (
                pricingOptions.map((period: TimePeriod) => {
                  const isSelected = (selectedDurationMonths || pricingOptions[0].months) === period.months;
                  const discount = period.originalPrice > period.price
                    ? Math.round(((period.originalPrice - period.price) / period.originalPrice) * 100)
                    : 0;

                  // Determine plan name based on months
                  let planName = '';
                  let badgeText = '';
                  let badgeColor = '';
                  
                  if (period.months === 1) {
                    planName = 'Monthly Subscription';
                    badgeText = discount > 0 ? `${discount}% OFF` : '';
                    badgeColor = 'bg-green-500';
                  } else if (period.months === 12) {
                    planName = 'Yearly Subscription';
                    badgeText = 'Bestseller';
                    badgeColor = 'bg-orange-500';
                  } else if (period.months === 18) {
                    planName = '18 Months Subscription';
                    badgeText = discount > 0 ? `${discount}% OFF` : '';
                    badgeColor = 'bg-green-500';
                  } else {
                    planName = `${period.months} Months Subscription`;
                    badgeText = discount > 0 ? `${discount}% OFF` : '';
                    badgeColor = 'bg-green-500';
                  }

                  return (
                    <div
                      key={period.months}
                      onClick={() => onDurationChange(period.months)}
                      className={`relative cursor-pointer border-2 rounded-lg p-4 transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      {/* Badge */}
                      {badgeText && (
                        <div className="absolute -top-2 -right-2">
                          <span className={`${badgeColor} text-white text-xs font-bold px-3 py-1 rounded`}>
                            {badgeText}
                          </span>
                        </div>
                      )}

                      {/* Radio button */}
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => onDurationChange(period.months)}
                          className="mt-1 w-5 h-5 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-gray-900">{planName}</h4>
                              <p className="text-sm text-gray-500">Valid for {period.months * 30} Days</p>
                            </div>
                            <div className="text-right">
                              {period.originalPrice > period.price && (
                                <span className="text-sm text-gray-400 line-through block">₹{period.originalPrice}</span>
                              )}
                              <span className="text-2xl font-bold text-gray-900">₹{period.price}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="border-2 border-purple-600 bg-purple-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <input type="radio" checked={true} readOnly className="mt-1 w-5 h-5" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900">{category?.name || 'Category'} Pass</h4>
                          <p className="text-sm text-gray-500">Full Access</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-gray-900">
                            ₹{categoryData?.category?.discountedPrice || category?.price || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section - To Pay and Action Button */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">To Pay</span>
              <button className="text-purple-600 hover:text-purple-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <span className="text-2xl font-bold text-gray-900">₹{getCurrentPrice()}</span>
          </div>

          {/* Coupon Code Section */}
          {/* <div className="border border-orange-200 bg-orange-50 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <span className="text-sm text-gray-700">Get exciting offers inside</span>
            </div>
            <button className="text-sm font-semibold text-cyan-500 hover:text-cyan-600">
              Apply Coupon
            </button>
          </div> */}

          {/* Payment Button */}
          {(hasPendingComboOfferForCategory && viewMode === 'combo') || (hasPendingCategorySubscription && viewMode === 'single') ? (
            <Link to="/subscriptions" className="block w-full">
              <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 text-base">
                View Subscription Status
              </Button>
            </Link>
          ) : user ? (
            <Button 
              onClick={handleProceedToPayment}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 text-base"
            >
              Proceed To Payment
            </Button>
          ) : (
            <Link to="/register" className="block w-full">
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 text-base">
                Register to Continue
              </Button>
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
