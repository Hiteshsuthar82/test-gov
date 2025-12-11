import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Loader } from '../../components/ui/loader'
import { DeleteConfirmationDialog } from '../../components/ui/delete-confirmation-dialog'
import { Plus, Edit, Trash2, Upload } from 'lucide-react'
import { QuestionImportDialog } from '../../components/ui/question-import-dialog'

export default function SetQuestionsPage() {
  const { id: setId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['questions', setId],
    queryFn: async () => {
      const response = await api.get(`/admin/questions/sets/${setId}/questions`)
      return response.data.data
    },
  })

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
              data.map((question: any) => (
                <TableRow key={question._id} className="hover:bg-gray-50">
                  <TableCell className="text-gray-900">{question.questionOrder}</TableCell>
                  <TableCell className="text-gray-700">{question.sectionId}</TableCell>
                  <TableCell className="max-w-md truncate text-gray-700">{question.questionText}</TableCell>
                  <TableCell className="text-gray-700">{question.marks}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/questions/${question._id}/edit`)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(question._id, question.questionText || `Question ${question.questionOrder}`)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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

