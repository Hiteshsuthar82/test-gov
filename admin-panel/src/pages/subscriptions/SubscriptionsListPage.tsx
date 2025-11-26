import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Select } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

export default function SubscriptionsListPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', status, page],
    queryFn: async () => {
      const response = await api.get('/admin/subscriptions', {
        params: { status: status || undefined, page, limit: 20 },
      })
      return response.data.data
    },
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          <option value="PENDING_REVIEW">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </Select>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.subscriptions?.map((sub: any) => (
              <TableRow key={sub._id}>
                <TableCell>{sub.userId?.name}</TableCell>
                <TableCell>{sub.categoryId?.name}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    sub.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    sub.status === 'PENDING_REVIEW' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {sub.status}
                  </span>
                </TableCell>
                <TableCell>{sub.startsAt ? new Date(sub.startsAt).toLocaleDateString() : '-'}</TableCell>
                <TableCell>{sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

