import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { useState } from 'react'

export default function PaymentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [comment, setComment] = useState('')

  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment', id],
    queryFn: async () => {
      const response = await api.get(`/admin/payments/${id}`)
      return response.data.data
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (data: { adminComment?: string }) => {
      await api.patch(`/admin/payments/${id}/approve`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', id] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setApproveDialogOpen(false)
      setComment('')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (data: { adminComment: string }) => {
      await api.patch(`/admin/payments/${id}/reject`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', id] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setRejectDialogOpen(false)
      setComment('')
    },
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payment Details</h1>
        <Button variant="outline" onClick={() => navigate('/payments')}>
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">User</div>
              <div className="font-medium">{payment?.userId?.name}</div>
              <div className="text-sm text-gray-500">{payment?.userId?.email}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Category</div>
              <div className="font-medium">{payment?.categoryId?.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Amount</div>
              <div className="font-medium text-lg">₹{payment?.amount}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Payer Name</div>
              <div className="font-medium">{payment?.payerName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">UPI ID</div>
              <div className="font-medium">{payment?.payerUpiId}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div>
                <span className={`px-2 py-1 rounded text-xs ${
                  payment?.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                  payment?.status === 'PENDING_REVIEW' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {payment?.status}
                </span>
              </div>
            </div>
            {payment?.adminComment && (
              <div>
                <div className="text-sm text-gray-500">Admin Comment</div>
                <div className="font-medium">{payment.adminComment}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Screenshot</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={payment?.screenshotUrl}
              alt="Payment screenshot"
              className="w-full rounded-lg border cursor-pointer"
              onClick={() => window.open(payment?.screenshotUrl, '_blank')}
            />
          </CardContent>
        </Card>
      </div>

      {payment?.status === 'PENDING_REVIEW' && (
        <div className="mt-6 flex gap-4">
          <Button onClick={() => setApproveDialogOpen(true)}>Approve Payment</Button>
          <Button variant="destructive" onClick={() => setRejectDialogOpen(true)}>Reject Payment</Button>
        </div>
      )}

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approve-comment">Comment (Optional)</Label>
              <Textarea
                id="approve-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => approveMutation.mutate({ adminComment: comment || undefined })}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-comment">Comment *</Label>
              <Textarea
                id="reject-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate({ adminComment: comment })}
              disabled={!comment.trim()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

