import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'

export default function SendNotificationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'general' as 'general' | 'category' | 'testSet' | 'notice' | 'payment_approved',
    target: 'ALL' as 'ALL' | 'CATEGORY_USERS' | 'USER',
    categoryId: '',
    testSetId: '',
    userId: '',
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/admin/categories')
      return response.data.data.categories
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/admin/notifications/send', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      navigate('/notifications')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {
      title: formData.title,
      message: formData.message,
      type: formData.type,
      target: formData.target,
    }
    if (formData.target === 'CATEGORY_USERS' || formData.type === 'category') {
      payload.categoryId = formData.categoryId
    }
    if (formData.type === 'testSet') {
      payload.testSetId = formData.testSetId
    }
    if (formData.target === 'USER') {
      payload.userId = formData.userId
    }
    mutation.mutate(payload)
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Send Notification</h1>
      <Card>
        <CardHeader>
          <CardTitle>Notification Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  required
                >
                  <option value="general">General</option>
                  <option value="category">Category</option>
                  <option value="testSet">Test Set</option>
                  <option value="notice">Notice</option>
                  <option value="payment_approved">Payment Approved</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="target">Target *</Label>
                <Select
                  id="target"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value as any })}
                  required
                >
                  <option value="ALL">All Users</option>
                  <option value="CATEGORY_USERS">Category Users</option>
                  <option value="USER">Single User</option>
                </Select>
              </div>
            </div>
            {(formData.target === 'CATEGORY_USERS' || formData.type === 'category') && (
              <div>
                <Label htmlFor="categoryId">Category *</Label>
                <Select
                  id="categoryId"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                >
                  <option value="">Select Category</option>
                  {categories?.map((cat: any) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {formData.type === 'testSet' && (
              <div>
                <Label htmlFor="testSetId">Test Set ID</Label>
                <Input
                  id="testSetId"
                  value={formData.testSetId}
                  onChange={(e) => setFormData({ ...formData, testSetId: e.target.value })}
                />
              </div>
            )}
            {formData.target === 'USER' && (
              <div>
                <Label htmlFor="userId">User ID *</Label>
                <Input
                  id="userId"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  required
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Sending...' : 'Send Notification'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/notifications')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

