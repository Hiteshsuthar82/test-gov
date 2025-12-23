import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import Layout from '@/components/layout/Layout'
import { 
  FiCheckCircle, 
  FiClock, 
  FiXCircle, 
  FiArrowRight, 
  FiCalendar, 
  FiAlertCircle,
  FiTarget,
  FiList,
  FiX
} from 'react-icons/fi'

interface SubscriptionHistory {
  createdAt: string
  updatedAt: string
  startsAt?: string
  expiresAt?: string
  paymentReferenceId: string
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  isComboOffer: boolean
  amount?: number
  comboOfferId?: string
  comboOfferDetails?: any
  selectedDurationMonths?: number
  selectedTimePeriod?: any
}

interface Subscription {
  _id: string
  categoryId?: {
    _id: string
    name: string
    price: number
    bannerImageUrl?: string
  }
  isComboOffer: boolean
  comboOfferId?: {
    _id: string
    name: string
    description?: string
    imageUrl?: string
  }
  comboOfferDetails?: {
    _id: string
    name: string
    description?: string
    imageUrl?: string
    categoryIds: Array<{
      _id: string
      name: string
      price: number
      bannerImageUrl?: string
    }>
    price?: number
    originalPrice?: number
    benefits: string[]
  }
  selectedDurationMonths?: number
  selectedTimePeriod?: {
    months: number
    price: number
    originalPrice: number
  }
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  paymentReferenceId?: {
    amount: number
    status: string
  }
  amount?: number
  startsAt?: string
  expiresAt?: string
  subscriptionHistory?: SubscriptionHistory[]
  createdAt: string
}

