import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Button } from '../../components/ui/button'
import { SearchInput } from '../../components/ui/search-input'
import { Pagination } from '../../components/ui/pagination'
import { Loader } from '../../components/ui/loader'
import { Select } from '../../components/ui/select'
import { Eye } from 'lucide-react'

export default function UsersListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
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
    queryKey: ['users', search, page, pageSize, selectedPartnerId],
    queryFn: async () => {
      const response = await api.get('/admin/users', {
        params: { 
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

  const users = data?.users || []
  const total = data?.total || users.length

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        </div>
        
        <div className="mb-4 flex gap-4">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search users by name, email, or mobile..."
            className="max-w-md"
          />
          <Select
            value={selectedPartnerId}
            onChange={handlePartnerChange}
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
              <TableHead className="font-semibold text-gray-900">Name</TableHead>
              <TableHead className="font-semibold text-gray-900">Email</TableHead>
              <TableHead className="font-semibold text-gray-900">Mobile</TableHead>
              <TableHead className="font-semibold text-gray-900">Preparing For</TableHead>
              <TableHead className="font-semibold text-gray-900">Status</TableHead>
              <TableHead className="font-semibold text-gray-900">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Loader inline />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: any) => (
                <TableRow key={user._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">{user.name}</TableCell>
                  <TableCell className="text-gray-700">{user.email}</TableCell>
                  <TableCell className="text-gray-700">{user.mobile}</TableCell>
                  <TableCell className="text-gray-700">{user.preparingForExam || '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/users/${user._id}`)}>
                      <Eye className="w-4 h-4" />
                    </Button>
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
    </div>
  )
}

