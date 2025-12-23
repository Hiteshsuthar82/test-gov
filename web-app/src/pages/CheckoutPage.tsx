import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
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
  const [fromCart, setFromCart] = useState(false)

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

  // Set default duration when combo offer loads
  useEffect(() => {
    if (comboOffer && comboOffer.timePeriods && comboOffer.timePeriods.length > 0 && !selectedDuration) {
      // Find minimum duration
      const minPeriod = comboOffer.timePeriods.reduce((min, tp) => 
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
      const selectedPeriod = comboOffer.timePeriods?.find(tp => tp.months === selectedDuration)
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
    ? (comboOffer.timePeriods?.find(tp => tp.months === selectedDuration)?.price || comboOffer.price || 0)
    : selectedComboOfferId && comboOffer && (!comboOffer.timePeriods || comboOffer.timePeriods.length === 0)
    ? comboOffer.price || 0
    : cart?.totalAmount || 0

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
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Combo Offers Selection */}
              {!selectedComboOfferId && allComboOffers && allComboOffers.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Available Combo Offers
                    </h2>
                    <div className="space-y-3">
                      {allComboOffers.map((offer: ComboOffer) => {
                        const discountPercentage = offer.originalPrice > 0
                          ? Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100)
                          : 0
                        return (
                          <Card
                            key={offer._id}
                            className={`cursor-pointer transition-all ${
                              selectedComboOfferId === offer._id
                                ? 'border-purple-500 border-2'
                                : 'hover:border-purple-300'
                            }`}
                            onClick={() => setSelectedComboOfferId(offer._id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-gray-900">{offer.name}</h3>
                                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                                      COMBO
                                    </span>
                                  </div>
                                  {offer.description && (
                                    <p className="text-sm text-gray-600 mb-2">{offer.description}</p>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-purple-600">
                                      ₹{offer.price}
                                    </span>
                                    {offer.originalPrice > offer.price && (
                                      <>
                                        <span className="text-sm text-gray-500 line-through">
                                          ₹{offer.originalPrice}
                                        </span>
                                        {discountPercentage > 0 && (
                                          <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                                            {discountPercentage}% OFF
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  {offer.benefits && offer.benefits.length > 0 && (
                                    <ul className="mt-2 space-y-1">
                                      {offer.benefits.slice(0, 3).map((benefit, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                                          <FiCheckCircle className="w-3 h-3 text-green-500" />
                                          {benefit}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                                {selectedComboOfferId === offer._id && (
                                  <FiCheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setSelectedComboOfferId(null)}
                      disabled={!selectedComboOfferId}
                    >
                      Continue with Cart Items
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Cart Items */}
              {!selectedComboOfferId && cart && cart.items.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Cart Items</h2>
                    <div className="space-y-3">
                      {cart.items.map((item: any, index: number) => (
                        <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
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
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Selected Combo Offer */}
              {selectedComboOfferId && comboOffer && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Selected Combo Offer</h2>
                    <div className="p-4 border rounded-lg">
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
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
                  <div className="space-y-3 mb-4">
                    {selectedComboOfferId && comboOffer ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Combo Offer:</span>
                          <span className="font-semibold">{comboOffer.name}</span>
                        </div>
                        {selectedDuration && comboOffer.timePeriods && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">
                              {selectedDuration} {selectedDuration === 1 ? 'Month' : 'Months'}
                            </span>
                            <span className="font-semibold">
                              ₹{comboOffer.timePeriods.find((tp: TimePeriod) => tp.months === selectedDuration)?.price || comboOffer.price}
                            </span>
                          </div>
                        )}
                        {!selectedDuration && (!comboOffer.timePeriods || comboOffer.timePeriods.length === 0) && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Price:</span>
                            <span className="font-semibold">₹{comboOffer.price}</span>
                          </div>
                        )}
                      </div>
                    ) : cart && cart.items.length > 0 ? (
                      <>
                        {cart.items.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-600 truncate">{item.categoryId.name}</span>
                            <span className="font-semibold">
                              ₹{item.discountedPrice || item.price}
                            </span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-gray-500 text-sm">No items selected</p>
                    )}
                  </div>
                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-2xl font-bold text-purple-600">₹{totalAmount}</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleProceedToPayment}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
                    size="lg"
                    disabled={totalAmount === 0}
                  >
                    Proceed to Payment
                    <FiArrowRight className="ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

