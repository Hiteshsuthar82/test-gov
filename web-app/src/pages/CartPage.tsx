import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import Layout from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FiShoppingCart, FiTrash2, FiArrowRight, FiX } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'

interface CartItem {
  categoryId: {
    _id: string
    name: string
    price: number
    bannerImageUrl?: string
  }
  price: number
  originalPrice?: number
  discountedPrice?: number
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

  const handleRemoveItem = (categoryId: string) => {
    if (confirm('Remove this item from cart?')) {
      removeItemMutation.mutate(categoryId)
    }
  }

  const handleClearCart = () => {
    if (confirm('Clear all items from cart?')) {
      clearCartMutation.mutate()
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
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            {cartData.items.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClearCart}
                disabled={clearCartMutation.isPending}
              >
                <FiX className="mr-2" />
                Clear Cart
              </Button>
            )}
          </div>

          {cartData.items.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <FiShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
                <p className="text-gray-600 mb-6">Add categories to your cart to get started.</p>
                <Link to="/categories">
                  <Button>Browse Categories</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {cartData.items.map((item, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {item.categoryId.bannerImageUrl ? (
                        <img
                          src={item.categoryId.bannerImageUrl}
                          alt={item.categoryId.name}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                          <span className="text-white font-bold text-xl">
                            {item.categoryId.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {item.categoryId.name}
                        </h3>
                        <div className="flex items-center gap-3">
                          {item.discountedPrice && item.discountedPrice < (item.originalPrice || item.price) ? (
                            <>
                              <span className="text-xl font-bold text-gray-900">
                                ₹{item.discountedPrice}
                              </span>
                              <span className="text-sm text-gray-500 line-through">
                                ₹{item.originalPrice || item.price}
                              </span>
                            </>
                          ) : (
                            <span className="text-xl font-bold text-gray-900">
                              ₹{item.price}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.categoryId._id)}
                        disabled={removeItemMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Summary */}
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                    <span className="text-2xl font-bold text-purple-600">
                      ₹{cartData.totalAmount}
                    </span>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
                    size="lg"
                  >
                    Proceed to Checkout
                    <FiArrowRight className="ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

