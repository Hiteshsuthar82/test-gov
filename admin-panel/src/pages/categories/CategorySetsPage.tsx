import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Plus, Edit, Trash2, FileQuestion } from 'lucide-react'

export default function CategorySetsPage() {
  const { id: categoryId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['sets', categoryId],
    queryFn: async () => {
      const response = await api.get(`/admin/sets/categories/${categoryId}/sets`)
      return response.data.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/sets/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sets', categoryId] })
    },
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Test Sets</h1>
        <Button onClick={() => navigate(`/categories/${categoryId}/sets/new`)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Test Set
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Total Marks</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((set: any) => (
              <TableRow key={set._id}>
                <TableCell className="font-medium">{set.name}</TableCell>
                <TableCell>{set.durationMinutes} min</TableCell>
                <TableCell>{set.totalMarks}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    set.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {set.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/sets/${set._id}/questions`)}>
                      <FileQuestion className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/sets/${set._id}/edit`)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(set._id)}>
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

