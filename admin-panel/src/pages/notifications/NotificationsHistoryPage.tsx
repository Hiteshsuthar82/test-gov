import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Plus } from 'lucide-react'

export default function NotificationsHistoryPage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/admin/notifications')
      return response.data.data.notifications
    },
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <Button onClick={() => navigate('/notifications/send')}>
          <Plus className="w-4 h-4 mr-2" />
          Send Notification
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Sent To</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((notification: any) => (
              <TableRow key={notification._id}>
                <TableCell className="font-medium">{notification.title}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                    {notification.type}
                  </span>
                </TableCell>
                <TableCell>{notification.target}</TableCell>
                <TableCell>{notification.sentTo?.length || 0} users</TableCell>
                <TableCell>{new Date(notification.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

