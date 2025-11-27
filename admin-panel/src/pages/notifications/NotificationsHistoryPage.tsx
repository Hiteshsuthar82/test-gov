import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { SearchInput } from '../../components/ui/search-input'
import { Pagination } from '../../components/ui/pagination'
import { Loader } from '../../components/ui/loader'
import { Plus } from 'lucide-react'

export default function NotificationsHistoryPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', search, page, pageSize],
    queryFn: async () => {
      const response = await api.get('/admin/notifications', {
        params: {
          search: search || undefined,
          page,
          limit: pageSize,
        },
      })
      const result = response.data.data
      return {
        notifications: result.notifications || [],
        total: result.total || (result.notifications || []).length,
      }
    },
  })

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const notifications = data?.notifications || []
  const total = data?.total || notifications.length

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <Button onClick={() => navigate('/notifications/send')}>
            <Plus className="w-4 h-4 mr-2" />
            Send Notification
          </Button>
        </div>
        
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search notifications by title or type..."
            className="max-w-md"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-900">Title</TableHead>
              <TableHead className="font-semibold text-gray-900">Type</TableHead>
              <TableHead className="font-semibold text-gray-900">Target</TableHead>
              <TableHead className="font-semibold text-gray-900">Sent To</TableHead>
              <TableHead className="font-semibold text-gray-900">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Loader inline />
                </TableCell>
              </TableRow>
            ) : notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                  No notifications found
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((notification: any) => (
                <TableRow key={notification._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">{notification.title}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {notification.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-700">{notification.target}</TableCell>
                  <TableCell className="text-gray-700">{notification.sentTo?.length || 0} users</TableCell>
                  <TableCell className="text-gray-700">{new Date(notification.createdAt).toLocaleString()}</TableCell>
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

