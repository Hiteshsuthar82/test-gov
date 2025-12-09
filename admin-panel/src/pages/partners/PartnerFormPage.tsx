import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Button } from '../../components/ui/button'
import { Loader } from '../../components/ui/loader'

export default function PartnerFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    mobile: '',
    code: '',
    discountPercentage: 0,
    isActive: true,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['partner', id],
    queryFn: async () => {
      const response = await api.get(`/admin/partners/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        businessName: data.businessName || '',
        mobile: data.mobile || '',
        code: data.code || '',
        discountPercentage: data.discountPercentage || 0,
        isActive: data.isActive ?? true,
      })
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (id) {
        return api.patch(`/admin/partners/${id}`, data)
      } else {
        return api.post('/admin/partners', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      navigate('/partners')
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  if (isLoading && id) {
    return <Loader fullScreen />
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{id ? 'Edit Partner' : 'Create New Partner'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="code">Invitation Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="uppercase"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  This code will be used by users during registration
                </p>
              </div>

              <div>
                <Label htmlFor="discountPercentage">Discount Percentage *</Label>
                <Input
                  id="discountPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.discountPercentage}
                  onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) || 0 })}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Discount percentage (0-100) that will be applied to all purchases
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active (inactive partners cannot be used for new registrations)
                </Label>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/partners')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Saving...' : id ? 'Update Partner' : 'Create Partner'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

