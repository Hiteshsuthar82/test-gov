import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Select } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { SearchInput } from '../../components/ui/search-input'
import { Pagination } from '../../components/ui/pagination'
import { Loader } from '../../components/ui/loader'

export default function SubscriptionsListPage() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', status, search, page, pageSize],
    queryFn: async () => {
      const response = await api.get('/admin/subscriptions', {
        params: { 
          status: status || undefined, 
          search: search || undefined,
          page, 
          limit: pageSize 
        },
      })
      return response.data.data
    },
  })

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const subscriptions = data?.subscriptions || []
  const total = data?.total || subscriptions.length

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Subscriptions</h1>
          <Select 
            value={status} 
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-48"
          >
            <option value="">All Status</option>
            <option value="PENDING_REVIEW">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>
        
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search subscriptions by user name or category..."
            className="max-w-md"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-900">User</TableHead>
              <TableHead className="font-semibold text-gray-900">Category</TableHead>
              <TableHead className="font-semibold text-gray-900">Status</TableHead>
              <TableHead className="font-semibold text-gray-900">Start Date</TableHead>
              <TableHead className="font-semibold text-gray-900">End Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Loader inline />
                </TableCell>
              </TableRow>
            ) : subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                  No subscriptions found
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((sub: any) => (
                <TableRow key={sub._id} className="hover:bg-gray-50">
                  <TableCell className="text-gray-900">{sub.userId?.name}</TableCell>
                  <TableCell className="text-gray-700">{sub.categoryId?.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      sub.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      sub.status === 'PENDING_REVIEW' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sub.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-700">{sub.startsAt ? new Date(sub.startsAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-gray-700">{sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {!isLoading && total > pageSize && (
          <div className="p-4 border-t border-gray-200">
            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              onChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}

