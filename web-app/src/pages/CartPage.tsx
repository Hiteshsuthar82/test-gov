import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useConfirmation } from '@/components/ui/confirmation-dialog'
import { api } from '@/lib/api'
import Layout from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FiShoppingCart, FiTrash2, FiArrowRight, FiX, FiCheckCircle } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import toast from 'react-hot-toast'

interface TimePeriod {
  months: number
  price: number
  originalPrice: number
}

interface CartItem {
  categoryId: {
    _id: string
    name: string
    price: number
    bannerImageUrl?: string
    timePeriods?: TimePeriod[]
  }
  price: number
  originalPrice?: number
  discountedPrice?: number
  selectedDurationMonths?: number
  addedAt: string
}

interface Cart {
  _id: string
  items: CartItem[]
  totalAmount: number
}

export default function CartPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { confirm } = useConfirmation()

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await api.get('/cart')
      return response.data.data
    },
    enabled: !!user,
  })

  const removeItemMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      await api.delete(`/cart/items/${categoryId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/cart')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })

  const updateDurationMutation = useMutation({
    mutationFn: async ({ categoryId, newDurationMonths }: { categoryId: string; newDurationMonths: number }) => {
      await api.patch(`/cart/items/${categoryId}/duration`, { newDurationMonths })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success('Duration updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update duration')
    },
  })

  const handleRemoveItem = async (categoryId: string) => {
    const confirmed = await confirm({
      title: 'Remove Item',
      message: 'Are you sure you want to remove this item from your cart?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    
    if (confirmed) {
      removeItemMutation.mutate(categoryId);
    }
  }

  const handleClearCart = async () => {
    const confirmed = await confirm({
      title: 'Clear Cart',
      message: 'Are you sure you want to clear all items from your cart? This action cannot be undone.',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    
    if (confirmed) {
      clearCartMutation.mutate();
    }
  }

  const handleCheckout = () => {
    if (cart && cart.items.length > 0) {
      navigate('/checkout', { state: { fromCart: true, cartId: cart._id } })
    }
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <FiShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Login</h2>
            <p className="text-gray-600 mb-6">You need to be logged in to view your cart.</p>
            <Link to="/login">
              <Button>Login</Button>
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="text-center">Loading cart...</div>
          </div>
        </div>
      </Layout>
    )
  }

  const cartData: Cart = cart || { _id: '', items: [], totalAmount: 0 }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg">
                  <FiShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
                  <p className="text-sm text-gray-600">
                    {cartData.items.length} {cartData.items.length === 1 ? 'item' : 'items'} in your cart
                  </p>
                </div>
              </div>
              {cartData.items.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleClearCart}
                  disabled={clearCartMutation.isPending}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <FiX className="mr-2" />
                  Clear Cart
                </Button>
              )}
            </div>
          </div>

          {cartData.items.length === 0 ? (
            <Card className="overflow-hidden">
              <CardContent className="pt-16 pb-16 text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                  <FiShoppingCart className="w-12 h-12 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Your cart is empty</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Discover our amazing test series and add them to your cart to get started with your preparation journey.
                </p>
                <Link to="/categories">
                  <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-6 text-lg shadow-lg">
                    <FiArrowRight className="mr-2" />
                    Browse Categories
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Cart Items - Left Side */}
              <div className="lg:col-span-2 space-y-3">
                {cartData.items.map((item, index) => (
                  <Card key={index} className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-white border border-purple-100">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Image/Icon */}
                        {item.categoryId.bannerImageUrl ? (
                          <img
                            src={item.categoryId.bannerImageUrl}
                            alt={item.categoryId.name}
                            className="w-16 h-16 rounded-lg object-cover border border-purple-100 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-lg">
                              {item.categoryId.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <h3 className="font-bold text-gray-900 mb-2">{item.categoryId.name}</h3>
                          
                          {/* Duration Selector - Similar to checkout page combo design */}
                          {item.categoryId.timePeriods && item.categoryId.timePeriods.length > 0 && (
                            <div className="mb-3">
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Select Duration:
                              </Label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {item.categoryId.timePeriods.map((period) => {
                                  const isSelected = (item.selectedDurationMonths || item.categoryId.timePeriods![0].months) === period.months;
                                  const discount = period.originalPrice > period.price
                                    ? Math.round(((period.originalPrice - period.price) / period.originalPrice) * 100)
                                    : 0;
                                  
                                  return (
                                    <button
                                      key={period.months}
                                      type="button"
                                      onClick={() => {
                                        updateDurationMutation.mutate({
                                          categoryId: item.categoryId._id,
                                          newDurationMonths: period.months
                                        })
                                      }}
                                      disabled={updateDurationMutation.isPending}
                                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                                        isSelected
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
                                        {isSelected && (
                                          <FiCheckCircle className="w-5 h-5 text-purple-600" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* Price */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-2">
                              {item.originalPrice && item.originalPrice > item.price ? (
                                <>
                                  <span className="text-xl font-bold text-purple-600">
                                    ₹{item.price}
                                  </span>
                                  <span className="text-sm text-gray-400 line-through">
                                    ₹{item.originalPrice}
                                  </span>
                                  <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-semibold">
                                    {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                                  </span>
                                </>
                              ) : (
                                <span className="text-xl font-bold text-purple-600">
                                  ₹{item.price}
                                </span>
                              )}
                            </div>
                            
                            {/* Remove Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.categoryId._id)}
                              disabled={removeItemMutation.isPending}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

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
                      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                        <span className="text-gray-600">Items in Cart</span>
                        <span className="font-semibold text-gray-900">{cartData.items.length}</span>
                      </div>
                      
                      {/* Item List */}
                      <div className="space-y-3 pb-4 border-b border-gray-200">
                        {cartData.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-start gap-2">
                            <span className="text-sm text-gray-700 flex-1">{item.categoryId.name}</span>
                            <span className="text-sm font-semibold text-gray-900">₹{item.price}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Total Amount */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-700 font-medium">Total Amount</span>
                          <span className="text-3xl font-bold text-purple-600">
                            ₹{cartData.totalAmount}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">Inclusive of all taxes</p>
                      </div>
                      
                      {/* Checkout Button */}
                      <Button
                        onClick={handleCheckout}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-4 text-lg shadow-lg"
                        size="lg"
                      >
                        Proceed to Checkout
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
          )}
        </div>
      </div>
    </Layout>
  )
}

