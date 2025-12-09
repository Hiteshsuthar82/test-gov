import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Button } from '../../components/ui/button'
import { SearchInput } from '../../components/ui/search-input'
import { Select } from '../../components/ui/select'
import { Pagination } from '../../components/ui/pagination'
import { Loader } from '../../components/ui/loader'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { FiAward, FiRefreshCw, FiTrash2 } from 'react-icons/fi'

export default function LeaderboardListPage() {
  const queryClient = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTestSet, setSelectedTestSet] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [recalculateDialogOpen, setRecalculateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<any>(null)
  const pageSize = 20

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/admin/categories')
      const result = response.data.data
      return result.categories || result || []
    },
  })

  // Fetch test sets for selected category
  const { data: testSetsData } = useQuery({
    queryKey: ['testSets', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return []
      const response = await api.get(`/admin/sets/categories/${selectedCategory}/sets`)
      return response.data.data || []
    },
    enabled: !!selectedCategory,
  })

  // Fetch leaderboard
  const { data, isLoading } = useQuery({
    queryKey: ['admin-leaderboard', selectedCategory, selectedTestSet, search, page, pageSize],
    queryFn: async () => {
      const params: any = {
        page,
        limit: pageSize,
      }
      if (selectedCategory) {
        params.categoryId = selectedCategory
      }
      if (selectedTestSet) {
        params.testSetId = selectedTestSet
      }
      if (search) {
        params.search = search
      }
      const response = await api.get('/admin/leaderboard', { params })
      return response.data.data
    },
    enabled: !!selectedCategory,
  })

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      await api.post('/admin/leaderboard/recalculate', {
        categoryId: selectedCategory,
        testSetId: selectedTestSet || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leaderboard'] })
      setRecalculateDialogOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/leaderboard/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leaderboard'] })
      setDeleteDialogOpen(false)
      setEntryToDelete(null)
    },
  })

  const handleDelete = (entry: any) => {
    setEntryToDelete(entry)
    setDeleteDialogOpen(true)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  const leaderboard = data?.leaderboard || []
  const total = data?.pagination?.total || 0

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
          {selectedCategory && (
            <Button
              onClick={() => setRecalculateDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <FiRefreshCw className="mr-2" />
              Recalculate Ranks
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <Select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setSelectedTestSet('')
                setPage(1)
              }}
              className="w-full"
            >
              <option value="">All Categories</option>
              {categoriesData?.map((cat: any) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          {selectedCategory && testSetsData && testSetsData.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Set
              </label>
              <Select
                value={selectedTestSet}
                onChange={(e) => {
                  setSelectedTestSet(e.target.value)
                  setPage(1)
                }}
                className="w-full"
              >
                <option value="">All Test Sets</option>
                {testSetsData.map((set: any) => (
                  <option key={set._id} value={set._id}>
                    {set.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by user name or email..."
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-900">Rank</TableHead>
              <TableHead className="font-semibold text-gray-900">User</TableHead>
              <TableHead className="font-semibold text-gray-900">Category</TableHead>
              <TableHead className="font-semibold text-gray-900">Test Set</TableHead>
              <TableHead className="font-semibold text-gray-900 text-right">Score</TableHead>
              <TableHead className="font-semibold text-gray-900 text-right">Time</TableHead>
              <TableHead className="font-semibold text-gray-900">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!selectedCategory ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                  Please select a category to view leaderboard
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Loader inline />
                </TableCell>
              </TableRow>
            ) : leaderboard.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                  No leaderboard entries found
                </TableCell>
              </TableRow>
            ) : (
              leaderboard.map((entry: any) => (
                <TableRow key={entry._id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {entry.rank <= 3 && (
                        <FiAward className={`w-5 h-5 ${
                          entry.rank === 1 ? 'text-yellow-500' :
                          entry.rank === 2 ? 'text-gray-400' :
                          'text-amber-600'
                        }`} />
                      )}
                      <span className="font-semibold text-gray-900">#{entry.rank}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{entry.userId?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{entry.userId?.email || ''}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-700">{entry.categoryId?.name || '-'}</TableCell>
                  <TableCell className="text-gray-700">{entry.testSetId?.name || 'All Sets'}</TableCell>
                  <TableCell className="text-right font-semibold text-gray-900">{entry.bestScore}</TableCell>
                  <TableCell className="text-right text-gray-700">
                    {formatTime(entry.bestAttemptId?.totalTimeSeconds || 0)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(entry)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <FiTrash2 className="w-4 h-4" />
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

      {/* Recalculate Ranks Dialog */}
      <Dialog open={recalculateDialogOpen} onOpenChange={setRecalculateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recalculate Ranks</DialogTitle>
            <DialogDescription>
              This will recalculate all ranks for the selected category{selectedTestSet ? ' and test set' : ''}. This action may take a few moments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRecalculateDialogOpen(false)}
              disabled={recalculateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => recalculateMutation.mutate()}
              disabled={recalculateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {recalculateMutation.isPending ? 'Recalculating...' : 'Recalculate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Entry Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Leaderboard Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the entry for {entryToDelete?.userId?.name}? This will also recalculate ranks for remaining entries.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setEntryToDelete(null)
              }}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => entryToDelete && deleteMutation.mutate(entryToDelete._id)}
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