export default function MySubscriptionsPage() {
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/me')
      return response.data.data
    },
  })

  const isSubscriptionExpired = (subscription: Subscription): boolean => {
    if (subscription.status !== 'APPROVED') return false
    if (!subscription.expiresAt) return false
    const now = new Date()
    const expiresAt = new Date(subscription.expiresAt)
    return expiresAt < now
  }


  const getStatusBadgeColor = (status: string, isExpired: boolean = false) => {
    if (isExpired) {
      return 'bg-red-100 text-red-700 border-red-200'
    }
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'REJECTED':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusText = (status: string, isExpired: boolean = false) => {
    if (isExpired) {
      return 'EXPIRED'
    }
    return status.replace('_', ' ')
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDaysRemaining = (subscription: Subscription): number | null => {
    if (subscription.status !== 'APPROVED') return null
    if (!subscription.expiresAt) return null
    const now = new Date()
    const expiresAt = new Date(subscription.expiresAt)
    if (expiresAt < now) return null
    const diffTime = expiresAt.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const openHistoryModal = (subscription: Subscription) => {
    setSelectedSubscription(subscription)
    setIsHistoryModalOpen(true)
  }


  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Subscriptions</h1>
            <p className="text-lg text-gray-600">Manage and view all your category subscriptions</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse bg-purple-50">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : subscriptions && subscriptions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscriptions.map((subscription: Subscription) => {
                const expired = isSubscriptionExpired(subscription)
                const daysRemaining = getDaysRemaining(subscription)
                const hasHistory = subscription.subscriptionHistory && subscription.subscriptionHistory.length > 1
                
                return (
                  <Card
                    key={subscription._id}
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-purple-50 rounded-lg shadow-sm flex flex-col h-fit"
                  >
                    {/* Header Section with gradient background */}
                    <div className="relative bg-gradient-to-b from-purple-200 to-transparent pt-3 px-4 pb-2 flex-shrink-0">
                      <div className="flex items-start justify-between">
                        {/* Left: Circular Logo/Icon */}
                        <div className="flex items-center">
                          {subscription.isComboOffer ? (
                            subscription.comboOfferDetails?.imageUrl ? (
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm border border-white">
                                <img
                                  src={subscription.comboOfferDetails.imageUrl}
                                  alt={subscription.comboOfferDetails.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : subscription.comboOfferDetails?.categoryIds?.[0]?.bannerImageUrl ? (
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm border border-white">
                                <img
                                  src={subscription.comboOfferDetails.categoryIds[0].bannerImageUrl}
                                  alt={subscription.comboOfferDetails.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-rose-500 flex items-center justify-center shadow-sm">
                                <FiTarget className="w-5 h-5 text-white" />
                              </div>
                            )
                          ) : subscription.categoryId?.bannerImageUrl ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm border border-white">
                              <img
                                src={subscription.categoryId.bannerImageUrl}
                                alt={subscription.categoryId.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-rose-500 flex items-center justify-center shadow-sm">
                              <FiTarget className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Right: Status Badge and History Icon */}
                        <div className="flex items-center gap-2">
                          {hasHistory && (
                            <button
                              onClick={() => openHistoryModal(subscription)}
                              className="p-1.5 rounded-full bg-purple-100 hover:bg-purple-200 transition-colors"
                              title="View History"
                            >
                              <FiList className="w-4 h-4 text-purple-600" />
                            </button>
                          )}
                          <div className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(subscription.status, expired)}`}>
                            {getStatusText(subscription.status, expired)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <CardContent className="px-4 pt-3 pb-4 flex-1 flex flex-col justify-between">
                      <div className="flex-1">
                        {/* Title Section */}
                        <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                          {subscription.isComboOffer
                            ? subscription.comboOfferDetails?.name || 'Combo Offer'
                            : subscription.categoryId?.name || 'Category'}
                        </h3>

                        {/* Combo Badge */}
                        {subscription.isComboOffer && (
                          <div className="mb-2">
                            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                              COMBO
                            </span>
                          </div>
                        )}

                        {/* Amount Paid */}
                        {(subscription.amount !== undefined || subscription.paymentReferenceId) && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-600">Amount Paid: </span>
                            <span className="text-sm font-bold text-gray-900">
                              ₹{subscription.amount !== undefined ? subscription.amount : (subscription.paymentReferenceId?.amount || 0)}
                            </span>
                          </div>
                        )}

                        {/* Dates */}
                        <div className="space-y-1 mb-3">
                          {subscription.startsAt && (
                            <div className="flex items-center text-xs text-gray-600">
                              <FiCalendar className="mr-1.5 w-3 h-3" />
                              <span>Started: {formatDate(subscription.startsAt)}</span>
                            </div>
                          )}
                          {subscription.expiresAt && (
                            <div className={`flex items-center text-xs ${expired ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                              <FiCalendar className="mr-1.5 w-3 h-3" />
                              <span>Expires: {formatDate(subscription.expiresAt)}</span>
                            </div>
                          )}
                          {daysRemaining !== null && daysRemaining > 0 && (
                            <div className={`px-2 py-1 rounded-full text-xs font-semibold inline-block ${
                              daysRemaining <= 7 
                                ? 'bg-red-100 text-red-700' 
                                : daysRemaining <= 30 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {daysRemaining === 1 
                                ? '1 day remaining' 
                                : `${daysRemaining} days remaining`}
                            </div>
                          )}
                        </div>

                        {/* Combo Offer Details */}
                        {subscription.isComboOffer && subscription.comboOfferDetails && (
                          <div className="mb-3">
                            {subscription.selectedDurationMonths && (
                              <div className="text-xs text-gray-600 mb-1">
                                <span>Duration: </span>
                                <span className="font-semibold">
                                  {subscription.selectedDurationMonths} {subscription.selectedDurationMonths === 1 ? 'Month' : 'Months'}
                                </span>
                              </div>
                            )}
                            {subscription.comboOfferDetails.categoryIds && subscription.comboOfferDetails.categoryIds.length > 0 && (
                              <div className="text-xs text-gray-600">
                                <span>Includes: </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {subscription.comboOfferDetails.categoryIds.slice(0, 3).map((cat: any, idx: number) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded"
                                    >
                                      {cat.name || cat}
                                    </span>
                                  ))}
                                  {subscription.comboOfferDetails.categoryIds.length > 3 && (
                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                      +{subscription.comboOfferDetails.categoryIds.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Status Messages */}
                        {expired && (
                          <div className="text-xs text-red-700 bg-red-100 p-2 rounded border border-red-200 mb-2">
                            <div className="flex items-center gap-1 mb-1">
                              <FiAlertCircle className="w-3 h-3" />
                              <span className="font-semibold">Expired</span>
                            </div>
                            <p className="text-[10px] mt-0.5">
                              Expired on {formatDate(subscription.expiresAt)}
                            </p>
                          </div>
                        )}
                        {subscription.status === 'PENDING_REVIEW' && (
                          <div className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded mb-2">
                            Payment under review
                          </div>
                        )}
                        {subscription.status === 'REJECTED' && (
                          <div className="text-xs text-red-700 bg-red-100 p-2 rounded mb-2">
                            Subscription rejected
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      {subscription.status === 'APPROVED' && !expired && (
                        <div className="mt-3">
                          {subscription.isComboOffer && subscription.comboOfferDetails?.categoryIds && subscription.comboOfferDetails.categoryIds.length > 0 ? (
                            <Link to={`/categories/${subscription.comboOfferDetails.categoryIds[0]._id || subscription.comboOfferDetails.categoryIds[0]}`}>
                              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-sm py-2">
                                View Categories
                                <FiArrowRight className="ml-2 w-4 h-4" />
                              </Button>
                            </Link>
                          ) : !subscription.isComboOffer && subscription.categoryId?._id ? (
                            <Link to={`/categories/${subscription.categoryId._id}`}>
                              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-sm py-2">
                                View Category
                                <FiArrowRight className="ml-2 w-4 h-4" />
                              </Button>
                            </Link>
                          ) : null}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="bg-white">
              <CardContent className="pt-6 text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FiClock className="mx-auto text-6xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Subscriptions Yet</h3>
                <p className="text-gray-600 mb-6">
                  Browse categories and subscribe to access test series
                </p>
                <Link to="/">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Browse Categories
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Fixed Header */}
          <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b bg-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Subscription History
                </DialogTitle>
                {selectedSubscription && (
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedSubscription.isComboOffer
                      ? selectedSubscription.comboOfferDetails?.name || 'Combo Offer'
                      : selectedSubscription.categoryId?.name || 'Category'}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedSubscription && selectedSubscription.subscriptionHistory && selectedSubscription.subscriptionHistory.length > 0 ? (
              <div className="space-y-6">
              {/* Timeline */}
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-purple-200"></div>

                {/* History Items */}
                <div className="space-y-6">
                  {selectedSubscription.subscriptionHistory
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((history, index) => {
                      const isApproved = history.status === 'APPROVED'
                      const isRejected = history.status === 'REJECTED'

                      return (
                        <div key={index} className="relative flex items-start gap-4">
                          {/* Timeline Dot */}
                          <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            isApproved 
                              ? 'bg-green-500' 
                              : isRejected 
                              ? 'bg-red-500' 
                              : 'bg-yellow-500'
                          }`}>
                            {isApproved ? (
                              <FiCheckCircle className="w-4 h-4 text-white" />
                            ) : isRejected ? (
                              <FiXCircle className="w-4 h-4 text-white" />
                            ) : (
                              <FiClock className="w-4 h-4 text-white" />
                            )}
                          </div>

                          {/* Content Card */}
                          <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                  isApproved 
                                    ? 'bg-green-100 text-green-700' 
                                    : isRejected 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {history.status.replace('_', ' ')}
                                </div>
                                {history.isComboOffer && (
                                  <span className="ml-2 inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                                    COMBO
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(history.createdAt)}
                              </span>
                            </div>

                            <div className="space-y-2 text-sm">
                              {history.amount && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600">Amount:</span>
                                  <span className="font-semibold text-gray-900">₹{history.amount}</span>
                                </div>
                              )}

                              {history.startsAt && (
                                <div className="flex items-center gap-2">
                                  <FiCalendar className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600">Started:</span>
                                  <span className="text-gray-900">{formatDate(history.startsAt)}</span>
                                </div>
                              )}

                              {history.expiresAt && (
                                <div className="flex items-center gap-2">
                                  <FiCalendar className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600">Expires:</span>
                                  <span className="text-gray-900">{formatDate(history.expiresAt)}</span>
                                </div>
                              )}

                              {history.selectedDurationMonths && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600">Duration:</span>
                                  <span className="text-gray-900">
                                    {history.selectedDurationMonths} {history.selectedDurationMonths === 1 ? 'Month' : 'Months'}
                                  </span>
                                </div>
                              )}

                              {history.updatedAt && history.updatedAt !== history.createdAt && (
                                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                                  Last updated: {formatDateTime(history.updatedAt)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No history available
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <DialogFooter className="flex-shrink-0 px-6 py-4 border-t bg-white">
            <Button
              onClick={() => setIsHistoryModalOpen(false)}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
