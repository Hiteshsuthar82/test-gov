import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Select } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { SearchInput } from '../../components/ui/search-input'
import { Pagination } from '../../components/ui/pagination'
import { Loader } from '../../components/ui/loader'

export default function SubscriptionsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(searchParams.get('partnerId') || '')
  const pageSize = 20

  // Fetch partners for filter dropdown
  const { data: partnersData } = useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const response = await api.get('/admin/partners')
      return response.data.data?.partners || []
    },
  })

  useEffect(() => {
    const partnerId = searchParams.get('partnerId')
    if (partnerId) {
      setSelectedPartnerId(partnerId)
    }
  }, [searchParams])

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', status, search, page, pageSize, selectedPartnerId],
    queryFn: async () => {
      const response = await api.get('/admin/subscriptions', {
        params: { 
          status: status || undefined, 
          search: search || undefined,
          page, 
          limit: pageSize,
          partnerId: selectedPartnerId || undefined,
        },
      })
      return response.data.data
    },
  })

  const handlePartnerChange = (partnerId: string) => {
    setSelectedPartnerId(partnerId)
    setPage(1)
    if (partnerId) {
      setSearchParams({ partnerId })
    } else {
      setSearchParams({})
    }
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const subscriptions = data?.subscriptions || []
  const total = data?.total || subscriptions.length

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Subscriptions</h1>
          <Select 
            value={status} 
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-48"
          >
            <option value="">All Status</option>
            <option value="PENDING_REVIEW">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>
        
        <div className="mb-4 flex gap-4">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search subscriptions by user name or category..."
            className="max-w-md"
          />
          <Select
            value={selectedPartnerId}
            onChange={(e) => handlePartnerChange(e.target.value)}
            placeholder="Filter by Partner"
            className="max-w-xs"
          >
            <option value="">All Partners</option>
            {partnersData?.map((partner: any) => (
              <option key={partner._id} value={partner._id}>
                {partner.name} ({partner.code})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-900">User</TableHead>
              <TableHead className="font-semibold text-gray-900">Category</TableHead>
              <TableHead className="font-semibold text-gray-900">Status</TableHead>
              <TableHead className="font-semibold text-gray-900">Start Date</TableHead>
              <TableHead className="font-semibold text-gray-900">End Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Loader inline />
                </TableCell>
              </TableRow>
            ) : subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                  No subscriptions found
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((sub: any) => (
                <TableRow key={sub._id} className="hover:bg-gray-50">
                  <TableCell className="text-gray-900">{sub.userId?.name}</TableCell>
                  <TableCell className="text-gray-700">
                    {sub.isComboOffer ? (
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                            COMBO
                          </span>
                          {sub.comboOfferDetails?.name || 'Combo Offer'}
                        </div>
                        {sub.selectedDurationMonths && (
                          <div className="text-xs text-gray-500 mt-1">
                            Duration: {sub.selectedDurationMonths} {sub.selectedDurationMonths === 1 ? 'Month' : 'Months'}
                          </div>
                        )}
                        {sub.comboOfferDetails?.categoryIds && sub.comboOfferDetails.categoryIds.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Includes: {sub.comboOfferDetails.categoryIds.map((cat: any) => cat.name || cat).join(', ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>{sub.categoryId?.name || 'N/A'}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      sub.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      sub.status === 'PENDING_REVIEW' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sub.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-700">{sub.startsAt ? new Date(sub.startsAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-gray-700">{sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '-'}</TableCell>
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
    </div>
  )
}

