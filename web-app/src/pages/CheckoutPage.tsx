import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import Layout from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FiShoppingCart, FiCheckCircle, FiArrowRight } from 'react-icons/fi'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'

interface TimePeriod {
  months: number
  price: number
  originalPrice: number
}

interface ComboOffer {
  _id: string
  name: string
  description?: string
  imageUrl?: string
  categoryIds: Array<{ _id: string; name: string }>
  price: number
  originalPrice: number
  timePeriods?: TimePeriod[]
  benefits: string[]
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const [selectedComboOfferId, setSelectedComboOfferId] = useState<string | null>(
    searchParams.get('comboOfferId')
  )
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)

  // Fetch cart
  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await api.get('/cart')
      return response.data.data
    },
    enabled: !!user && !selectedComboOfferId,
  })

  // Fetch combo offer if selected
  const { data: comboOffer } = useQuery({
    queryKey: ['comboOffer', selectedComboOfferId],
    queryFn: async () => {
      if (!selectedComboOfferId) return null
      const response = await api.get(`/combo-offers/${selectedComboOfferId}`)
      return response.data.data
    },
    enabled: !!selectedComboOfferId,
  })

  // Fetch all combo offers for selection
  const { data: allComboOffers } = useQuery({
    queryKey: ['allComboOffers'],
    queryFn: async () => {
      const response = await api.get('/combo-offers')
      return response.data.data?.comboOffers || []
    },
  })

  // Filter combo offers to only show those that include categories from cart items
  const filteredComboOffers = allComboOffers?.filter((comboOffer: ComboOffer) => {
    if (!cart?.items || cart.items.length === 0) return false

    // Get cart item category IDs
    const cartCategoryIds = cart.items.map((item: any) => item.categoryId._id)

    // Check if combo offer has any category that matches cart items
    return comboOffer.categoryIds.some((comboCategory: { _id: string; name: string }) =>
      cartCategoryIds.includes(comboCategory._id)
    )
  }) || []

  // Set default duration when combo offer loads
  useEffect(() => {
    if (comboOffer && comboOffer.timePeriods && comboOffer.timePeriods.length > 0 && !selectedDuration) {
      // Find minimum duration
      const minPeriod = comboOffer.timePeriods.reduce((min: TimePeriod, tp: TimePeriod) =>
        tp.months < min.months ? tp : min
      )
      setSelectedDuration(minPeriod.months)
    }
  }, [comboOffer, selectedDuration])

  const handleProceedToPayment = () => {
    if (selectedComboOfferId && comboOffer) {
      if (!selectedDuration && comboOffer.timePeriods && comboOffer.timePeriods.length > 0) {
        toast.error('Please select a duration')
        return
      }
      const selectedPeriod = comboOffer.timePeriods?.find((tp: TimePeriod) => tp.months === selectedDuration)
      const amount = selectedPeriod?.price || comboOffer.price || 0
      navigate('/payment', {
        state: {
          type: 'combo',
          comboOfferId: selectedComboOfferId,
          comboOffer: comboOffer,
          durationMonths: selectedDuration || undefined,
          amount: amount,
        }
      })
    } else if (cart && cart.items.length > 0) {
      navigate('/payment', {
        state: {
          type: 'cart',
          cartId: cart._id,
          cart: cart,
          amount: cart.totalAmount,
        }
      })
    } else if (cart && cart.items.length === 0) {
      toast.error('Your cart is empty')
    }
  }

  const totalAmount = selectedComboOfferId && comboOffer && selectedDuration
    ? (comboOffer.timePeriods?.find((tp: TimePeriod) => tp.months === selectedDuration)?.price || comboOffer.price || 0)
    : selectedComboOfferId && comboOffer && (!comboOffer.timePeriods || comboOffer.timePeriods.length === 0)
    ? comboOffer.price || 0
    : (cart?.totalAmount as number) || 0

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Login</h2>
            <p className="text-gray-600 mb-6">You need to be logged in to checkout.</p>
            <Button onClick={() => navigate('/login')}>Login</Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Available Combo Offers */}
          {!selectedComboOfferId && filteredComboOffers && filteredComboOffers.length > 0 && (
            <div className="mb-8">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">🎯 Special Combo Offers</h2>
                <p className="text-sm text-gray-600">Save more with our curated combo packages</p>
              </div>

              {/* Professional Banner Layout */}
              <div className="space-y-4">
                  {filteredComboOffers.map((offer: ComboOffer) => {
                    // Calculate the minimum price from time periods or use base price
                    const minPrice = offer.timePeriods && offer.timePeriods.length > 0
                      ? Math.min(...offer.timePeriods.map(tp => tp.price))
                      : offer.price

                    // Find the time period with minimum price for original price display
                    const minPriceTimePeriod = offer.timePeriods && offer.timePeriods.length > 0
                      ? offer.timePeriods.find(tp => tp.price === minPrice)
                      : null

                    // Calculate discount based on the minimum price time period
                    const discountPercentage = minPriceTimePeriod
                      ? (minPriceTimePeriod.originalPrice > minPriceTimePeriod.price
                          ? Math.round(((minPriceTimePeriod.originalPrice - minPriceTimePeriod.price) / minPriceTimePeriod.originalPrice) * 100)
                          : 0)
                      : (offer.originalPrice > offer.price
                          ? Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100)
                          : 0)
                  return (
                    <Card
                      key={offer._id}
                      className={`cursor-pointer transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-purple-50 to-purple-25 border-2 border-purple-200 hover:border-purple-300 rounded-xl overflow-hidden relative ${
                        selectedComboOfferId === offer._id
                          ? 'border-purple-500 shadow-lg ring-2 ring-purple-200'
                          : ''
                      }`}
                      onClick={() => setSelectedComboOfferId(offer._id)}
                    >
                      {/* Subtle background pattern */}
                      <div className="absolute inset-0 opacity-5">
                        <svg className="w-full h-full" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <pattern id={`combo-pattern-${offer._id}`} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                              <circle cx="15" cy="15" r="1.5" fill="#9333EA" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill={`url(#combo-pattern-${offer._id})`} />
                        </svg>
                      </div>

                      <CardContent className="p-6 relative z-10">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                          {/* Left Side - Content */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="inline-flex items-center gap-2 bg-white text-purple-700 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm border border-purple-200">
                                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                                COMBO OFFER
                              </div>
                              {offer.timePeriods && offer.timePeriods.length > 1 && (
                                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                  {offer.timePeriods.length} plans available
                                </span>
                              )}
                              {discountPercentage > 0 && (
                                <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                                  Save {discountPercentage}%
                                </span>
                              )}
                            </div>

                            <h3 className="font-bold text-gray-900 text-xl mb-3 leading-tight">{offer.name}</h3>

                            {offer.description && (
                              <p className="text-base text-gray-700 mb-4 leading-relaxed">{offer.description}</p>
                            )}

                            {/* Benefits Grid */}
                            {offer.benefits && offer.benefits.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                                {offer.benefits.slice(0, 4).map((benefit, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                      <FiCheckCircle className="w-3.5 h-3.5 text-green-600" />
                                    </div>
                                    <span className="text-sm text-gray-700">{benefit}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <FiShoppingCart className="w-4 h-4 text-purple-600" />
                                <span className="font-medium">Includes {offer.categoryIds.length} categories</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Side - Pricing & CTA */}
                          <div className="flex flex-col items-start lg:items-end gap-4 lg:min-w-[160px]">
                            {/* Pricing */}
                            <div className="text-left lg:text-right">
                              <div className="mb-1">
                                {offer.timePeriods && offer.timePeriods.length > 1 && (
                                  <div className="text-xs text-gray-500 mb-1">Starting from</div>
                                )}
                              </div>
                              <div className="flex items-baseline gap-3 mb-2">
                                <span className="text-2xl font-bold text-purple-600">
                                  ₹{minPrice}
                                </span>
                                {minPriceTimePeriod && minPriceTimePeriod.originalPrice > minPriceTimePeriod.price && (
                                  <>
                                    <span className="text-lg text-gray-500 line-through">
                                      ₹{minPriceTimePeriod.originalPrice}
                                    </span>
                                    {discountPercentage > 0 && (
                                      <span className="text-sm bg-red-500 text-white px-2 py-1 rounded-md font-semibold shadow-sm">
                                        {discountPercentage}% OFF
                                      </span>
                                    )}
                                  </>
                                )}
                                {!minPriceTimePeriod && offer.originalPrice > offer.price && (
                                  <>
                                    <span className="text-lg text-gray-500 line-through">
                                      ₹{offer.originalPrice}
                                    </span>
                                    {discountPercentage > 0 && (
                                      <span className="text-sm bg-red-500 text-white px-2 py-1 rounded-md font-semibold shadow-sm">
                                        {discountPercentage}% OFF
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 font-medium">One-time payment</div>
                            </div>

                            {/* CTA */}
                            {selectedComboOfferId === offer._id ? (
                              <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md w-full lg:w-auto justify-center">
                                <FiCheckCircle className="w-4 h-4" />
                                <span>Selected</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:bg-purple-700 transition-colors w-full lg:w-auto justify-center cursor-pointer">
                                <span>Select Combo</span>
                                <FiArrowRight className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

            </div>
          )}

          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg">
                <FiShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
                <p className="text-sm text-gray-600">
                  Complete your purchase securely
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Cart Items */}
              {!selectedComboOfferId && cart && cart.items.length > 0 && (
                <Card className="overflow-hidden shadow-xl border-2 border-purple-100">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Cart Items</h2>
                    <div className="space-y-4">
                      {cart.items.map((item: any, index: number) => (
                        <Card key={index} className="overflow-hidden hover:shadow-md transition-all duration-300 bg-white border border-purple-100">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                          {item.categoryId.bannerImageUrl ? (
                            <img
                              src={item.categoryId.bannerImageUrl}
                              alt={item.categoryId.name}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                              <span className="text-white font-bold">
                                {item.categoryId.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{item.categoryId.name}</h3>
                            {item.selectedDurationMonths && (
                              <div className="text-xs text-gray-600 mb-1">
                                Duration: {item.selectedDurationMonths} {item.selectedDurationMonths === 1 ? 'month' : 'months'}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              {item.originalPrice && item.originalPrice > item.price ? (
                                <>
                                  <span className="text-lg font-bold text-gray-900">
                                    ₹{item.price}
                                  </span>
                                  <span className="text-sm text-gray-500 line-through">
                                    ₹{item.originalPrice}
                                  </span>
                                  <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">
                                    {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                                  </span>
                                </>
                              ) : (
                                <span className="text-lg font-bold text-gray-900">₹{item.price}</span>
                              )}
                            </div>
                          </div>
                        </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Selected Combo Offer */}
              {selectedComboOfferId && comboOffer && (
                <Card className="overflow-hidden shadow-xl border-2 border-purple-100">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Selected Combo Offer</h2>
                    <Card className="overflow-hidden bg-gradient-to-r from-purple-50 to-purple-25 border border-purple-200">
                      <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{comboOffer.name}</h3>
                        <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                          COMBO
                        </span>
                      </div>
                      {comboOffer.description && (
                        <p className="text-sm text-gray-600 mb-3">{comboOffer.description}</p>
                      )}
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Includes Categories:</p>
                        <div className="flex flex-wrap gap-2">
                          {comboOffer.categoryIds.map((cat: any) => (
                            <span
                              key={cat._id}
                              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
                            >
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      {comboOffer.benefits && comboOffer.benefits.length > 0 && (
                        <ul className="space-y-2 mb-3">
                          {comboOffer.benefits.map((benefit: string, idx: number) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                              <FiCheckCircle className="w-4 h-4 text-green-500" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      )}
                      
                      {/* Duration Selection */}
                      {comboOffer.timePeriods && comboOffer.timePeriods.length > 0 && (
                        <div className="mb-4">
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            Select Duration:
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {comboOffer.timePeriods.map((period: TimePeriod, idx: number) => {
                              const discount = period.originalPrice > 0
                                ? Math.round(((period.originalPrice - period.price) / period.originalPrice) * 100)
                                : 0
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedDuration(period.months)}
                                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                                    selectedDuration === period.months
                                      ? 'border-purple-500 bg-purple-50'
                                      : 'border-gray-200 hover:border-purple-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-semibold text-gray-900">
                                        {period.months} {period.months === 1 ? 'Month' : 'Months'}
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-lg font-bold text-purple-600">₹{period.price}</span>
                                        {period.originalPrice > period.price && (
                                          <>
                                            <span className="text-sm text-gray-500 line-through">
                                              ₹{period.originalPrice}
                                            </span>
                                            {discount > 0 && (
                                              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                                                {discount}% OFF
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    {selectedDuration === period.months && (
                                      <FiCheckCircle className="w-5 h-5 text-purple-600" />
                                    )}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Fallback for old combo offers without time periods */}
                      {(!comboOffer.timePeriods || comboOffer.timePeriods.length === 0) && (
                        <div className="flex items-center gap-2 mt-4">
                          <span className="text-2xl font-bold text-purple-600">₹{comboOffer.price}</span>
                          {comboOffer.originalPrice > comboOffer.price && (
                            <>
                              <span className="text-sm text-gray-500 line-through">
                                ₹{comboOffer.originalPrice}
                              </span>
                              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                                {Math.round(((comboOffer.originalPrice - comboOffer.price) / comboOffer.originalPrice) * 100)}% OFF
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Order Summary - Right Side (Sticky) */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card className="overflow-hidden shadow-xl border-2 border-purple-200">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                    <h2 className="text-xl font-bold text-white">Order Summary</h2>
                  </div>

                  <CardContent className="p-6 space-y-6">
                    {/* Items Count */}
                    {cart && cart.items.length > 0 && !selectedComboOfferId && (
                      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                        <span className="text-gray-600">Items in Cart</span>
                        <span className="font-semibold text-gray-900">{cart.items.length}</span>
                      </div>
                    )}

                    {/* Item List */}
                    <div className="space-y-3 pb-4 border-b border-gray-200">
                      {selectedComboOfferId && comboOffer ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-sm text-gray-700 flex-1">{comboOffer.name}</span>
                            <span className="text-sm font-semibold text-gray-900">
                              ₹{selectedDuration && comboOffer.timePeriods
                                ? comboOffer.timePeriods.find((tp: TimePeriod) => tp.months === selectedDuration)?.price || comboOffer.price
                                : comboOffer.price}
                            </span>
                          </div>
                          {selectedDuration && comboOffer.timePeriods && (
                            <div className="flex justify-between items-start gap-2 text-xs text-gray-600">
                              <span>Duration: {selectedDuration} {selectedDuration === 1 ? 'Month' : 'Months'}</span>
                            </div>
                          )}
                        </div>
                      ) : cart && cart.items.length > 0 ? (
                        <>
                          {cart.items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between items-start gap-2">
                              <span className="text-sm text-gray-700 flex-1">{item.categoryId.name}</span>
                              <span className="text-sm font-semibold text-gray-900">
                                ₹{item.discountedPrice || item.price}
                              </span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="text-gray-500 text-sm">No items selected</p>
                      )}
                    </div>

                    {/* Total Amount */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-700 font-medium">Total Amount</span>
                        <span className="text-3xl font-bold text-purple-600">
                          ₹{totalAmount}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Inclusive of all taxes</p>
                    </div>
                    {/* Checkout Button */}
                    <Button
                      onClick={handleProceedToPayment}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-4 text-lg shadow-lg"
                      size="lg"
                      disabled={totalAmount === 0}
                    >
                      Proceed to Payment
                      <FiArrowRight className="ml-2 w-5 h-5" />
                    </Button>

                    {/* Security Badge */}
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                      <FiCheckCircle className="w-4 h-4 text-green-500" />
                      <span>Secure Payment</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}

