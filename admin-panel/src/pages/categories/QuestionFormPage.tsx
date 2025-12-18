import { useState, useEffect, useCallback } from 'react'
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

interface LanguageContent {
  direction: string
  directionFormattedText: string
  directionImageUrl: string
  questionText: string
  questionFormattedText: string
  questionImageUrl: string
  conclusion: string
  conclusionFormattedText: string
  conclusionImageUrl: string
  options: OptionWithFile[]
  explanationText: string
  explanationFormattedText: string
  explanationImageUrls: string[]
}

interface QuestionFormData {
  sectionId?: string
  languages: {
    en: LanguageContent
    hi?: LanguageContent
    gu?: LanguageContent
  }
  correctOptionId: string
  marks: number
  averageTimeSeconds: number
  tags: string[]
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
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  
  // Initialize form with default values
  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<QuestionFormData>({
    defaultValues: {
      sectionId: '',
      languages: {
        en: {
          direction: '',
          directionFormattedText: '',
          directionImageUrl: '',
          questionText: '',
          questionFormattedText: '',
          questionImageUrl: '',
          conclusion: '',
          conclusionFormattedText: '',
          conclusionImageUrl: '',
          options: [],
          explanationText: '',
          explanationFormattedText: '',
          explanationImageUrls: [],
        },
      },
      correctOptionId: '',
      marks: 1,
      averageTimeSeconds: 0,
      tags: [],
      questionOrder: 1,
      isActive: true,
    },
  })

  // Use field arrays for dynamic fields for each language
  const { fields: enOptionFields, append: appendEnOption, remove: removeEnOption } = useFieldArray({
    control,
    name: 'languages.en.options',
  })
  
  const { fields: hiOptionFields, append: appendHiOption, remove: removeHiOption } = useFieldArray({
    control,
    name: 'languages.hi.options',
  })
  
