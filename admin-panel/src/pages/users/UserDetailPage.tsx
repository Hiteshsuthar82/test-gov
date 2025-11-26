import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

export default function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const response = await api.get(`/admin/users/${id}`)
      return response.data.data
    },
  })

  const { data: subscriptions } = useQuery({
    queryKey: ['user-subscriptions', id],
    queryFn: async () => {
      const response = await api.get(`/admin/users/${id}/subscriptions`)
      return response.data.data
    },
  })

  const { data: attempts } = useQuery({
    queryKey: ['user-attempts', id],
    queryFn: async () => {
      const response = await api.get(`/admin/users/${id}/attempts`)
      return response.data.data
    },
  })

  const blockMutation = useMutation({
    mutationFn: async (isBlocked: boolean) => {
      await api.patch(`/admin/users/${id}/block`, { isBlocked })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
    },
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Details</h1>
        <Button variant="outline" onClick={() => navigate('/users')}>
          Back
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Name</div>
              <div className="font-medium">{user?.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Email</div>
              <div className="font-medium">{user?.email}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Mobile</div>
              <div className="font-medium">{user?.mobile}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Preparing For</div>
              <div className="font-medium">{user?.preparingForExam || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div>
                <span className={`px-2 py-1 rounded text-xs ${
                  user?.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {user?.isBlocked ? 'Blocked' : 'Active'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant={user?.isBlocked ? 'default' : 'destructive'}
              onClick={() => blockMutation.mutate(!user?.isBlocked)}
            >
              {user?.isBlocked ? 'Unblock User' : 'Block User'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="attempts">Attempts</TabsTrigger>
        </TabsList>
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions?.map((sub: any) => (
                    <TableRow key={sub._id}>
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
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="attempts">
          <Card>
            <CardHeader>
              <CardTitle>Test Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Set</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts?.map((attempt: any) => (
                    <TableRow key={attempt._id}>
                      <TableCell>{attempt.testSetId?.name}</TableCell>
                      <TableCell>{attempt.totalScore} / {attempt.testSetId?.totalMarks}</TableCell>
                      <TableCell>{attempt.status}</TableCell>
                      <TableCell>{new Date(attempt.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

