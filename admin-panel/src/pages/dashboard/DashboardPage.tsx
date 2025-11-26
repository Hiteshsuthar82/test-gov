import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Users, BookOpen, CreditCard, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard')
      return response.data.data
    },
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  const stats = [
    {
      title: 'Total Users',
      value: data?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Total Categories',
      value: data?.totalCategories || 0,
      icon: BookOpen,
      color: 'text-green-600',
    },
    {
      title: 'Total Revenue',
      value: `₹${data?.totalRevenue?.toLocaleString() || 0}`,
      icon: TrendingUp,
      color: 'text-purple-600',
    },
    {
      title: 'Pending Payments',
      value: data?.pendingPayments || 0,
      icon: CreditCard,
      color: 'text-orange-600',
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.recentPayments?.slice(0, 5).map((payment: any) => (
                <div key={payment._id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <div className="font-medium">{payment.userId?.name}</div>
                    <div className="text-sm text-gray-500">{payment.categoryId?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">₹{payment.amount}</div>
                    <div className={`text-sm ${
                      payment.status === 'APPROVED' ? 'text-green-600' :
                      payment.status === 'PENDING_REVIEW' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {payment.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.recentAttempts?.slice(0, 5).map((attempt: any) => (
                <div key={attempt._id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <div className="font-medium">{attempt.userId?.name}</div>
                    <div className="text-sm text-gray-500">{attempt.testSetId?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{attempt.totalScore} / {attempt.testSetId?.totalMarks}</div>
                    <div className="text-sm text-gray-500">{attempt.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