  const { fields: guOptionFields, append: appendGuOption, remove: removeGuOption } = useFieldArray({
    control,
    name: 'languages.gu.options',
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

  // Fetch category to get sections and subsections
  const categoryId = setData?.categoryIdString || (setData?.categoryId 
    ? (typeof setData.categoryId === 'object' && setData.categoryId._id 
        ? setData.categoryId._id.toString() 
        : setData.categoryId.toString())
    : null)
  
  const { data: categoryData } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      if (!categoryId) return null
      const response = await api.get(`/admin/categories/${categoryId}`)
      return response.data.data
    },
    enabled: !!categoryId,
  })

  const categorySections = categoryData?.sections || []

  // Watch form values
  const watchedLanguages = watch('languages')
  
  // Get language data
  const enOptions = watchedLanguages?.en?.options || []
  const hiOptions = watchedLanguages?.hi?.options || []
  const guOptions = watchedLanguages?.gu?.options || []

  // Initialize form data when question data is loaded (edit mode)
  useEffect(() => {
    if (questionData) {
      const explanationUrls = questionData.explanationImageUrls || []
      
      // Extract languages data - ensure all languages have proper structure
      const languages: any = {
        en: questionData.languages?.en || {
          direction: '',
          directionFormattedText: '',
          directionImageUrl: '',
          questionText: '',
          questionFormattedText: '',
          questionImageUrl: '',
          conclusion: '',
          conclusionFormattedText: '',
          conclusionImageUrl: '',
          options: [],
          explanationText: '',
          explanationFormattedText: '',
          explanationImageUrls: [],
        },
      }
      
      // Migrate old explanation data to English if exists
      if (questionData.explanationText || questionData.explanationFormattedText || questionData.explanationImageUrls) {
        if (!languages.en.explanationText && questionData.explanationText) {
          languages.en.explanationText = questionData.explanationText
        }
        if (!languages.en.explanationFormattedText && questionData.explanationFormattedText) {
          languages.en.explanationFormattedText = questionData.explanationFormattedText
        }
        if (!languages.en.explanationImageUrls && questionData.explanationImageUrls) {
          languages.en.explanationImageUrls = questionData.explanationImageUrls
        }
      }
      
      // Add Hindi if exists
      if (questionData.languages?.hi) {
        languages.hi = questionData.languages.hi
      }
      
      // Add Gujarati if exists
      if (questionData.languages?.gu) {
        languages.gu = questionData.languages.gu
      }
      
      // Ensure all languages have the same number of options as English
      const enOptionsCount = languages.en?.options?.length || 0
      const optionIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
      
      // Sync Hindi options
      if (languages.hi) {
        const hiOptionsCount = languages.hi.options?.length || 0
        if (hiOptionsCount < enOptionsCount) {
          // Add missing options
          for (let i = hiOptionsCount; i < enOptionsCount; i++) {
            languages.hi.options.push({ optionId: optionIds[i] || String.fromCharCode(65 + i), text: '' })
          }
        } else if (hiOptionsCount > enOptionsCount) {
          // Remove extra options
          languages.hi.options = languages.hi.options.slice(0, enOptionsCount)
        }
        // Ensure optionIds match
        languages.hi.options.forEach((opt: any, idx: number) => {
          opt.optionId = optionIds[idx] || String.fromCharCode(65 + idx)
        })
      }
      
      // Sync Gujarati options
      if (languages.gu) {
        const guOptionsCount = languages.gu.options?.length || 0
        if (guOptionsCount < enOptionsCount) {
          // Add missing options
          for (let i = guOptionsCount; i < enOptionsCount; i++) {
            languages.gu.options.push({ optionId: optionIds[i] || String.fromCharCode(65 + i), text: '' })
          }
        } else if (guOptionsCount > enOptionsCount) {
          // Remove extra options
          languages.gu.options = languages.gu.options.slice(0, enOptionsCount)
        }
        // Ensure optionIds match
        languages.gu.options.forEach((opt: any, idx: number) => {
          opt.optionId = optionIds[idx] || String.fromCharCode(65 + idx)
        })
      }
      
      // Reset form with question data
      reset({
        sectionId: questionData.sectionId || '',
        languages,
        correctOptionId: questionData.correctOptionId || '',
        marks: questionData.marks || 1,
        averageTimeSeconds: questionData.averageTimeSeconds !== undefined ? questionData.averageTimeSeconds : 0,
        tags: questionData.tags || [],
        questionOrder: questionData.questionOrder || 1,
        isActive: questionData.isActive ?? true,
      })
      
    }
  }, [questionData, reset])

  // Initialize default options for new questions
  useEffect(() => {
    if (!id) {
      const enOptions = watch('languages.en.options')
      
      // Only set defaults if form is still empty (new question)
      if (!enOptions || enOptions.length === 0) {
        // Set sectionId only if category sections exist
        if (categorySections.length > 0) {
          const currentSectionId = watch('sectionId')
          if (currentSectionId === '') {
            const firstSection = categorySections[0]
            if (firstSection) {
              setValue('sectionId', firstSection.sectionId)
            }
          }
        }
        appendEnOption({ optionId: 'A', text: '' })
        appendEnOption({ optionId: 'B', text: '' })
        appendEnOption({ optionId: 'C', text: '' })
        appendEnOption({ optionId: 'D', text: '' })
        appendEnOption({ optionId: 'E', text: '' })
      }
    }
  }, [categorySections, id, watch, setValue, appendEnOption])

  // Sync options across all languages when English options change
  const syncOptionsToAllLanguages = useCallback((enOptionsCount: number) => {
    const optionIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    
    // Sync Hindi options
    const currentHiOptions = watch('languages.hi.options') || []
    const hiOptionsCount = currentHiOptions.length
    
    if (hiOptionsCount < enOptionsCount) {
      // Add missing options
      for (let i = hiOptionsCount; i < enOptionsCount; i++) {
        appendHiOption({ optionId: optionIds[i] || String.fromCharCode(65 + i), text: '' })
      }
    } else if (hiOptionsCount > enOptionsCount) {
      // Remove extra options
      for (let i = hiOptionsCount - 1; i >= enOptionsCount; i--) {
        removeHiOption(i)
      }
    }
    
    // Sync Gujarati options
    const currentGuOptions = watch('languages.gu.options') || []
    const guOptionsCount = currentGuOptions.length
    
    if (guOptionsCount < enOptionsCount) {
      // Add missing options
      for (let i = guOptionsCount; i < enOptionsCount; i++) {
        appendGuOption({ optionId: optionIds[i] || String.fromCharCode(65 + i), text: '' })
      }
    } else if (guOptionsCount > enOptionsCount) {
      // Remove extra options
      for (let i = guOptionsCount - 1; i >= enOptionsCount; i--) {
        removeGuOption(i)
      }
    }
    
    // Ensure optionIds match English
    for (let i = 0; i < enOptionsCount; i++) {
      const optionId = optionIds[i] || String.fromCharCode(65 + i)
      if (currentHiOptions[i]?.optionId !== optionId) {
        setValue(`languages.hi.options.${i}.optionId`, optionId)
      }
      if (currentGuOptions[i]?.optionId !== optionId) {
        setValue(`languages.gu.options.${i}.optionId`, optionId)
      }
    }
  }, [watch, setValue, appendHiOption, removeHiOption, appendGuOption, removeGuOption])

  // Sync options across all languages when English options change
  useEffect(() => {
    if (enOptions.length > 0) {
      syncOptionsToAllLanguages(enOptions.length)
    }
  }, [enOptions.length, syncOptionsToAllLanguages])

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

    // Validate that English language content exists
    if (!data.languages?.en || !data.languages.en.questionText || !data.languages.en.options || data.languages.en.options.length < 2) {
      alert('English language content is required with question text and at least 2 options')
      return
    }

    const formDataToSend = new FormData()
    
    // Append sectionId if it exists
    if (data.sectionId) {
      formDataToSend.append('sectionId', data.sectionId)
    }
    
    // Process languages and build languages object
    const languagesData: any = {
      en: {
        direction: data.languages.en.direction || '',
        directionFormattedText: data.languages.en.directionFormattedText || '',
        questionText: data.languages.en.questionText,
        questionFormattedText: data.languages.en.questionFormattedText || '',
        conclusion: data.languages.en.conclusion || '',
        conclusionFormattedText: data.languages.en.conclusionFormattedText || '',
        options: data.languages.en.options.map((opt) => ({
          optionId: opt.optionId,
          text: opt.text,
          imageUrl: opt.imageUrl || opt.imageUrlInput || undefined,
        })),
        explanationText: data.languages.en.explanationText || '',
        explanationFormattedText: data.languages.en.explanationFormattedText || '',
        explanationImageUrls: (data.languages.en.explanationImageUrls || []).filter((url: string) => url && url.trim()),
      },
    }
    
    // Add Hindi if provided
    if (data.languages.hi && data.languages.hi.questionText) {
      languagesData.hi = {
        direction: data.languages.hi.direction || '',
        directionFormattedText: data.languages.hi.directionFormattedText || '',
        questionText: data.languages.hi.questionText,
        questionFormattedText: data.languages.hi.questionFormattedText || '',
        conclusion: data.languages.hi.conclusion || '',
        conclusionFormattedText: data.languages.hi.conclusionFormattedText || '',
        options: data.languages.hi.options.map((opt) => ({
          optionId: opt.optionId,
          text: opt.text,
          imageUrl: opt.imageUrl || opt.imageUrlInput || undefined,
        })),
        explanationText: data.languages.hi.explanationText || '',
        explanationFormattedText: data.languages.hi.explanationFormattedText || '',
        explanationImageUrls: (data.languages.hi.explanationImageUrls || []).filter((url: string) => url && url.trim()),
      }
    }
    
    // Add Gujarati if provided
    if (data.languages.gu && data.languages.gu.questionText) {
      languagesData.gu = {
        direction: data.languages.gu.direction || '',
        directionFormattedText: data.languages.gu.directionFormattedText || '',
        questionText: data.languages.gu.questionText,
        questionFormattedText: data.languages.gu.questionFormattedText || '',
        conclusion: data.languages.gu.conclusion || '',
        conclusionFormattedText: data.languages.gu.conclusionFormattedText || '',
        options: data.languages.gu.options.map((opt) => ({
          optionId: opt.optionId,
          text: opt.text,
          imageUrl: opt.imageUrl || opt.imageUrlInput || undefined,
        })),
        explanationText: data.languages.gu.explanationText || '',
        explanationFormattedText: data.languages.gu.explanationFormattedText || '',
        explanationImageUrls: (data.languages.gu.explanationImageUrls || []).filter((url: string) => url && url.trim()),
      }
    }
    
    // Send languages as JSON
    formDataToSend.append('languages', JSON.stringify(languagesData))
    
    // Handle images for each language
    const processLanguageImages = (lang: 'en' | 'hi' | 'gu', langData: LanguageContent) => {
      const prefix = `languages.${lang}`
      
      // Direction image
      if (langData.directionImageUrl) {
        formDataToSend.append(`${prefix}.directionImageUrl`, langData.directionImageUrl)
      }
      
      // Question image
      if (langData.questionImageUrl) {
        formDataToSend.append(`${prefix}.questionImageUrl`, langData.questionImageUrl)
      }
      
      // Conclusion image
      if (langData.conclusionImageUrl) {
        formDataToSend.append(`${prefix}.conclusionImageUrl`, langData.conclusionImageUrl)
      }
      
      // Option images
      langData.options.forEach((opt, index) => {
        if (opt.imageFile) {
          formDataToSend.append(`${prefix}.optionImage_${index}`, opt.imageFile)
        }
      })
      
      // Explanation images
      if (langData.explanationImageUrls && langData.explanationImageUrls.length > 0) {
        formDataToSend.append(`${prefix}.explanationImageUrls`, JSON.stringify(langData.explanationImageUrls))
      }
    }
    
    processLanguageImages('en', data.languages.en)
    if (data.languages.hi) processLanguageImages('hi', data.languages.hi)
    if (data.languages.gu) processLanguageImages('gu', data.languages.gu)
    
    formDataToSend.append('correctOptionId', data.correctOptionId)
    formDataToSend.append('marks', data.marks.toString())
    formDataToSend.append('averageTimeSeconds', data.averageTimeSeconds.toString())
    formDataToSend.append('tags', JSON.stringify(data.tags || []))
    formDataToSend.append('questionOrder', data.questionOrder.toString())
    formDataToSend.append('isActive', data.isActive.toString())

    mutation.mutate(formDataToSend)
  }

  const addEnOption = () => {
    const newOptionId = String.fromCharCode(65 + enOptions.length)
    appendEnOption({ optionId: newOptionId, text: '' })
    // Sync to other languages
    syncOptionsToAllLanguages(enOptions.length + 1)
  }
  
  const handleRemoveEnOption = (index: number) => {
    if (enOptions.length > 2) {
      removeEnOption(index)
      // Sync to other languages
      syncOptionsToAllLanguages(enOptions.length - 1)
    }
  }
  
  // Helper to ensure language exists
  const ensureLanguage = (lang: 'hi' | 'gu') => {
    if (!watchedLanguages?.[lang]) {
      setValue(`languages.${lang}`, {
        direction: '',
        directionFormattedText: '',
        directionImageUrl: '',
        questionText: '',
        questionFormattedText: '',
        questionImageUrl: '',
        conclusion: '',
        conclusionFormattedText: '',
        conclusionImageUrl: '',
        options: [],
      })
    }
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
            <div className={`grid gap-4 ${categorySections.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {categorySections.length > 0 && (
                <div>
                  <Label htmlFor="sectionId">Section *</Label>
                  <Select
                    id="sectionId"
                    {...register('sectionId', { required: 'Section is required' })}
                  >
                    <option value="">Select Section</option>
                    {categorySections.map((section: any) => (
                      <option key={section.sectionId} value={section.sectionId}>
                        {section.name}
                      </option>
                    ))}
                  </Select>
                  {errors.sectionId && (
                    <p className="text-sm text-red-500 mt-1">{errors.sectionId.message}</p>
                  )}
                </div>
              )}
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

            {/* Helper function to render language fields */}
            {(['en', 'hi', 'gu'] as const).map((lang) => {
              const isEnglish = lang === 'en'
              const langLabel = lang === 'en' ? 'English *' : lang === 'hi' ? 'Hindi (Optional)' : 'Gujarati (Optional)'
              // All languages use English options count
              const optionFields = enOptionFields
              const langOptions = lang === 'en' ? enOptions : lang === 'hi' ? hiOptions : guOptions
              const addOptionFn = isEnglish ? addEnOption : () => {}
              const removeOptionFn = isEnglish ? handleRemoveEnOption : () => {}
              
              // Ensure language exists if it's optional
              if (!isEnglish && !watchedLanguages?.[lang]) {
                ensureLanguage(lang)
              }
              
              return (
                <div key={lang} className={`space-y-4 ${!isEnglish ? 'border-t-2 border-gray-200 pt-6 mt-6' : 'border-b-2 border-blue-200 pb-6 mb-6'}`}>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">{langLabel}</h2>
                  
                  {/* Direction */}
                  <div>
                    <Controller
                      name={`languages.${lang}.directionFormattedText`}
                      control={control}
                      render={({ field }) => {
                        const currentLangData = watch(`languages.${lang}`)
                        const formattedValue = field.value || currentLangData?.directionFormattedText
                        const plainValue = watch(`languages.${lang}.direction`) || currentLangData?.direction
                        const editorValue = formattedValue !== undefined && formattedValue !== null && formattedValue !== ''
                          ? formattedValue 
                          : (plainValue || '')
                        
                        return (
                          <RichTextEditor
                            value={editorValue}
                            onChange={(plainText, formattedText) => {
                              setValue(`languages.${lang}.direction`, plainText)
                              field.onChange(formattedText)
                            }}
                            label="Direction"
                            placeholder="Enter direction text (appears before question text)..."
                          />
                        )
                      }}
                    />
                  </div>

                  <div>
                    <Controller
                      name={`languages.${lang}.directionImageUrl`}
                      control={control}
                      render={({ field }) => (
                        <ImageUpload
                          value={field.value || ''}
                          onChange={(file, url) => {
                            field.onChange(url || '')
                          }}
                          label="Direction Image"
                          folder="questions"
                        />
                      )}
                    />
                  </div>

                  {/* Question Text */}
                  <div>
                    <Controller
                      name={`languages.${lang}.questionFormattedText`}
                      control={control}
                      render={({ field }) => {
                        const currentLangData = watch(`languages.${lang}`)
                        const formattedValue = field.value || currentLangData?.questionFormattedText
                        const plainValue = watch(`languages.${lang}.questionText`) || currentLangData?.questionText
                        const editorValue = formattedValue !== undefined && formattedValue !== null && formattedValue !== ''
                          ? formattedValue 
                          : (plainValue || '')
                        
                        return (
                          <RichTextEditor
                            value={editorValue}
                            onChange={(plainText, formattedText) => {
                              setValue(`languages.${lang}.questionText`, plainText, { shouldValidate: isEnglish })
                              field.onChange(formattedText)
                            }}
                            label={isEnglish ? 'Question Text *' : 'Question Text'}
                            placeholder="Enter question text with formatting..."
                            required={isEnglish}
                          />
                        )
                      }}
                    />
                    {isEnglish && errors.languages?.en?.questionText && (
                      <p className="text-sm text-red-500 mt-1">{errors.languages.en.questionText.message}</p>
                    )}
                  </div>

                  <div>
                    <Controller
                      name={`languages.${lang}.questionImageUrl`}
                      control={control}
                      render={({ field }) => (
                        <ImageUpload
                          value={field.value || ''}
                          onChange={(file, url) => {
                            field.onChange(url || '')
                          }}
                          label="Question Image"
                          folder="questions"
                        />
                      )}
                    />
                  </div>

                  {/* Conclusion */}
                  <div>
                    <Controller
                      name={`languages.${lang}.conclusionFormattedText`}
                      control={control}
                      render={({ field }) => {
                        const currentLangData = watch(`languages.${lang}`)
                        const formattedValue = field.value || currentLangData?.conclusionFormattedText
                        const plainValue = watch(`languages.${lang}.conclusion`) || currentLangData?.conclusion
                        const editorValue = formattedValue !== undefined && formattedValue !== null && formattedValue !== ''
                          ? formattedValue 
                          : (plainValue || '')
                        
                        return (
                          <RichTextEditor
                            value={editorValue}
                            onChange={(plainText, formattedText) => {
                              setValue(`languages.${lang}.conclusion`, plainText)
                              field.onChange(formattedText)
                            }}
                            label="Conclusion"
                            placeholder="Enter conclusion text (appears after question text)..."
                          />
                        )
                      }}
                    />
                  </div>

                  <div>
                    <Controller
                      name={`languages.${lang}.conclusionImageUrl`}
                      control={control}
                      render={({ field }) => (
                        <ImageUpload
                          value={field.value || ''}
                          onChange={(file, url) => {
                            field.onChange(url || '')
                          }}
                          label="Conclusion Image"
                          folder="questions"
                        />
                      )}
                    />
                  </div>

                  {/* Options */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>{isEnglish ? 'Options *' : 'Options'}</Label>
                      {isEnglish && (
                        <Button type="button" variant="outline" size="sm" onClick={addOptionFn}>
                          Add Option
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {optionFields.map((field, index) => {
                        // All languages use English options count - get language-specific option data
                        const langOptions = lang === 'en' ? enOptions : lang === 'hi' ? hiOptions : guOptions
                        const watchedOption = watch(`languages.${lang}.options.${index}`)
                        const option = watchedOption || langOptions[index] || { optionId: String.fromCharCode(65 + index), text: '' }
                        // Use English optionId to ensure consistency
                        const enOptionId = enOptions[index]?.optionId || String.fromCharCode(65 + index)
                        const optionId = isEnglish ? (option?.optionId || enOptionId) : enOptionId
                        
                        // Ensure optionId matches English for all languages
                        if (!watchedOption?.optionId || watchedOption.optionId !== enOptionId) {
                          setValue(`languages.${lang}.options.${index}.optionId`, enOptionId, { shouldValidate: false })
                        }
                        
                        return (
                          <div key={field.id} className="flex gap-2 items-center border p-2 rounded">
                            <span className="font-medium w-8">{optionId}</span>
                            <input
                              type="hidden"
                              {...register(`languages.${lang}.options.${index}.optionId` as const)}
                            />
                            <Input
                              placeholder="Option text"
                              {...register(`languages.${lang}.options.${index}.text` as const, { 
                                required: isEnglish ? 'Option text is required' : false
                              })}
                              className="flex-1"
                            />
                            <div className="flex-1">
                              <Controller
                                name={`languages.${lang}.options.${index}.imageUrl` as const}
                                control={control}
                                render={({ field: optionField }) => {
                                  return (
                                    <ImageUpload
                                      value={option?.imageUrl || optionField.value || ''}
                                      onChange={(file, url) => {
                                        if (file) {
                                          setValue(`languages.${lang}.options.${index}.imageFile` as any, file, { shouldValidate: false })
                                          optionField.onChange('')
                                        } else if (url) {
                                          setValue(`languages.${lang}.options.${index}.imageUrlInput` as any, url, { shouldValidate: false })
                                          optionField.onChange(url)
                                        } else {
                                          setValue(`languages.${lang}.options.${index}.imageFile` as any, null, { shouldValidate: false })
                                          setValue(`languages.${lang}.options.${index}.imageUrlInput` as any, '', { shouldValidate: false })
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
                            {isEnglish && optionFields.length > 2 && (
                              <Button 
                                type="button" 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => removeOptionFn(index)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {isEnglish && errors.languages?.en?.options && (
                      <p className="text-sm text-red-500 mt-1">Please fill all option texts</p>
                    )}
                  </div>

                  {/* Explanation */}
                  <div>
                    <Controller
                      name={`languages.${lang}.explanationFormattedText`}
                      control={control}
                      render={({ field }) => {
                        const currentLangData = watch(`languages.${lang}`)
                        const formattedValue = field.value || currentLangData?.explanationFormattedText
                        const plainValue = watch(`languages.${lang}.explanationText`) || currentLangData?.explanationText
                        const editorValue = formattedValue !== undefined && formattedValue !== null && formattedValue !== ''
                          ? formattedValue 
                          : (plainValue || '')
                        
                        return (
                          <RichTextEditor
                            value={editorValue}
                            onChange={(plainText, formattedText) => {
                              setValue(`languages.${lang}.explanationText`, plainText)
                              field.onChange(formattedText)
                            }}
                            label="Explanation"
                            placeholder="Enter explanation with formatting (bold, bullets, etc.)..."
                          />
                        )
                      }}
                    />
                  </div>

                  {/* Explanation Images */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Explanation Images</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const currentImages = watch(`languages.${lang}.explanationImageUrls`) || []
                          setValue(`languages.${lang}.explanationImageUrls`, [...currentImages, ''])
                        }}
                      >
                        Add Image
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {(watch(`languages.${lang}.explanationImageUrls`) || []).map((url: string, index: number) => (
                        <div key={`${lang}-explanation-${index}`} className="border p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <Label>Explanation Image {index + 1}</Label>
                            <Button 
                              type="button" 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => {
                                const currentImages = watch(`languages.${lang}.explanationImageUrls`) || []
                                const newImages = currentImages.filter((_: string, i: number) => i !== index)
                                setValue(`languages.${lang}.explanationImageUrls`, newImages)
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                          <Controller
                            name={`languages.${lang}.explanationImageUrls.${index}`}
                            control={control}
                            render={({ field }) => (
                              <ImageUpload
                                value={field.value || ''}
                                onChange={(file, url) => {
                                  field.onChange(url || '')
                                }}
                                label=""
                                folder="questions"
                              />
                            )}
                          />
                        </div>
                      ))}
                      {(!watch(`languages.${lang}.explanationImageUrls`) || watch(`languages.${lang}.explanationImageUrls`).length === 0) && (
                        <div className="text-sm text-gray-500">
                          No explanation images added. Click "Add Image" to add one.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            <div>
              <Label htmlFor="correctOptionId">Correct Option *</Label>
              <Select
                id="correctOptionId"
                {...register('correctOptionId', { 
                  required: 'Please select the correct option' 
                })}
              >
                <option value="">Select correct option</option>
                {watch('languages.en.options')?.map((opt: any, index: number) => {
                  const optionId = opt?.optionId || String.fromCharCode(65 + index)
                  return (
                    <option key={index} value={optionId}>
                      {optionId}
                    </option>
                  )
                })}
              </Select>
              {errors.correctOptionId && (
                <p className="text-sm text-red-500 mt-1">{errors.correctOptionId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., math, algebra, geometry"
                {...register('tags', {
                  setValueAs: (value: any) => {
                    // If already an array, return it
                    if (Array.isArray(value)) return value
                    // If string, parse it
                    if (typeof value === 'string') {
                      if (!value || value.trim() === '') return []
                      return value.split(',').map((t: string) => t.trim()).filter((t: string) => t)
                    }
                    // Default to empty array
                    return []
                  }
                })}
                defaultValue={Array.isArray(watch('tags')) ? watch('tags')?.join(', ') || '' : ''}
              />
              <p className="text-sm text-gray-500 mt-1">Enter tags separated by commas</p>
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
              <div>
                <Label htmlFor="averageTimeSeconds">Average Time (seconds)</Label>
                <Input
                  id="averageTimeSeconds"
                  type="number"
                  {...register('averageTimeSeconds', { 
                    min: { value: 0, message: 'Time must be at least 0' },
                    valueAsNumber: true
                  })}
                  min="0"
                />
                {errors.averageTimeSeconds && (
                  <p className="text-sm text-red-500 mt-1">{errors.averageTimeSeconds.message}</p>
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
