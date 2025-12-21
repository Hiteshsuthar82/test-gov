import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Loader } from '../../components/ui/loader'
import { ArrowLeft, Save } from 'lucide-react'
import { ImageUpload } from '../../components/ui/image-upload'

interface TimePeriod {
  months: number
  price: number
  originalPrice: number
}

interface ComboOfferFormData {
  name: string
  description: string
  imageUrl: string
  categoryIds: string[]
  price: number
  originalPrice: number
  timePeriods: TimePeriod[]
  benefits: string[]
  validFrom: string
  validTo: string
  isActive: boolean
}

export default function ComboOfferFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id
  const [benefits, setBenefits] = useState<string[]>([''])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [timePeriods, setTimePeriods] = useState<Array<{ months: number; price: number; originalPrice: number }>>([
    { months: 1, price: 0, originalPrice: 0 }
  ])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ComboOfferFormData>({
    defaultValues: {
      name: '',
      description: '',
      imageUrl: '',
      categoryIds: [],
      price: 0,
      originalPrice: 0,
      benefits: [],
      validFrom: '',
      validTo: '',
      isActive: true,
    },
  })

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/admin/categories', { params: { limit: 1000 } })
      const result = response.data.data
      return result.categories || result || []
    },
  })

  // Fetch combo offer if editing
  const { data: comboOffer, isLoading: isLoadingOffer } = useQuery({
    queryKey: ['comboOffer', id],
    queryFn: async () => {
      const response = await api.get(`/admin/combo-offers/${id}`)
      return response.data.data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (comboOffer) {
      setValue('name', comboOffer.name || '')
      setValue('description', comboOffer.description || '')
      setValue('imageUrl', comboOffer.imageUrl || '')
      setValue('price', comboOffer.price || 0)
      setValue('originalPrice', comboOffer.originalPrice || 0)
      setValue('isActive', comboOffer.isActive ?? true)
      setValue('validFrom', comboOffer.validFrom ? new Date(comboOffer.validFrom).toISOString().split('T')[0] : '')
      setValue('validTo', comboOffer.validTo ? new Date(comboOffer.validTo).toISOString().split('T')[0] : '')
      
      if (comboOffer.categoryIds) {
        const categoryIds = comboOffer.categoryIds.map((cat: any) => cat._id || cat)
        setSelectedCategories(categoryIds)
        setValue('categoryIds', categoryIds)
      }
      
      if (comboOffer.benefits && comboOffer.benefits.length > 0) {
        setBenefits(comboOffer.benefits)
      }
      
      if (comboOffer.timePeriods && comboOffer.timePeriods.length > 0) {
        setTimePeriods(comboOffer.timePeriods)
      } else if (comboOffer.price && comboOffer.originalPrice) {
        // Backward compatibility: create a default time period from old price
        setTimePeriods([{ months: 12, price: comboOffer.price, originalPrice: comboOffer.originalPrice }])
      }
    }
  }, [comboOffer, setValue])

  const mutation = useMutation({
    mutationFn: async (data: ComboOfferFormData) => {
      if (isEdit) {
        return api.put(`/admin/combo-offers/${id}`, data)
      } else {
        return api.post('/admin/combo-offers', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comboOffers'] })
      navigate('/combo-offers')
    },
  })

  const onSubmit = (data: ComboOfferFormData) => {
    const submitData = {
      ...data,
      categoryIds: selectedCategories,
      timePeriods: timePeriods.filter(tp => tp.months > 0 && tp.price > 0),
      benefits: benefits.filter(b => b.trim() !== ''),
    }
    mutation.mutate(submitData)
  }

  const handleTimePeriodChange = (index: number, field: 'months' | 'price' | 'originalPrice', value: number) => {
    const newPeriods = [...timePeriods]
    newPeriods[index] = { ...newPeriods[index], [field]: value }
    setTimePeriods(newPeriods)
  }

  const addTimePeriod = () => {
    setTimePeriods([...timePeriods, { months: 1, price: 0, originalPrice: 0 }])
  }

  const removeTimePeriod = (index: number) => {
    if (timePeriods.length > 1) {
      setTimePeriods(timePeriods.filter((_, i) => i !== index))
    }
  }

  const handleCategoryToggle = (categoryId: string) => {
    const newSelected = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId]
    setSelectedCategories(newSelected)
    setValue('categoryIds', newSelected)
  }

  const handleBenefitChange = (index: number, value: string) => {
    const newBenefits = [...benefits]
    newBenefits[index] = value
    setBenefits(newBenefits)
  }

  const addBenefit = () => {
    setBenefits([...benefits, ''])
  }

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index))
  }

  const categories = categoriesData || []

  if (isEdit && isLoadingOffer) {
    return <Loader />
  }

  return (
    <div>
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate('/combo-offers')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEdit ? 'Edit Combo Offer' : 'Create Combo Offer'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              className="mt-1"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="isActive">Status</Label>
            <select
              id="isActive"
              {...register('isActive', { valueAsBoolean: true })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            className="mt-1"
            rows={3}
          />
        </div>

        <div>
          <Label>Image</Label>
          <ImageUpload
            value={watch('imageUrl')}
            onChange={(url) => setValue('imageUrl', url)}
            folder="combo-offers"
          />
        </div>

        <div>
          <Label>Categories *</Label>
          <div className="mt-2 border rounded-lg p-4 max-h-60 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-gray-500 text-sm">No categories available</p>
            ) : (
              <div className="space-y-2">
                {categories.map((category: any) => (
                  <label
                    key={category._id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category._id)}
                      onChange={() => handleCategoryToggle(category._id)}
                      className="w-4 h-4"
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {selectedCategories.length === 0 && (
            <p className="text-red-500 text-sm mt-1">At least one category is required</p>
          )}
        </div>

        {/* Time Periods */}
        <div>
          <Label>Time Periods *</Label>
          <p className="text-sm text-gray-500 mb-2">Add different duration options with pricing</p>
          <div className="space-y-3">
            {timePeriods.map((period, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-700">Period {index + 1}</span>
                  {timePeriods.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTimePeriod(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`period-months-${index}`}>Duration (Months) *</Label>
                    <Input
                      id={`period-months-${index}`}
                      type="number"
                      min="1"
                      value={period.months}
                      onChange={(e) => handleTimePeriodChange(index, 'months', parseInt(e.target.value) || 1)}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`period-price-${index}`}>Price (₹) *</Label>
                    <Input
                      id={`period-price-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={period.price}
                      onChange={(e) => handleTimePeriodChange(index, 'price', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`period-originalPrice-${index}`}>Original Price (₹) *</Label>
                    <Input
                      id={`period-originalPrice-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={period.originalPrice}
                      onChange={(e) => handleTimePeriodChange(index, 'originalPrice', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addTimePeriod}>
              Add Time Period
            </Button>
          </div>
          {timePeriods.length === 0 && (
            <p className="text-red-500 text-sm mt-1">At least one time period is required</p>
          )}
        </div>

        {/* Legacy Price Fields (Optional, for backward compatibility) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="price">Default Price (₹) - Optional</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...register('price', { valueAsNumber: true, min: 0 })}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">For backward compatibility only</p>
          </div>

          <div>
            <Label htmlFor="originalPrice">Default Original Price (₹) - Optional</Label>
            <Input
              id="originalPrice"
              type="number"
              step="0.01"
              {...register('originalPrice', { valueAsNumber: true, min: 0 })}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">For backward compatibility only</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="validFrom">Valid From (Optional)</Label>
            <Input
              id="validFrom"
              type="date"
              {...register('validFrom')}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="validTo">Valid To (Optional)</Label>
            <Input
              id="validTo"
              type="date"
              {...register('validTo')}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label>Benefits</Label>
          <div className="mt-2 space-y-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={benefit}
                  onChange={(e) => handleBenefitChange(index, e.target.value)}
                  placeholder="Enter benefit"
                  className="flex-1"
                />
                {benefits.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeBenefit(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addBenefit} className="mt-2">
              Add Benefit
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/combo-offers')}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending || selectedCategories.length === 0 || timePeriods.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  )
}

