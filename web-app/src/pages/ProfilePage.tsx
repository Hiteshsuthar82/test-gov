import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { FiUser, FiMail, FiPhone, FiBook, FiEdit2, FiLogOut, FiChevronRight, FiCalendar, FiCheckCircle, FiClock } from 'react-icons/fi'
import { FileUpload } from '@/components/ui/file-upload'

export default function ProfilePage() {
  const { user, setAuth, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: user?.name || '',
    preparingForExam: user?.preparingForExam || '',
  })
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(user?.profileImageUrl || null)

  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/me')
      return response.data.data
    },
  })

  const { data: attempts } = useQuery({
    queryKey: ['user-attempts'],
    queryFn: async () => {
      const response = await api.get('/attempts')
      return response.data.data
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.patch('/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data.data
    },
    onSuccess: (data) => {
      const currentToken = useAuthStore.getState().token
      if (currentToken) {
        setAuth(data, currentToken)
      }
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      setIsEditDialogOpen(false)
      setProfileImageFile(null)
      setProfileImagePreview(data.profileImageUrl || null)
    },
  })

  const handleEditProfile = () => {
    setEditFormData({
      name: user?.name || '',
      preparingForExam: user?.preparingForExam || '',
    })
    setProfileImageFile(null)
    setProfileImagePreview(user?.profileImageUrl || null)
    setIsEditDialogOpen(true)
  }

  const handleSaveProfile = async () => {
    const formData = new FormData()
    formData.append('name', editFormData.name)
    if (editFormData.preparingForExam) {
      formData.append('preparingForExam', editFormData.preparingForExam)
    }
    if (profileImageFile) {
      formData.append('profileImage', profileImageFile)
    }

    updateProfileMutation.mutate(formData)
  }

  const handleImageChange = (file: File | null) => {
    setProfileImageFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setProfileImagePreview(user?.profileImageUrl || null)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Mobile Header */}
          <div className="lg:hidden mb-6">
            <h1 className="text-2xl font-semibold text-slate-800 text-center">Profile</h1>
          </div>

          {/* Profile Header Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:p-8 mb-6 lg:mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Profile Picture */}
                <div className="relative">
                  <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                    {profileImagePreview ? (
                      <img
                        src={profileImagePreview}
                        alt={user?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FiUser className="w-12 h-12 lg:w-16 lg:h-16 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl lg:text-3xl font-semibold text-slate-800 mb-2">
                    {user?.name || 'User'}
                  </h2>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 flex items-center justify-center sm:justify-start gap-2">
                      <FiMail className="w-4 h-4" />
                      <a href={`mailto:${user?.email}`} className="hover:text-slate-700">
                        {user?.email}
                      </a>
                    </p>
                    <p className="text-sm text-slate-500 flex items-center justify-center sm:justify-start gap-2">
                      <FiPhone className="w-4 h-4" />
                      {user?.mobile}
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit Button */}
              <Button
                onClick={handleEditProfile}
                variant="outline"
                className="border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400"
              >
                <FiEdit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Information Cards Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {/* Preparing For Exam Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:p-6 hover:shadow-md transition-shadow">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">
                Preparing For Exam
              </p>
              <p className="text-xl lg:text-2xl font-medium text-slate-800">
                {user?.preparingForExam || 'Not selected'}
              </p>
            </div>

            {/* Member Since Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:p-6 hover:shadow-md transition-shadow">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">
                Member Since
              </p>
              <p className="text-xl lg:text-2xl font-medium text-slate-800">
                {formatDate(user?.createdAt)}
              </p>
            </div>
          </div>

          {/* Subscriptions Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:p-8 mb-6 lg:mb-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">My Subscriptions</h3>
            {subscriptionsLoading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : subscriptions?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subscriptions.map((sub: any) => (
                  <div
                    key={sub._id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                  >
                    <h4 className="font-medium text-slate-800 mb-2">{sub.categoryId?.name || 'Category'}</h4>
                    <div className="flex items-center gap-2">
                      {sub.status === 'APPROVED' ? (
                        <>
                          <FiCheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-600 font-medium">Active</span>
                        </>
                      ) : (
                        <>
                          <FiClock className="w-4 h-4 text-amber-600" />
                          <span className="text-sm text-amber-600 font-medium">Pending</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No subscriptions yet. Browse categories to subscribe.
              </div>
            )}
          </div>

          {/* Security & Settings Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:p-8 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Security & Settings</h3>
            <div className="space-y-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-slate-50 transition-colors text-left border border-slate-200 hover:border-slate-300"
              >
                <div className="flex items-center gap-3">
                  <FiLogOut className="w-5 h-5 text-slate-600" />
                  <span className="font-medium text-slate-800">Logout</span>
                </div>
                <FiChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Edit Profile Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[90vh]">
            {/* Fixed Header */}
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 flex-shrink-0">
              <DialogTitle className="text-slate-800">Edit Profile</DialogTitle>
              <DialogDescription className="text-slate-500">
                Update your profile information
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                {/* Profile Image Upload */}
                <div>
                  <Label className="text-slate-700 mb-2 block">Profile Picture</Label>
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                        {profileImagePreview ? (
                          <img
                            src={profileImagePreview}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiUser className="w-10 h-10 text-slate-400" />
                        )}
                      </div>
                    </div>
                    <FileUpload
                      value={profileImageFile}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <Label htmlFor="name" className="text-slate-700">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="mt-1.5 border-slate-300 focus:border-slate-500"
                  />
                </div>

                {/* Preparing For Exam Input */}
                <div>
                  <Label htmlFor="preparingForExam" className="text-slate-700">
                    Preparing For Exam
                  </Label>
                  <Input
                    id="preparingForExam"
                    value={editFormData.preparingForExam}
                    onChange={(e) => setEditFormData({ ...editFormData, preparingForExam: e.target.value })}
                    placeholder="e.g., SSC, UPSC, Banking"
                    className="mt-1.5 border-slate-300 focus:border-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <DialogFooter className="px-6 py-4 border-t border-slate-200 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-slate-300 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="bg-slate-800 hover:bg-slate-900 text-white"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}
