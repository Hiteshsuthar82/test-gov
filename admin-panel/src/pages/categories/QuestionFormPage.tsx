import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { ImageUpload } from '../../components/ui/image-upload'

interface Option {
  optionId: string
  text: string
  imageUrl?: string
}

interface OptionWithFile extends Option {
  imageFile?: File | null
  imageUrlInput?: string
}

export default function QuestionFormPage() {
  const { id, setId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null)
  const [questionImageUrl, setQuestionImageUrl] = useState<string>('')
  const [explanationImages, setExplanationImages] = useState<Array<{ file: File | null; url: string; id: string }>>([])
  const [formData, setFormData] = useState({
    sectionId: '',
    questionText: '',
    questionImageUrl: '',
    options: [] as OptionWithFile[],
    correctOptionId: '',
    marks: 1,
    explanationText: '',
    explanationImageUrls: [] as string[],
    questionOrder: 1,
    isActive: true,
  })

  const { data: questionData } = useQuery({
    queryKey: ['question', id],
    queryFn: async () => {
      const response = await api.get(`/admin/questions/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })

  const { data: setData } = useQuery({
    queryKey: ['set', setId || (questionData?.testSetId ? (typeof questionData.testSetId === 'object' ? questionData.testSetId._id : questionData.testSetId) : null)],
    queryFn: async () => {
      // Handle testSetId - it might be an object (populated) or string
      let setIdToUse = setId
      if (!setIdToUse && questionData?.testSetId) {
        if (typeof questionData.testSetId === 'object' && questionData.testSetId._id) {
          setIdToUse = questionData.testSetId._id.toString()
        } else {
          setIdToUse = questionData.testSetId.toString()
        }
      }
      if (!setIdToUse) return null
      const response = await api.get(`/admin/sets/${setIdToUse}`)
      return response.data.data
    },
    enabled: !!(setId || questionData?.testSetId),
  })

  useEffect(() => {
    if (questionData) {
      // Handle backward compatibility: if explanationImageUrl exists, convert to array
      const explanationUrls = questionData.explanationImageUrls || 
        (questionData.explanationImageUrl ? [questionData.explanationImageUrl] : [])
      
      setFormData({
        sectionId: questionData.sectionId || '',
        questionText: questionData.questionText || '',
        questionImageUrl: questionData.questionImageUrl || '',
        options: questionData.options || [],
        correctOptionId: questionData.correctOptionId || '',
        marks: questionData.marks || 1,
        explanationText: questionData.explanationText || '',
        explanationImageUrls: explanationUrls,
        questionOrder: questionData.questionOrder || 1,
        isActive: questionData.isActive ?? true,
      })
      
      // Initialize explanation images state
      setExplanationImages(explanationUrls.map((url, index) => ({
        file: null,
        url: url,
        id: `existing-${index}`
      })))
    } else if (setData?.sections && setData.sections.length > 0 && !id) {
      // Only set default section for new questions
      setFormData((prev) => ({
        ...prev,
        sectionId: prev.sectionId || setData.sections[0].sectionId,
        options: prev.options.length > 0 ? prev.options : [
          { optionId: 'A', text: '' },
          { optionId: 'B', text: '' },
          { optionId: 'C', text: '' },
          { optionId: 'D', text: '' },
        ],
      }))
    }
  }, [questionData, setData, id])

  const mutation = useMutation({
    mutationFn: async (formDataToSend: FormData) => {
      // Extract setId properly - handle both string and object (populated)
      let setIdToUse = setId
      if (!setIdToUse && questionData?.testSetId) {
        if (typeof questionData.testSetId === 'object' && questionData.testSetId._id) {
          setIdToUse = questionData.testSetId._id.toString()
        } else {
          setIdToUse = questionData.testSetId.toString()
        }
      }
      
      if (id) {
        return api.put(`/admin/questions/${id}`, formDataToSend)
      } else {
        if (!setIdToUse) {
          throw new Error('Test Set ID is required')
        }
        return api.post(`/admin/questions/sets/${setIdToUse}/questions`, formDataToSend)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      
      // Extract setId for navigation
      let setIdForNav = setId
      if (!setIdForNav && questionData?.testSetId) {
        if (typeof questionData.testSetId === 'object' && questionData.testSetId._id) {
          setIdForNav = questionData.testSetId._id.toString()
        } else {
          setIdForNav = questionData.testSetId.toString()
        }
      }
      
      if (setIdForNav) {
        navigate(`/sets/${setIdForNav}/questions`)
      } else {
        navigate('/categories')
      }
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const formDataToSend = new FormData()
    formDataToSend.append('sectionId', formData.sectionId)
    formDataToSend.append('questionText', formData.questionText)
    formDataToSend.append('correctOptionId', formData.correctOptionId)
    formDataToSend.append('marks', formData.marks.toString())
    formDataToSend.append('explanationText', formData.explanationText || '')
    formDataToSend.append('questionOrder', formData.questionOrder.toString())
    formDataToSend.append('isActive', formData.isActive.toString())
    
    // Question image
    if (questionImageFile) {
      formDataToSend.append('questionImage', questionImageFile)
    } else if (questionImageUrl) {
      formDataToSend.append('questionImageUrl', questionImageUrl)
    } else if (formData.questionImageUrl && !questionImageFile && !questionImageUrl) {
      formDataToSend.append('questionImageUrl', formData.questionImageUrl)
    }
    
    // Explanation images (multiple)
    const explanationImageUrls: string[] = []
    let fileIndex = 0
    
    explanationImages.forEach((img) => {
      if (img.file) {
        // Append file with indexed field name
        formDataToSend.append(`explanationImage_${fileIndex}`, img.file)
        fileIndex++
      } else if (img.url && img.url.trim()) {
        // Collect URLs to send as JSON array
        explanationImageUrls.push(img.url)
      }
    })
    
    // Send explanation image URLs as JSON array
    // Backend will process files first, then add URLs to the array
    if (explanationImageUrls.length > 0) {
      formDataToSend.append('explanationImageUrls', JSON.stringify(explanationImageUrls))
    } else if (id && explanationImages.length === 0 && formData.explanationImageUrls.length > 0) {
      // Update mode: keep existing images if no changes and no new images provided
      formDataToSend.append('explanationImageUrls', JSON.stringify(formData.explanationImageUrls))
    } else if (id && explanationImages.length === 0 && fileIndex === 0) {
      // Update mode: explicitly clear if empty (no files, no URLs, no existing)
      formDataToSend.append('explanationImageUrls', JSON.stringify([]))
    }
    // If we have files but no URLs, backend will handle files and create URLs from them
    
    // Options
    const optionsData = formData.options.map((opt, index) => {
      const optionData: any = {
        optionId: opt.optionId,
        text: opt.text,
      }
      
      // Handle option images
      if (opt.imageFile) {
        // File will be sent separately
      } else if (opt.imageUrlInput) {
        optionData.imageUrl = opt.imageUrlInput
      } else if (opt.imageUrl && !opt.imageFile && !opt.imageUrlInput) {
        optionData.imageUrl = opt.imageUrl
      }
      
      return optionData
    })
    
    formDataToSend.append('options', JSON.stringify(optionsData))
    
    // Append option image files
    formData.options.forEach((opt, index) => {
      if (opt.imageFile) {
        formDataToSend.append(`optionImage_${index}`, opt.imageFile)
      }
    })

    mutation.mutate(formDataToSend)
  }

  const updateOption = (index: number, field: keyof OptionWithFile, value: string | File | null) => {
    const options = [...formData.options]
    if (field === 'imageFile' || field === 'imageUrlInput') {
      options[index] = { ...options[index], [field]: value }
    } else {
      options[index] = { ...options[index], [field]: value as string }
    }
    setFormData({ ...formData, options })
  }

  const addExplanationImage = () => {
    setExplanationImages([...explanationImages, { file: null, url: '', id: `new-${Date.now()}` }])
  }

  const removeExplanationImage = (id: string) => {
    setExplanationImages(explanationImages.filter(img => img.id !== id))
  }

  const updateExplanationImage = (id: string, file: File | null, url: string) => {
    setExplanationImages(explanationImages.map(img => 
      img.id === id ? { ...img, file, url } : img
    ))
  }

  const addOption = () => {
    const newOption: Option = {
      optionId: String.fromCharCode(65 + formData.options.length),
      text: '',
    }
    setFormData({ ...formData, options: [...formData.options, newOption] })
  }

  const removeOption = (index: number) => {
    const options = formData.options.filter((_, i) => i !== index)
    setFormData({ ...formData, options })
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">{id ? 'Edit' : 'Create'} Question</h1>
      <Card>
        <CardHeader>
          <CardTitle>Question Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sectionId">Section *</Label>
                <Select
                  id="sectionId"
                  value={formData.sectionId}
                  onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                  required
                >
                  <option value="">Select Section</option>
                  {setData?.sections?.map((section: any) => (
                    <option key={section.sectionId} value={section.sectionId}>
                      {section.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="questionOrder">Question Order *</Label>
                <Input
                  id="questionOrder"
                  type="number"
                  value={formData.questionOrder}
                  onChange={(e) => setFormData({ ...formData, questionOrder: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="questionText">Question Text *</Label>
              <Textarea
                id="questionText"
                value={formData.questionText}
                onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                required
                rows={4}
              />
            </div>

            <div>
              <ImageUpload
                value={formData.questionImageUrl}
                onChange={(file, url) => {
                  if (file) {
                    setQuestionImageFile(file)
                    setQuestionImageUrl('')
                  } else if (url) {
                    setQuestionImageUrl(url)
                    setQuestionImageFile(null)
                  } else {
                    setQuestionImageFile(null)
                    setQuestionImageUrl('')
                    setFormData({ ...formData, questionImageUrl: '' })
                  }
                }}
                label="Question Image"
                folder="questions"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Options *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  Add Option
                </Button>
              </div>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex gap-2 items-center border p-2 rounded">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={formData.correctOptionId === option.optionId}
                      onChange={() => setFormData({ ...formData, correctOptionId: option.optionId })}
                      className="w-4 h-4"
                    />
                    <span className="font-medium w-8">{option.optionId}</span>
                    <Input
                      placeholder="Option text"
                      value={option.text}
                      onChange={(e) => updateOption(index, 'text', e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex-1">
                      <ImageUpload
                        value={option.imageUrl || ''}
                        onChange={(file, url) => {
                          if (file) {
                            updateOption(index, 'imageFile', file)
                            updateOption(index, 'imageUrlInput', '')
                          } else if (url) {
                            updateOption(index, 'imageUrlInput', url)
                            updateOption(index, 'imageFile', null)
                          } else {
                            updateOption(index, 'imageFile', null)
                            updateOption(index, 'imageUrlInput', '')
                            updateOption(index, 'imageUrl', '')
                          }
                        }}
                        label=""
                        folder="questions/options"
                        className="mb-0"
                      />
                    </div>
                    {formData.options.length > 2 && (
                      <Button type="button" variant="destructive" size="sm" onClick={() => removeOption(index)}>
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="marks">Marks</Label>
                <Input
                  id="marks"
                  type="number"
                  value={formData.marks}
                  onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="explanationText">Explanation Text</Label>
              <Textarea
                id="explanationText"
                value={formData.explanationText}
                onChange={(e) => setFormData({ ...formData, explanationText: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Explanation Images</Label>
                <Button type="button" variant="outline" size="sm" onClick={addExplanationImage}>
                  Add Image
                </Button>
              </div>
              <div className="space-y-4">
                {explanationImages.map((img, index) => (
                  <div key={img.id} className="border p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <Label>Explanation Image {index + 1}</Label>
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => removeExplanationImage(img.id)}
                      >
                        Remove
                      </Button>
                    </div>
                    <ImageUpload
                      value={img.url}
                      onChange={(file, url) => {
                        updateExplanationImage(img.id, file, url || '')
                      }}
                      label=""
                      folder="questions"
                    />
                  </div>
                ))}
                {explanationImages.length === 0 && (
                  <div className="text-sm text-gray-500">
                    No explanation images added. Click "Add Image" to add one.
                  </div>
                )}
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

