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

export default function BannerFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    isActive: true,
    sortOrder: 0,
  })

  const { data } = useQuery({
    queryKey: ['banner', id],
    queryFn: async () => {
      const response = await api.get(`/admin/banners`)
      return response.data.data.find((b: any) => b._id === id)
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (data) {
      setFormData({
        title: data.title || '',
        description: data.description || '',
        imageUrl: data.imageUrl || '',
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder || 0,
      })
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: async (formDataToSend: FormData) => {
      if (id) {
        return api.put(`/admin/banners/${id}`, formDataToSend)
      } else {
        return api.post('/admin/banners', formDataToSend)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
      navigate('/banners')
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const formDataToSend = new FormData()
    formDataToSend.append('title', formData.title)
    formDataToSend.append('description', formData.description)
    formDataToSend.append('isActive', formData.isActive.toString())
    formDataToSend.append('sortOrder', formData.sortOrder.toString())
    
    // Priority: new file > new URL > existing URL (only if no new file/URL)
    // IMPORTANT: When a new file is selected, do NOT send imageUrl to avoid conflicts
    if (imageFile) {
      // New file selected - this will replace the old image
      // Only send the file, do NOT send any imageUrl
      formDataToSend.append('image', imageFile)
      console.log('Sending new file for upload:', imageFile.name)
    } else if (imageUrl) {
      // New URL provided - backend will fetch and upload
      formDataToSend.append('imageUrl', imageUrl)
      console.log('Sending new URL for upload:', imageUrl)
    } else if (id && formData.imageUrl) {
      // Update mode: keep existing image if no new file/URL provided
      formDataToSend.append('imageUrl', formData.imageUrl)
      console.log('Keeping existing image:', formData.imageUrl)
    } else if (!id) {
      // Create mode without image - backend will return error
      console.log('No image provided for new banner')
    }

    mutation.mutate(formDataToSend)
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">{id ? 'Edit' : 'Create'} Banner</h1>
      <Card>
        <CardHeader>
          <CardTitle>Banner Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(file, url) => {
                  if (file) {
                    setImageFile(file)
                    setImageUrl('')
                  } else if (url) {
                    setImageUrl(url)
                    setImageFile(null)
                  } else {
                    setImageFile(null)
                    setImageUrl('')
                    setFormData({ ...formData, imageUrl: '' })
                  }
                }}
                label="Banner Image"
                required
                folder="banners"
              />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/banners')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

