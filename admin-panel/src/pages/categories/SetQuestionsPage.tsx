import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Plus, Edit, Trash2 } from 'lucide-react'

export default function SetQuestionsPage() {
  const { id: setId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
    },
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Questions</h1>
        <Button onClick={() => navigate(`/sets/${setId}/questions/new`)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((question: any) => (
              <TableRow key={question._id}>
                <TableCell>{question.questionOrder}</TableCell>
                <TableCell>{question.sectionId}</TableCell>
                <TableCell className="max-w-md truncate">{question.questionText}</TableCell>
                <TableCell>{question.marks}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/questions/${question._id}/edit`)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(question._id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

