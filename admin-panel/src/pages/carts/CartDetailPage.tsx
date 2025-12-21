import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Loader } from '../../components/ui/loader'
import { ArrowLeft } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

export default function CartDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart', id],
    queryFn: async () => {
      const response = await api.get(`/admin/carts/${id}`)
      return response.data.data
    },
  })

  if (isLoading) {
    return <Loader />
  }

  if (!cart) {
    return (
      <div>
        <Button variant="outline" onClick={() => navigate('/carts')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <p className="text-gray-500">Cart not found</p>
      </div>
    )
  }

  const userName = cart.userId?.name || 'N/A'
  const userEmail = cart.userId?.email || 'N/A'
  const userMobile = cart.userId?.mobile || 'N/A'
  const items = cart.items || []

  return (
    <div>
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate('/carts')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Cart Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cart Items</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Original Price</TableHead>
                      <TableHead>Added At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: any, index: number) => {
                      const categoryName = item.categoryId?.name || 'N/A'
                      const categoryPrice = item.categoryId?.price || 0
                      
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{categoryName}</TableCell>
                          <TableCell>₹{item.price || item.discountedPrice || categoryPrice}</TableCell>
                          <TableCell>
                            {item.originalPrice ? (
                              <span className="line-through text-gray-500">₹{item.originalPrice}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.addedAt
                              ? new Date(item.addedAt).toLocaleString()
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{userName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{userEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Mobile</p>
                <p className="font-medium">{userMobile}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Cart Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Items:</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="text-2xl font-bold text-purple-600">₹{cart.totalAmount || 0}</span>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">Created At</p>
                <p className="font-medium">
                  {cart.createdAt
                    ? new Date(cart.createdAt).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Updated At</p>
                <p className="font-medium">
                  {cart.updatedAt
                    ? new Date(cart.updatedAt).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

