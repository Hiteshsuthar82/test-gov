import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'
import { ImageUpload } from '../../components/ui/image-upload'
import { RichTextEditor } from '../../components/ui/rich-text-editor'

export default function CategoryFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null)
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bannerImageUrl: '',
    price: 0,
    details: '',
    detailsFormatted: '',
    isActive: true,
  })

  const { data } = useQuery({
    queryKey: ['category', id],
    queryFn: async () => {
      const response = await api.get(`/admin/categories/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        description: data.description || '',
        bannerImageUrl: data.bannerImageUrl || '',
        price: data.price || 0,
        details: data.details || '',
        detailsFormatted: data.detailsFormatted || data.details || '',
        isActive: data.isActive ?? true,
      })
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: async (formDataToSend: FormData) => {
      if (id) {
        return api.put(`/admin/categories/${id}`, formDataToSend)
      } else {
        return api.post('/admin/categories', formDataToSend)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      navigate('/categories')
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const formDataToSend = new FormData()
    formDataToSend.append('name', formData.name)
    formDataToSend.append('description', formData.description || '')
    formDataToSend.append('price', formData.price.toString())
    formDataToSend.append('details', formData.details || '')
    formDataToSend.append('detailsFormatted', formData.detailsFormatted || '')
    formDataToSend.append('isActive', formData.isActive.toString())
    
    // Priority: new file > new URL > existing URL (only if no new file/URL)
    // IMPORTANT: When a new file is selected, do NOT send bannerImageUrl to avoid conflicts
    if (bannerImageFile) {
      // New file selected - this will replace the old image
      // Only send the file, do NOT send any bannerImageUrl
      formDataToSend.append('bannerImage', bannerImageFile)
      console.log('Sending new file for upload:', bannerImageFile.name)
    } else if (bannerImageUrl) {
      // New URL provided - backend will fetch and upload
      formDataToSend.append('bannerImageUrl', bannerImageUrl)
      console.log('Sending new URL for upload:', bannerImageUrl)
    } else if (id && formData.bannerImageUrl) {
      // Update mode: keep existing image if no new file/URL provided
      formDataToSend.append('bannerImageUrl', formData.bannerImageUrl)
      console.log('Keeping existing image:', formData.bannerImageUrl)
    }
    // For create mode without image, bannerImageUrl can be optional

    mutation.mutate(formDataToSend)
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">{id ? 'Edit' : 'Create'} Category</h1>
      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <ImageUpload
                value={formData.bannerImageUrl}
                onChange={(file, url) => {
                  if (file) {
                    setBannerImageFile(file)
                    setBannerImageUrl('')
                  } else if (url) {
                    setBannerImageUrl(url)
                    setBannerImageFile(null)
                  } else {
                    setBannerImageFile(null)
                    setBannerImageUrl('')
                    setFormData({ ...formData, bannerImageUrl: '' })
                  }
                }}
                label="Banner Image"
                folder="categories"
              />
            </div>
            <div>
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <RichTextEditor
                value={formData.detailsFormatted || formData.details || ''}
                onChange={(plainText, formattedText) => {
                  setFormData({
                    ...formData,
                    details: plainText,
                    detailsFormatted: formattedText,
                  })
                }}
                label="Details"
                placeholder="Enter category details with formatting..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/categories')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

