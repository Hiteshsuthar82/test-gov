import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Layout from '@/components/layout/Layout'
import { FiCheckCircle, FiClock, FiXCircle, FiArrowRight, FiCalendar } from 'react-icons/fi'

interface Subscription {
  _id: string
  categoryId: {
    _id: string
    name: string
    price: number
    bannerImageUrl?: string
  }
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  paymentReferenceId?: {
    amount: number
    status: string
  }
  startsAt?: string
  expiresAt?: string
  createdAt: string
}

export default function MySubscriptionsPage() {
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/me')
      return response.data.data
    },
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <FiCheckCircle className="text-green-600" />
      case 'PENDING_REVIEW':
        return <FiClock className="text-yellow-600" />
      case 'REJECTED':
        return <FiXCircle className="text-red-600" />
      default:
        return <FiClock className="text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'PENDING_REVIEW':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'REJECTED':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Subscriptions</h1>
          <p className="text-lg text-gray-600">Manage and view all your category subscriptions</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : subscriptions && subscriptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map((subscription: Subscription) => (
              <Card
                key={subscription._id}
                className={`hover:shadow-lg transition-shadow ${getStatusColor(subscription.status)}`}
              >
                {subscription.categoryId?.bannerImageUrl && (
                  <img
                    src={subscription.categoryId.bannerImageUrl}
                    alt={subscription.categoryId.name}
                    className="w-full h-32 object-cover rounded-t-lg"
                  />
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{subscription.categoryId?.name || 'Category'}</CardTitle>
                    <div className="flex items-center">
                      {getStatusIcon(subscription.status)}
                    </div>
                  </div>
                  <CardDescription>
                    <span className={`font-semibold ${getStatusColor(subscription.status).split(' ')[0]}`}>
                      {subscription.status.replace('_', ' ')}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    {subscription.paymentReferenceId && (
                      <div className="text-sm">
                        <span className="text-gray-600">Amount Paid: </span>
                        <span className="font-semibold">₹{subscription.paymentReferenceId.amount}</span>
                      </div>
                    )}
                    {subscription.startsAt && (
                      <div className="flex items-center text-sm text-gray-600">
                        <FiCalendar className="mr-2" />
                        <span>Started: {formatDate(subscription.startsAt)}</span>
                      </div>
                    )}
                    {subscription.expiresAt && (
                      <div className="flex items-center text-sm text-gray-600">
                        <FiCalendar className="mr-2" />
                        <span>Expires: {formatDate(subscription.expiresAt)}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <FiCalendar className="mr-2" />
                      <span>Subscribed: {formatDate(subscription.createdAt)}</span>
                    </div>
                  </div>
                  {subscription.status === 'APPROVED' && subscription.categoryId?._id && (
                    <Link to={`/categories/${subscription.categoryId._id}`}>
                      <Button className="w-full bg-purple-600 hover:bg-purple-700">
                        View Category
                        <FiArrowRight className="ml-2" />
                      </Button>
                    </Link>
                  )}
                  {subscription.status === 'PENDING_REVIEW' && (
                    <div className="text-sm text-yellow-700 bg-yellow-100 p-3 rounded">
                      Your payment is under review. You'll be notified once approved.
                    </div>
                  )}
                  {subscription.status === 'REJECTED' && (
                    <div className="text-sm text-red-700 bg-red-100 p-3 rounded">
                      Your subscription was rejected. Please contact support for assistance.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
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
    </Layout>
  )
}

