import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Loader } from '../../components/ui/loader'
import { DeleteConfirmationDialog } from '../../components/ui/delete-confirmation-dialog'
import { Plus, Edit, Trash2, FileQuestion } from 'lucide-react'

export default function CategorySetsPage() {
  const { id: categoryId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)

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
        <h1 className="text-3xl font-bold text-gray-900">Test Sets</h1>
        <Button onClick={() => navigate(`/categories/${categoryId}/sets/new`)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Test Set
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-900">Name</TableHead>
              <TableHead className="font-semibold text-gray-900">Duration</TableHead>
              <TableHead className="font-semibold text-gray-900">Total Marks</TableHead>
              <TableHead className="font-semibold text-gray-900">Active</TableHead>
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
                  No test sets found
                </TableCell>
              </TableRow>
            ) : (
              data.map((set: any) => (
                <TableRow key={set._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">{set.name}</TableCell>
                  <TableCell className="text-gray-700">{set.durationMinutes} min</TableCell>
                  <TableCell className="text-gray-700">{set.totalMarks}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
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
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(set._id, set.name)}>
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
        title="Delete Test Set"
        itemName={itemToDelete?.name}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

