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
import { Plus, Edit, Trash2 } from 'lucide-react'

export default function BannersListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)
  const pageSize = 10

  const { data, isLoading } = useQuery({
    queryKey: ['banners', search, page, pageSize],
    queryFn: async () => {
      const response = await api.get('/admin/banners', {
        params: {
          search: search || undefined,
          page,
          limit: pageSize,
        },
      })
      return response.data.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/banners/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
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
    setPage(1) // Reset to first page on search
  }

  const banners = data?.banners || data || []
  const total = data?.total || banners.length

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Banners</h1>
          <Button onClick={() => navigate('/banners/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Banner
          </Button>
        </div>
        
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search banners by title..."
            className="max-w-md"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-900">Image</TableHead>
              <TableHead className="font-semibold text-gray-900">Title</TableHead>
              <TableHead className="font-semibold text-gray-900">Active</TableHead>
              <TableHead className="font-semibold text-gray-900">Sort Order</TableHead>
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
            ) : banners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                  No banners found
                </TableCell>
              </TableRow>
            ) : (
              banners.map((banner: any) => (
                <TableRow key={banner._id} className="hover:bg-gray-50">
                  <TableCell>
                    <img src={banner.imageUrl} alt={banner.title} className="w-20 h-12 object-cover rounded" />
                  </TableCell>
                  <TableCell className="text-gray-900">{banner.title || '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-900">{banner.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/banners/${banner._id}/edit`)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(banner._id, banner.title || 'Banner')}>
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
        title="Delete Banner"
        itemName={itemToDelete?.name}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

