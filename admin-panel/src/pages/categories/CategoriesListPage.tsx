import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { SearchInput } from '../../components/ui/search-input'
import { Pagination } from '../../components/ui/pagination'
import { Loader } from '../../components/ui/loader'
import { DeleteConfirmationDialog } from '../../components/ui/delete-confirmation-dialog'
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react'

export default function CategoriesListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)
  const pageSize = 10

  const { data, isLoading } = useQuery({
    queryKey: ['categories', search, page, pageSize],
    queryFn: async () => {
      const response = await api.get('/admin/categories', {
        params: {
          search: search || undefined,
          page,
          limit: pageSize,
        },
      })
      const result = response.data.data
      return {
        categories: result.categories || result || [],
        total: result.total || (result.categories || result || []).length,
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/categories/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
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

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const categories = data?.categories || []
  const total = data?.total || categories.length

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <Button onClick={() => navigate('/categories/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
        
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search categories by name..."
            className="max-w-md"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-900">Name</TableHead>
              <TableHead className="font-semibold text-gray-900">Price</TableHead>
              <TableHead className="font-semibold text-gray-900">Sets</TableHead>
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
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category: any) => (
                <TableRow key={category._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">{category.name}</TableCell>
                  <TableCell className="text-gray-900">₹{category.price}</TableCell>
                  <TableCell className="text-gray-700">{category.totalSetsCount || 0}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/categories/${category._id}/sets`)}>
                        <BookOpen className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/categories/${category._id}/edit`)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(category._id, category.name)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {!isLoading && total > pageSize && (
          <div className="p-4 border-t border-gray-200">
            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              onChange={setPage}
            />
          </div>
        )}
      </div>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        itemName={itemToDelete?.name}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

