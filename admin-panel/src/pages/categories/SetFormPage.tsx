import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'

interface Section {
  sectionId: string
  name: string
  order: number
}

export default function SetFormPage() {
  const { id, categoryId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMinutes: 60,
    totalMarks: 100,
    negativeMarking: 0.25,
    isActive: true,
    sections: [] as Section[],
  })
  const [resolvedCategoryId, setResolvedCategoryId] = useState<string | null>(categoryId || null)

  const { data } = useQuery({
    queryKey: ['set', id],
    queryFn: async () => {
      const response = await api.get(`/admin/sets/${id}`)
      const setData = response.data.data
      // Extract categoryId from populated object
      if (setData?.categoryIdString) {
        setResolvedCategoryId(setData.categoryIdString)
      } else if (setData?.categoryId) {
        let catId: string
        if (typeof setData.categoryId === 'object' && setData.categoryId._id) {
          catId = setData.categoryId._id.toString()
        } else if (typeof setData.categoryId === 'string') {
          catId = setData.categoryId
        } else {
          catId = String(setData.categoryId)
        }
        setResolvedCategoryId(catId)
      }
      return setData
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        description: data.description || '',
        durationMinutes: data.durationMinutes || 60,
        totalMarks: data.totalMarks || 100,
        negativeMarking: data.negativeMarking || 0.25,
        isActive: data.isActive ?? true,
        sections: data.sections || [],
      })
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (id) {
        return api.put(`/admin/sets/${id}`, data)
      } else {
        return api.post(`/admin/sets/categories/${categoryId}/sets`, data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sets'] })
      queryClient.invalidateQueries({ queryKey: ['sets', categoryId || resolvedCategoryId] })
      
      // Use resolved categoryId (from params or from data)
      const finalCategoryId = categoryId || resolvedCategoryId
      
      if (finalCategoryId) {
        navigate(`/categories/${finalCategoryId}/sets`)
      } else {
        navigate('/categories')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  const addSection = () => {
    const newSection: Section = {
      sectionId: `section-${Date.now()}`,
      name: '',
      order: formData.sections.length + 1,
    }
    setFormData({ ...formData, sections: [...formData.sections, newSection] })
  }

  const updateSection = (index: number, field: keyof Section, value: string | number) => {
    const sections = [...formData.sections]
    sections[index] = { ...sections[index], [field]: value }
    setFormData({ ...formData, sections })
  }

  const removeSection = (index: number) => {
    const sections = formData.sections.filter((_, i) => i !== index)
    setFormData({ ...formData, sections })
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{id ? 'Edit' : 'Create'} Test Set</h1>
      <Card>
        <CardHeader>
          <CardTitle>Test Set Details</CardTitle>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="durationMinutes">Duration (minutes) *</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="totalMarks">Total Marks *</Label>
                <Input
                  id="totalMarks"
                  type="number"
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="negativeMarking">Negative Marking *</Label>
                <Input
                  id="negativeMarking"
                  type="number"
                  step="0.01"
                  value={formData.negativeMarking}
                  onChange={(e) => setFormData({ ...formData, negativeMarking: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Sections</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSection}>
                  Add Section
                </Button>
              </div>
              <div className="space-y-2">
                {formData.sections.map((section, index) => (
                  <div key={section.sectionId} className="flex gap-2 items-center border p-2 rounded">
                    <Input
                      placeholder="Section Name"
                      value={section.name}
                      onChange={(e) => updateSection(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Order"
                      value={section.order}
                      onChange={(e) => updateSection(index, 'order', parseInt(e.target.value))}
                      className="w-20"
                    />
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeSection(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
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
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

