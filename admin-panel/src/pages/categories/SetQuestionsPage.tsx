import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Loader } from '../../components/ui/loader'
import { DeleteConfirmationDialog } from '../../components/ui/delete-confirmation-dialog'
import { Plus, Edit, Trash2, Upload, ChevronDown, ChevronRight } from 'lucide-react'
import { QuestionImportDialog } from '../../components/ui/question-import-dialog'

export default function SetQuestionsPage() {
  const { id: setId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['questions', setId],
    queryFn: async () => {
      const response = await api.get(`/admin/questions/sets/${setId}/questions`)
      return response.data.data
    },
  })

  // Fetch set data to get sections
  const { data: setData } = useQuery({
    queryKey: ['set', setId],
    queryFn: async () => {
      if (!setId) return null
      const response = await api.get(`/admin/sets/${setId}`)
      return response.data.data
    },
    enabled: !!setId,
  })

  // Group and sort questions by section
  const groupedQuestions = useMemo(() => {
    if (!data || !Array.isArray(data)) return []

    // Create a map of sectionId to section name
    const sectionMap = new Map<string, string>()
    if (setData?.sections && Array.isArray(setData.sections)) {
      setData.sections.forEach((section: any) => {
        sectionMap.set(section.sectionId, section.name || section.sectionId)
      })
    }

    // Group questions by sectionId
    const grouped: Record<string, any[]> = {}
    const noSection: any[] = []

    data.forEach((question: any) => {
      const sectionId = question.sectionId
      if (sectionId) {
        if (!grouped[sectionId]) {
          grouped[sectionId] = []
        }
        grouped[sectionId].push(question)
      } else {
        noSection.push(question)
      }
    })

    // Sort questions within each section by questionOrder
    Object.keys(grouped).forEach((sectionId) => {
      grouped[sectionId].sort((a, b) => (a.questionOrder || 0) - (b.questionOrder || 0))
    })

    // Sort no-section questions by questionOrder
    noSection.sort((a, b) => (a.questionOrder || 0) - (b.questionOrder || 0))

    // Get section order from setData if available
    const sectionOrder = new Map<string, number>()
    if (setData?.sections && Array.isArray(setData.sections)) {
      setData.sections.forEach((section: any, index: number) => {
        sectionOrder.set(section.sectionId, section.order || index)
      })
    }

    // Sort sections by order
    const sortedSections = Object.keys(grouped).sort((a, b) => {
      const orderA = sectionOrder.get(a) ?? 999
      const orderB = sectionOrder.get(b) ?? 999
      return orderA - orderB
    })

    // Build result array with section headers
    const result: Array<{ type: 'section' | 'question'; sectionId?: string; sectionName?: string; question?: any }> = []

    // Add grouped sections
    sortedSections.forEach((sectionId) => {
      result.push({
        type: 'section',
        sectionId,
        sectionName: sectionMap.get(sectionId) || sectionId,
      })
      grouped[sectionId].forEach((question) => {
        result.push({
          type: 'question',
          question,
        })
      })
    })

    // Add no-section questions at the end
    if (noSection.length > 0) {
      result.push({
        type: 'section',
        sectionId: undefined,
        sectionName: 'No Section',
      })
      noSection.forEach((question) => {
        result.push({
          type: 'question',
          question,
        })
      })
    }

    return result
  }, [data, setData])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/questions/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', setId] })
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    },
  })

  const handleDeleteClick = (id: string, name: string) => {
    setItemToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id)
    }
  }

  const toggleSection = (sectionId: string | undefined) => {
    const key = sectionId ?? 'no-section'
    setCollapsedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const isSectionCollapsed = (sectionId: string | undefined) => {
    const key = sectionId ?? 'no-section'
    return collapsedSections.has(key)
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Questions</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
          </Button>
          <Button onClick={() => navigate(`/sets/${setId}/questions/new`)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-900">Order</TableHead>
              <TableHead className="font-semibold text-gray-900">Section</TableHead>
              <TableHead className="font-semibold text-gray-900">Question</TableHead>
              <TableHead className="font-semibold text-gray-900">Marks</TableHead>
              <TableHead className="font-semibold text-gray-900">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Loader inline />
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                  No questions found
                </TableCell>
              </TableRow>
            ) : (
              groupedQuestions.map((item, index) => {
                if (item.type === 'section') {
                  const sectionId = item.sectionId
                  const isCollapsed = isSectionCollapsed(sectionId)
                  const ChevronIcon = isCollapsed ? ChevronRight : ChevronDown
                  
                  return (
                    <TableRow 
                      key={`section-${sectionId ?? 'no-section'}`} 
                      className="bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => toggleSection(sectionId)}
                    >
                      <TableCell colSpan={4} className="font-semibold text-gray-900 py-3">
                        {item.sectionName}
                      </TableCell>
                      <TableCell className="text-right">
                        <ChevronIcon className="w-5 h-5 text-gray-600 transition-transform duration-200" />
                      </TableCell>
                    </TableRow>
                  )
                } else {
                  const question = item.question
                  const sectionId = question.sectionId
                  const isCollapsed = isSectionCollapsed(sectionId ?? undefined)
                  
                  // Hide question if its section is collapsed
                  if (isCollapsed) {
                    return null
                  }
                  
                  const questionText = question.languages?.en?.questionText || question.questionText || `Question ${question.questionOrder}`
                  const availableLanguages = []
                  if (question.languages?.en) availableLanguages.push('EN')
                  if (question.languages?.hi) availableLanguages.push('HI')
                  if (question.languages?.gu) availableLanguages.push('GU')
                  
                  return (
                    <TableRow 
                      key={question._id} 
                      className="hover:bg-gray-50 transition-all duration-200"
                      style={{
                        animation: isCollapsed ? 'none' : 'fadeIn 0.2s ease-in',
                      }}
                    >
                      <TableCell className="text-gray-900">{question.questionOrder}</TableCell>
                      <TableCell className="text-gray-700">{question.sectionId || '-'}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate text-gray-700" title={questionText}>
                          {questionText}
                        </div>
                        {availableLanguages.length > 1 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Languages: {availableLanguages.join(', ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-700">{question.marks}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/questions/${question._id}/edit`)
                          }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(question._id, questionText)
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                }
              }).filter(Boolean)
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Question"
        itemName={itemToDelete?.name}
        isLoading={deleteMutation.isPending}
      />

      <QuestionImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        setId={setId || ''}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['questions', setId] })
          setImportDialogOpen(false)
        }}
      />
    </div>
  )
}

