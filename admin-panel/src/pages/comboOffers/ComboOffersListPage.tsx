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
import { Select } from '../../components/ui/select'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'

export default function ComboOffersListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState<string>('')
  const [page, setPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)
  const pageSize = 10

  const { data, isLoading } = useQuery({
    queryKey: ['comboOffers', search, isActive, page, pageSize],
    queryFn: async () => {
      const response = await api.get('/admin/combo-offers', {
        params: {
          search: search || undefined,
          isActive: isActive || undefined,
          page,
          limit: pageSize,
        },
      })
      return response.data.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/combo-offers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comboOffers'] })
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

  const handleStatusChange = (value: string) => {
    setIsActive(value)
    setPage(1)
  }

  const comboOffers = data?.comboOffers || []
  const total = data?.pagination?.total || comboOffers.length
  const totalPages = data?.pagination?.pages || Math.ceil(total / pageSize)

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Combo Offers</h1>
          <Button onClick={() => navigate('/combo-offers/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Combo Offer
          </Button>
        </div>
        
        <div className="mb-4 flex gap-4">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search combo offers..."
            className="max-w-md"
          />
          <Select 
            value={isActive} 
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-48"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="bg-white rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Original Price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid From</TableHead>
                <TableHead>Valid To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comboOffers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No combo offers found
                  </TableCell>
                </TableRow>
              ) : (
                comboOffers.map((offer: any) => {
                  const discount = offer.originalPrice > 0
                    ? Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100)
                    : 0
                  const categoryNames = offer.categoryIds?.map((cat: any) => cat.name).join(', ') || 'N/A'
                  
                  return (
                    <TableRow key={offer._id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{offer.name}</TableCell>
                      <TableCell className="max-w-xs truncate" title={categoryNames}>
                        {categoryNames}
                      </TableCell>
                      <TableCell>₹{offer.price}</TableCell>
                      <TableCell>₹{offer.originalPrice}</TableCell>
                      <TableCell>
                        {discount > 0 ? (
                          <span className="text-green-600 font-semibold">{discount}%</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            offer.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {offer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {offer.validFrom
                          ? new Date(offer.validFrom).toLocaleDateString()
                          : 'No limit'}
                      </TableCell>
                      <TableCell>
                        {offer.validTo
                          ? new Date(offer.validTo).toLocaleDateString()
                          : 'No limit'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/combo-offers/${offer._id}/edit`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(offer._id, offer.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Combo Offer"
        itemName={itemToDelete?.name}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

