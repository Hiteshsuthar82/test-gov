import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Button } from '../../components/ui/button'
import { SearchInput } from '../../components/ui/search-input'
import { Pagination } from '../../components/ui/pagination'
import { Loader } from '../../components/ui/loader'
import { Select } from '../../components/ui/select'
import { Eye, Calendar } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

export default function CartsListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [userId, setUserId] = useState(searchParams.get('userId') || '')
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading } = useQuery({
    queryKey: ['carts', userId, dateFrom, dateTo, page, pageSize],
    queryFn: async () => {
      const response = await api.get('/admin/carts', {
        params: {
          userId: userId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          page,
          limit: pageSize,
        },
      })
      return response.data.data
    },
  })

  const handleFilterChange = () => {
    const params: any = {}
    if (userId) params.userId = userId
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    setSearchParams(params)
    setPage(1)
  }

  const handleClearFilters = () => {
    setUserId('')
    setDateFrom('')
    setDateTo('')
    setSearchParams({})
    setPage(1)
  }

  const carts = data?.carts || []
  const total = data?.pagination?.total || carts.length
  const totalPages = data?.pagination?.pages || Math.ceil(total / pageSize)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">User Carts</h1>
        
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleFilterChange}>Apply Filters</Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="bg-white rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Items Count</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Updated At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No carts found
                  </TableCell>
                </TableRow>
              ) : (
                carts.map((cart: any) => {
                  const userName = cart.userId?.name || 'N/A'
                  const userEmail = cart.userId?.email || 'N/A'
                  const itemsCount = cart.items?.length || 0
                  
                  return (
                    <TableRow key={cart._id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{userName}</div>
                          <div className="text-sm text-gray-500">{userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>{itemsCount}</TableCell>
                      <TableCell className="font-semibold">₹{cart.totalAmount || 0}</TableCell>
                      <TableCell>
                        {cart.createdAt
                          ? new Date(cart.createdAt).toLocaleString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {cart.updatedAt
                          ? new Date(cart.updatedAt).toLocaleString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/carts/${cart._id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}

