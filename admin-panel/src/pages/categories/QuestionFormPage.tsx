import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { api } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { ImageUpload } from '../../components/ui/image-upload'
import { RichTextEditor } from '../../components/ui/rich-text-editor'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { AlertTriangle } from 'lucide-react'

interface Option {
  optionId: string
  text: string
  imageUrl?: string
}

interface OptionWithFile extends Option {
  imageFile?: File | null
  imageUrlInput?: string
  [key: string]: any // Allow additional fields for form handling
}

interface ExplanationImage {
  file: File | null
  url: string
  id: string
}

interface QuestionFormData {
  sectionId: string
  direction: string
  directionImageUrl: string
  questionText: string
  questionFormattedText: string
  questionImageUrl: string
  conclusion: string
  conclusionImageUrl: string
  options: OptionWithFile[]
  correctOptionId: string
  marks: number
  explanationText: string
  explanationFormattedText: string
  explanationImageUrls: string[]
  questionOrder: number
  isActive: boolean
}

export default function QuestionFormPage() {
  const { id, setId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // Image file states (not part of form data)
  const [directionImageFile, setDirectionImageFile] = useState<File | null>(null)
  const [directionImageUrl, setDirectionImageUrl] = useState<string>('')
  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null)
  const [questionImageUrl, setQuestionImageUrl] = useState<string>('')
  const [conclusionImageFile, setConclusionImageFile] = useState<File | null>(null)
  const [conclusionImageUrl, setConclusionImageUrl] = useState<string>('')
  const [explanationImages, setExplanationImages] = useState<ExplanationImage[]>([])
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  
  // Initialize form with default values
  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<QuestionFormData>({
    defaultValues: {
      sectionId: '',
      direction: '',
      directionImageUrl: '',
      questionText: '',
      questionFormattedText: '',
      questionImageUrl: '',
      conclusion: '',
      conclusionImageUrl: '',
      options: [],
      correctOptionId: '',
      marks: 1,
      explanationText: '',
      explanationFormattedText: '',
      explanationImageUrls: [],
      questionOrder: 1,
      isActive: true,
    },
  })

  // Use field arrays for dynamic fields
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: 'options',
  })

  // Fetch question data for edit mode
  const { data: questionData } = useQuery({
    queryKey: ['question', id],
    queryFn: async () => {
      const response = await api.get(`/admin/questions/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })

  // Extract setId from questionData if not in params
  const resolvedSetId = setId || (questionData?.testSetId 
    ? (typeof questionData.testSetId === 'object' && questionData.testSetId._id 
        ? questionData.testSetId._id.toString() 
        : questionData.testSetId.toString())
    : null)

  // Fetch set data to get sections
  const { data: setData } = useQuery({
    queryKey: ['set', resolvedSetId],
    queryFn: async () => {
      if (!resolvedSetId) return null
      const response = await api.get(`/admin/sets/${resolvedSetId}`)
      return response.data.data
    },
    enabled: !!resolvedSetId,
  })

  // Watch form values
  const watchedOptions = watch('options')
  const watchedCorrectOptionId = watch('correctOptionId')

  // Initialize form data when question data is loaded (edit mode)
  useEffect(() => {
    if (questionData) {
      // Handle backward compatibility: if explanationImageUrl exists, convert to array
      const explanationUrls = questionData.explanationImageUrls || 
        (questionData.explanationImageUrl ? [questionData.explanationImageUrl] : [])
      
      // Reset form with question data
      reset({
        sectionId: questionData.sectionId || '',
        direction: questionData.direction || '',
        directionImageUrl: questionData.directionImageUrl || '',
        questionText: questionData.questionText || '',
        // Use questionFormattedText if it exists (even if empty), otherwise fall back to questionText
        questionFormattedText: questionData.questionFormattedText !== undefined && questionData.questionFormattedText !== null
          ? questionData.questionFormattedText
          : (questionData.questionText || ''),
        questionImageUrl: questionData.questionImageUrl || '',
        conclusion: questionData.conclusion || '',
        conclusionImageUrl: questionData.conclusionImageUrl || '',
        options: questionData.options || [],
        correctOptionId: questionData.correctOptionId || '',
        marks: questionData.marks || 1,
        explanationText: questionData.explanationText || '',
        // Use explanationFormattedText if it exists (even if empty), otherwise fall back to explanationText
        explanationFormattedText: questionData.explanationFormattedText !== undefined && questionData.explanationFormattedText !== null
          ? questionData.explanationFormattedText
          : (questionData.explanationText || ''),
        explanationImageUrls: explanationUrls,
        questionOrder: questionData.questionOrder || 1,
        isActive: questionData.isActive ?? true,
      })
      
      // Set image URL states for display
      setDirectionImageUrl(questionData.directionImageUrl || '')
      setQuestionImageUrl(questionData.questionImageUrl || '')
      setConclusionImageUrl(questionData.conclusionImageUrl || '')
      
      // Initialize explanation images state
      setExplanationImages(explanationUrls.map((url: string, index: number) => ({
        file: null,
        url: url || '',
        id: `existing-${index}`
      })))
    }
  }, [questionData, reset])

  // Initialize default options for new questions
  useEffect(() => {
    if (!id && setData?.sections && setData.sections.length > 0) {
      const currentSectionId = watch('sectionId')
      const currentOptions = watch('options')
      
      // Only set defaults if form is still empty (new question)
      if (currentSectionId === '' && currentOptions.length === 0) {
        setValue('sectionId', setData.sections[0].sectionId)
        appendOption({ optionId: 'A', text: '' })
        appendOption({ optionId: 'B', text: '' })
        appendOption({ optionId: 'C', text: '' })
        appendOption({ optionId: 'D', text: '' })
      }
    }
  }, [setData, id, watch, setValue, appendOption])

  const mutation = useMutation({
    mutationFn: async (formDataToSend: FormData) => {
      const setIdToUse = resolvedSetId
      
      if (!setIdToUse) {
        throw new Error('Test Set ID is required')
      }
      
      if (id) {
        return api.put(`/admin/questions/${id}`, formDataToSend)
      } else {
        return api.post(`/admin/questions/sets/${setIdToUse}/questions`, formDataToSend)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      queryClient.invalidateQueries({ queryKey: ['question', id] })
      
      if (resolvedSetId) {
        navigate(`/sets/${resolvedSetId}/questions`)
      } else {
        navigate('/categories')
      }
    },
  })

  const onSubmit = async (data: QuestionFormData) => {
    // Validate that correctOptionId is selected
    if (!data.correctOptionId || data.correctOptionId.trim() === '') {
      setShowWarningDialog(true)
      return
    }

    const formDataToSend = new FormData()
    formDataToSend.append('sectionId', data.sectionId)
    formDataToSend.append('direction', data.direction || '')
    formDataToSend.append('questionText', data.questionText)
    formDataToSend.append('questionFormattedText', data.questionFormattedText || '')
    formDataToSend.append('conclusion', data.conclusion || '')
    formDataToSend.append('correctOptionId', data.correctOptionId)
    formDataToSend.append('marks', data.marks.toString())
    formDataToSend.append('explanationText', data.explanationText || '')
    formDataToSend.append('explanationFormattedText', data.explanationFormattedText || '')
    formDataToSend.append('questionOrder', data.questionOrder.toString())
    formDataToSend.append('isActive', data.isActive.toString())
    
    // Direction image - Priority: new file > new URL > existing URL
    if (directionImageFile) {
      formDataToSend.append('directionImage', directionImageFile)
    } else if (directionImageUrl) {
      formDataToSend.append('directionImageUrl', directionImageUrl)
    } else if (id && data.directionImageUrl && !directionImageFile && !directionImageUrl) {
      formDataToSend.append('directionImageUrl', data.directionImageUrl)
    }
    
    // Question image - Priority: new file > new URL > existing URL
    if (questionImageFile) {
      formDataToSend.append('questionImage', questionImageFile)
    } else if (questionImageUrl) {
      formDataToSend.append('questionImageUrl', questionImageUrl)
    } else if (id && data.questionImageUrl && !questionImageFile && !questionImageUrl) {
      formDataToSend.append('questionImageUrl', data.questionImageUrl)
    }
    
    // Conclusion image - Priority: new file > new URL > existing URL
    if (conclusionImageFile) {
      formDataToSend.append('conclusionImage', conclusionImageFile)
    } else if (conclusionImageUrl) {
      formDataToSend.append('conclusionImageUrl', conclusionImageUrl)
    } else if (id && data.conclusionImageUrl && !conclusionImageFile && !conclusionImageUrl) {
      formDataToSend.append('conclusionImageUrl', data.conclusionImageUrl)
    }
    
    // Explanation images (multiple)
    const explanationImageUrls: string[] = []
    let fileIndex = 0
    
    explanationImages.forEach((img) => {
      if (img.file) {
        formDataToSend.append(`explanationImage_${fileIndex}`, img.file)
        fileIndex++
      } else if (img.url && img.url.trim()) {
        explanationImageUrls.push(img.url)
      }
    })
    
    // Send explanation image URLs as JSON array
    if (explanationImageUrls.length > 0) {
      formDataToSend.append('explanationImageUrls', JSON.stringify(explanationImageUrls))
    } else if (id && explanationImages.length === 0 && data.explanationImageUrls.length > 0) {
      // Update mode: keep existing images if no changes
      formDataToSend.append('explanationImageUrls', JSON.stringify(data.explanationImageUrls))
    } else if (id && explanationImages.length === 0 && fileIndex === 0) {
      // Update mode: explicitly clear if empty
      formDataToSend.append('explanationImageUrls', JSON.stringify([]))
    }
    
    // Options
    const optionsData = data.options.map((opt) => {
      const optionData: any = {
        optionId: opt.optionId,
        text: opt.text,
      }
      
      // Handle option images - Priority: new file > new URL input > existing URL
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
    data.options.forEach((opt, index) => {
      if (opt.imageFile) {
        formDataToSend.append(`optionImage_${index}`, opt.imageFile)
      }
    })

    mutation.mutate(formDataToSend)
  }

  const addExplanationImage = () => {
    setExplanationImages([...explanationImages, { file: null, url: '', id: `new-${Date.now()}` }])
  }

  const removeExplanationImage = (imgId: string) => {
    setExplanationImages(explanationImages.filter(img => img.id !== imgId))
  }

  const updateExplanationImage = (imgId: string, file: File | null, url: string) => {
    setExplanationImages(explanationImages.map(img => 
      img.id === imgId ? { ...img, file, url } : img
    ))
  }

  const addOption = () => {
    const newOptionId = String.fromCharCode(65 + optionFields.length)
    appendOption({ optionId: newOptionId, text: '' })
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">{id ? 'Edit' : 'Create'} Question</h1>
      
      {/* Warning Dialog for Missing Correct Answer */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <DialogTitle>Correct Answer Required</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Please select the correct answer option before saving the question. 
              The correct answer is required to create or update a question.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowWarningDialog(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Question Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sectionId">Section *</Label>
                <Select
                  id="sectionId"
                  {...register('sectionId', { required: 'Section is required' })}
                >
                  <option value="">Select Section</option>
                  {setData?.sections?.map((section: any) => (
                    <option key={section.sectionId} value={section.sectionId}>
                      {section.name}
                    </option>
                  ))}
                </Select>
                {errors.sectionId && (
                  <p className="text-sm text-red-500 mt-1">{errors.sectionId.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="questionOrder">Question Order *</Label>
                <Input
                  id="questionOrder"
                  type="number"
                  {...register('questionOrder', { 
                    required: 'Question order is required',
                    min: { value: 1, message: 'Order must be at least 1' },
                    valueAsNumber: true
                  })}
                  min="1"
                />
                {errors.questionOrder && (
                  <p className="text-sm text-red-500 mt-1">{errors.questionOrder.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="direction">Direction</Label>
              <Textarea
                id="direction"
                {...register('direction')}
                rows={3}
                placeholder="Enter direction text (appears before question text)"
              />
            </div>

            <div>
              <Controller
                name="directionImageUrl"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    value={field.value}
                    onChange={(file, url) => {
                      if (file) {
                        setDirectionImageFile(file)
                        setDirectionImageUrl('')
                        field.onChange('')
                      } else if (url) {
                        setDirectionImageUrl(url)
                        setDirectionImageFile(null)
                        field.onChange(url)
                      } else {
                        setDirectionImageFile(null)
                        setDirectionImageUrl('')
                        field.onChange('')
                      }
                    }}
                    label="Direction Image"
                    folder="questions"
                  />
                )}
              />
            </div>

            <div>
              <Controller
                name="questionFormattedText"
                control={control}
                render={({ field }) => {
                  // Use formatted text if it exists (even if empty string), otherwise fall back to plain text
                  // This ensures formatted text is always shown when available
                  const formattedValue = field.value
                  const plainValue = watch('questionText')
                  // If formattedValue is explicitly set (not undefined/null), use it
                  // Otherwise, use plain text as fallback
                  const editorValue = formattedValue !== undefined && formattedValue !== null
                    ? formattedValue 
                    : (plainValue || '')
                  
                  return (
                    <RichTextEditor
                      value={editorValue}
                      onChange={(plainText, formattedText) => {
                        setValue('questionText', plainText, { shouldValidate: true })
                        field.onChange(formattedText)
                      }}
                      label="Question Text *"
                      placeholder="Enter question text with formatting..."
                      required
                    />
                  )
                }}
              />
              {errors.questionText && (
                <p className="text-sm text-red-500 mt-1">{errors.questionText.message}</p>
              )}
            </div>

            <div>
              <Controller
                name="questionImageUrl"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    value={field.value}
                    onChange={(file, url) => {
                      if (file) {
                        setQuestionImageFile(file)
                        setQuestionImageUrl('')
                        field.onChange('')
                      } else if (url) {
                        setQuestionImageUrl(url)
                        setQuestionImageFile(null)
                        field.onChange(url)
                      } else {
                        setQuestionImageFile(null)
                        setQuestionImageUrl('')
                        field.onChange('')
                      }
                    }}
                    label="Question Image"
                    folder="questions"
                  />
                )}
              />
            </div>

            <div>
              <Label htmlFor="conclusion">Conclusion</Label>
              <Textarea
                id="conclusion"
                {...register('conclusion')}
                rows={3}
                placeholder="Enter conclusion text (appears after question text)"
              />
            </div>

            <div>
              <Controller
                name="conclusionImageUrl"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    value={field.value}
                    onChange={(file, url) => {
                      if (file) {
                        setConclusionImageFile(file)
                        setConclusionImageUrl('')
                        field.onChange('')
                      } else if (url) {
                        setConclusionImageUrl(url)
                        setConclusionImageFile(null)
                        field.onChange(url)
                      } else {
                        setConclusionImageFile(null)
                        setConclusionImageUrl('')
                        field.onChange('')
                      }
                    }}
                    label="Conclusion Image"
                    folder="questions"
                  />
                )}
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
                {optionFields.map((field, index) => {
                  const option = watchedOptions[index]
                  return (
                    <div key={field.id} className="flex gap-2 items-center border p-2 rounded">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={watchedCorrectOptionId === option?.optionId}
                        onChange={() => setValue('correctOptionId', option?.optionId || '')}
                        className="w-4 h-4"
                      />
                      <span className="font-medium w-8">{option?.optionId}</span>
                      <input
                        type="hidden"
                        {...register(`options.${index}.optionId` as const)}
                      />
                      <Input
                        placeholder="Option text"
                        {...register(`options.${index}.text` as const, { 
                          required: 'Option text is required' 
                        })}
                        className="flex-1"
                      />
                      <div className="flex-1">
                        <Controller
                          name={`options.${index}.imageUrl` as const}
                          control={control}
                          render={({ field: optionField }) => {
                            const currentOption = watch(`options.${index}`)
                            return (
                              <ImageUpload
                                value={option?.imageUrl || (currentOption as any)?.imageUrlInput || optionField.value || ''}
                                onChange={(file, url) => {
                                  if (file) {
                                    setValue(`options.${index}.imageFile` as any, file, { shouldValidate: false })
                                    setValue(`options.${index}.imageUrlInput` as any, '', { shouldValidate: false })
                                    optionField.onChange('')
                                  } else if (url) {
                                    setValue(`options.${index}.imageUrlInput` as any, url, { shouldValidate: false })
                                    setValue(`options.${index}.imageFile` as any, null, { shouldValidate: false })
                                    optionField.onChange(url)
                                  } else {
                                    setValue(`options.${index}.imageFile` as any, null, { shouldValidate: false })
                                    setValue(`options.${index}.imageUrlInput` as any, '', { shouldValidate: false })
                                    optionField.onChange('')
                                  }
                                }}
                                label=""
                                folder="questions/options"
                                className="mb-0"
                              />
                            )
                          }}
                        />
                      </div>
                      {optionFields.length > 2 && (
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => removeOption(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
              {errors.options && (
                <p className="text-sm text-red-500 mt-1">Please fill all option texts</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="marks">Marks</Label>
                <Input
                  id="marks"
                  type="number"
                  {...register('marks', { 
                    min: { value: 1, message: 'Marks must be at least 1' },
                    valueAsNumber: true
                  })}
                  min="1"
                />
                {errors.marks && (
                  <p className="text-sm text-red-500 mt-1">{errors.marks.message}</p>
                )}
              </div>
            </div>

            <div>
              <Controller
                name="explanationFormattedText"
                control={control}
                render={({ field }) => {
                  // Use formatted text if it exists (even if empty string), otherwise fall back to plain text
                  const formattedValue = field.value
                  const plainValue = watch('explanationText')
                  // If formattedValue is explicitly set (not undefined/null), use it
                  // Otherwise, use plain text as fallback
                  const editorValue = formattedValue !== undefined && formattedValue !== null
                    ? formattedValue 
                    : (plainValue || '')
                  
                  return (
                    <RichTextEditor
                      value={editorValue}
                      onChange={(plainText, formattedText) => {
                        setValue('explanationText', plainText)
                        field.onChange(formattedText)
                      }}
                      label="Explanation Text"
                      placeholder="Enter explanation with formatting (bold, bullets, etc.)"
                    />
                  )
                }}
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
                {...register('isActive')}
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
