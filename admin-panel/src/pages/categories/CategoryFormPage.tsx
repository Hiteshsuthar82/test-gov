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

interface TimePeriod {
  months: number
  price: number
  originalPrice: number
}

interface Subsection {
  subsectionId: string
  name: string
  order: number
}

interface Section {
  sectionId: string
  name: string
  order: number
  subsections: Subsection[]
}

export default function CategoryFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null)
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    descriptionFormatted: '',
    bannerImageUrl: '',
    price: 0,
    originalPrice: 0,
    timePeriods: [] as TimePeriod[],
    details: '',
    detailsFormatted: '',
    isActive: true,
    sections: [] as Section[],
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
        descriptionFormatted: data.descriptionFormatted || data.description || '',
        bannerImageUrl: data.bannerImageUrl || '',
        price: data.price || 0,
        originalPrice: data.originalPrice || 0,
        timePeriods: data.timePeriods || [],
        details: data.details || '',
        detailsFormatted: data.detailsFormatted || data.details || '',
        isActive: data.isActive ?? true,
        sections: data.sections || [],
      })
      if (data.bannerImageUrl) {
        setBannerImageUrl(data.bannerImageUrl)
      }
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
    
    // Validate sections: if there's one section, at least one subsection is required
    if (formData.sections.length > 0) {
      for (const section of formData.sections) {
        if (!section.subsections || section.subsections.length === 0) {
          alert(`Section "${section.name}" must have at least one subsection`)
          return
        }
      }
    }
    
    const formDataToSend = new FormData()
    formDataToSend.append('name', formData.name)
    formDataToSend.append('description', formData.description || '')
    formDataToSend.append('descriptionFormatted', formData.descriptionFormatted || '')
    formDataToSend.append('price', formData.price.toString())
    formDataToSend.append('originalPrice', formData.originalPrice.toString())
    formDataToSend.append('timePeriods', JSON.stringify(formData.timePeriods))
    formDataToSend.append('details', formData.details || '')
    formDataToSend.append('detailsFormatted', formData.detailsFormatted || '')
    formDataToSend.append('isActive', formData.isActive.toString())
    formDataToSend.append('sections', JSON.stringify(formData.sections))
    
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

  const addSection = () => {
    const newSection: Section = {
      sectionId: `section-${Date.now()}`,
      name: '',
      order: formData.sections.length + 1,
      subsections: [],
    }
    setFormData({ ...formData, sections: [...formData.sections, newSection] })
  }

  const updateSection = (index: number, field: keyof Section, value: string | number | Subsection[]) => {
    const sections = [...formData.sections]
    sections[index] = { ...sections[index], [field]: value }
    setFormData({ ...formData, sections })
  }

  const removeSection = (index: number) => {
    const sections = formData.sections.filter((_, i) => i !== index)
    setFormData({ ...formData, sections })
  }

  const addSubsection = (sectionIndex: number) => {
    const sections = [...formData.sections]
    const section = sections[sectionIndex]
    const newSubsection: Subsection = {
      subsectionId: `subsection-${Date.now()}`,
      name: '',
      order: section.subsections.length + 1,
    }
    section.subsections = [...section.subsections, newSubsection]
    setFormData({ ...formData, sections })
  }

  const updateSubsection = (sectionIndex: number, subsectionIndex: number, field: keyof Subsection, value: string | number) => {
    const sections = [...formData.sections]
    const section = sections[sectionIndex]
    section.subsections[subsectionIndex] = { ...section.subsections[subsectionIndex], [field]: value }
    setFormData({ ...formData, sections })
  }

  const removeSubsection = (sectionIndex: number, subsectionIndex: number) => {
    const sections = [...formData.sections]
    sections[sectionIndex].subsections = sections[sectionIndex].subsections.filter((_, i) => i !== subsectionIndex)
    setFormData({ ...formData, sections })
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
              <RichTextEditor
                value={formData.descriptionFormatted || formData.description || ''}
                onChange={(plainText, formattedText) => {
                  setFormData({
                    ...formData,
                    description: plainText,
                    descriptionFormatted: formattedText,
                  })
                }}
                label="Description"
                placeholder="Enter category description with formatting..."
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
              <Label htmlFor="price">Base Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                required
                min="0"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Base price for backward compatibility. Use Time Periods for dynamic pricing.</p>
            </div>
            <div>
              <Label htmlFor="originalPrice">Original Price (₹)</Label>
              <Input
                id="originalPrice"
                type="number"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Original price for showing discounts (optional)</p>
            </div>
            
            {/* Time Periods Section */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <Label className="text-base font-semibold">Dynamic Pricing (Time Periods)</Label>
                  <p className="text-xs text-gray-500">Add multiple subscription durations with different prices</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      timePeriods: [
                        ...formData.timePeriods,
                        { months: 1, price: 0, originalPrice: 0 }
                      ]
                    })
                  }}
                >
                  Add Time Period
                </Button>
              </div>
              
              {formData.timePeriods.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed">
                  <p className="text-sm text-gray-500">No time periods added. Category will use base price.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.timePeriods.map((period, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Duration (Months)</Label>
                          <Input
                            type="number"
                            value={period.months}
                            onChange={(e) => {
                              const newTimePeriods = [...formData.timePeriods]
                              newTimePeriods[index].months = parseInt(e.target.value) || 1
                              setFormData({ ...formData, timePeriods: newTimePeriods })
                            }}
                            min="1"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Price (₹)</Label>
                          <Input
                            type="number"
                            value={period.price}
                            onChange={(e) => {
                              const newTimePeriods = [...formData.timePeriods]
                              newTimePeriods[index].price = parseFloat(e.target.value) || 0
                              setFormData({ ...formData, timePeriods: newTimePeriods })
                            }}
                            min="0"
                            step="0.01"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Original Price (₹)</Label>
                          <Input
                            type="number"
                            value={period.originalPrice}
                            onChange={(e) => {
                              const newTimePeriods = [...formData.timePeriods]
                              newTimePeriods[index].originalPrice = parseFloat(e.target.value) || 0
                              setFormData({ ...formData, timePeriods: newTimePeriods })
                            }}
                            min="0"
                            step="0.01"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const newTimePeriods = formData.timePeriods.filter((_, i) => i !== index)
                          setFormData({ ...formData, timePeriods: newTimePeriods })
                        }}
                        className="mt-5"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Sections & Subsections</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSection}>
                  Add Section
                </Button>
              </div>
              <div className="space-y-4 border rounded-lg p-4">
                {formData.sections.map((section, sectionIndex) => (
                  <div key={section.sectionId} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex gap-2 items-center mb-3">
                      <Input
                        placeholder="Section Name"
                        value={section.name}
                        onChange={(e) => updateSection(sectionIndex, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Order"
                        value={section.order}
                        onChange={(e) => updateSection(sectionIndex, 'order', parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <Button type="button" variant="destructive" size="sm" onClick={() => removeSection(sectionIndex)}>
                        Remove Section
                      </Button>
                    </div>
                    <div className="ml-4 space-y-2">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-sm">Subsections</Label>
                        <Button type="button" variant="outline" size="sm" onClick={() => addSubsection(sectionIndex)}>
                          Add Subsection
                        </Button>
                      </div>
                      {section.subsections.map((subsection, subsectionIndex) => (
                        <div key={subsection.subsectionId} className="flex gap-2 items-center">
                          <Input
                            placeholder="Subsection Name"
                            value={subsection.name}
                            onChange={(e) => updateSubsection(sectionIndex, subsectionIndex, 'name', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Order"
                            value={subsection.order}
                            onChange={(e) => updateSubsection(sectionIndex, subsectionIndex, 'order', parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                          <Button type="button" variant="destructive" size="sm" onClick={() => removeSubsection(sectionIndex, subsectionIndex)}>
                            Remove
                          </Button>
                        </div>
                      ))}
                      {section.subsections.length === 0 && (
                        <p className="text-sm text-red-500">At least one subsection is required</p>
                      )}
                    </div>
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

