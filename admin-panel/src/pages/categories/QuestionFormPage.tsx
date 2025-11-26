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

interface Option {
  optionId: string
  text: string
  imageUrl?: string
}

export default function QuestionFormPage() {
  const { id, setId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    sectionId: '',
    questionText: '',
    questionImageUrl: '',
    options: [] as Option[],
    correctOptionId: '',
    marks: 1,
    explanationText: '',
    explanationImageUrl: '',
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
    queryKey: ['set', setId || questionData?.testSetId],
    queryFn: async () => {
      const setIdToUse = setId || questionData?.testSetId
      const response = await api.get(`/admin/sets/${setIdToUse}`)
      return response.data.data
    },
    enabled: !!(setId || questionData?.testSetId),
  })

  useEffect(() => {
    if (questionData) {
      setFormData({
        sectionId: questionData.sectionId || '',
        questionText: questionData.questionText || '',
        questionImageUrl: questionData.questionImageUrl || '',
        options: questionData.options || [],
        correctOptionId: questionData.correctOptionId || '',
        marks: questionData.marks || 1,
        explanationText: questionData.explanationText || '',
        explanationImageUrl: questionData.explanationImageUrl || '',
        questionOrder: questionData.questionOrder || 1,
        isActive: questionData.isActive ?? true,
      })
    } else if (setData?.sections && setData.sections.length > 0) {
      setFormData((prev) => ({
        ...prev,
        sectionId: setData.sections[0].sectionId,
        options: [
          { optionId: 'A', text: '' },
          { optionId: 'B', text: '' },
          { optionId: 'C', text: '' },
          { optionId: 'D', text: '' },
        ],
      }))
    }
  }, [questionData, setData])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const setIdToUse = setId || questionData?.testSetId
      if (id) {
        return api.put(`/admin/questions/${id}`, data)
      } else {
        return api.post(`/admin/questions/sets/${setIdToUse}/questions`, data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      navigate(`/sets/${setId || questionData?.testSetId}/questions`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  const updateOption = (index: number, field: keyof Option, value: string) => {
    const options = [...formData.options]
    options[index] = { ...options[index], [field]: value }
    setFormData({ ...formData, options })
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
    <div>
      <h1 className="text-3xl font-bold mb-6">{id ? 'Edit' : 'Create'} Question</h1>
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
              <Label htmlFor="questionImageUrl">Question Image URL</Label>
              <Input
                id="questionImageUrl"
                value={formData.questionImageUrl}
                onChange={(e) => setFormData({ ...formData, questionImageUrl: e.target.value })}
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
                    <Input
                      placeholder="Image URL (optional)"
                      value={option.imageUrl || ''}
                      onChange={(e) => updateOption(index, 'imageUrl', e.target.value)}
                      className="flex-1"
                    />
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
              <Label htmlFor="explanationImageUrl">Explanation Image URL</Label>
              <Input
                id="explanationImageUrl"
                value={formData.explanationImageUrl}
                onChange={(e) => setFormData({ ...formData, explanationImageUrl: e.target.value })}
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

