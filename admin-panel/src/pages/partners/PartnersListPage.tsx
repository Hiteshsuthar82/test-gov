import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Button } from '../../components/ui/button'
import { SearchInput } from '../../components/ui/search-input'
import { Loader } from '../../components/ui/loader'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'

interface Partner {
  _id: string
  name: string
  businessName: string
  mobile: string
  code: string
  discountPercentage: number
  isActive: boolean
}

export default function PartnersListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null)

  const { data: partners, isLoading } = useQuery({
    queryKey: ['partners', search],
    queryFn: async () => {
      const response = await api.get('/admin/partners')
      let partnersData = response.data.data?.partners || []
      
      if (search) {
        const searchLower = search.toLowerCase()
        partnersData = partnersData.filter((p: Partner) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.businessName.toLowerCase().includes(searchLower) ||
          p.code.toLowerCase().includes(searchLower) ||
          p.mobile.includes(search)
        )
      }
      
      return partnersData
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/partners/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      setDeleteDialogOpen(false)
      setPartnerToDelete(null)
    },
  })

  const handleDelete = (partner: Partner) => {
    setPartnerToDelete(partner)
    setDeleteDialogOpen(true)
  }

  const handleViewUsers = (partnerId: string) => {
    navigate(`/users?partnerId=${partnerId}`)
  }

  const handleViewSubscriptions = (partnerId: string) => {
    navigate(`/subscriptions?partnerId=${partnerId}`)
  }

  const handleViewPayments = (partnerId: string) => {
    navigate(`/payments?partnerId=${partnerId}`)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Partners</h1>
          <Button onClick={() => navigate('/partners/new')}>
            Add New Partner
          </Button>
        </div>
        
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search partners by name, business, code, or mobile..."
            className="max-w-md"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-900">Name</TableHead>
              <TableHead className="font-semibold text-gray-900">Business Name</TableHead>
              <TableHead className="font-semibold text-gray-900">Mobile</TableHead>
              <TableHead className="font-semibold text-gray-900">Code</TableHead>
              <TableHead className="font-semibold text-gray-900">Discount %</TableHead>
              <TableHead className="font-semibold text-gray-900">Status</TableHead>
              <TableHead className="font-semibold text-gray-900">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Loader inline />
                </TableCell>
              </TableRow>
            ) : !partners || partners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                  No partners found
                </TableCell>
              </TableRow>
            ) : (
              partners.map((partner: Partner) => (
                <TableRow key={partner._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">{partner.name}</TableCell>
                  <TableCell className="text-gray-700">{partner.businessName}</TableCell>
                  <TableCell className="text-gray-700">{partner.mobile}</TableCell>
                  <TableCell className="text-gray-700 font-mono">{partner.code}</TableCell>
                  <TableCell className="text-gray-700">{partner.discountPercentage}%</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      partner.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {partner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/partners/${partner._id}/edit`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewUsers(partner._id)}
                      >
                        View Users
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewSubscriptions(partner._id)}
                      >
                        View Subscriptions
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPayments(partner._id)}
                      >
                        View Payments
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(partner)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Partner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {partnerToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setPartnerToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => partnerToDelete && deleteMutation.mutate(partnerToDelete._id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

