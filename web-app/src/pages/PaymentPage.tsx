import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Layout from '@/components/layout/Layout'
import { FileUpload } from '@/components/ui/file-upload'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { FiCheckCircle, FiArrowLeft, FiCreditCard, FiClock } from 'react-icons/fi'

interface PaymentFormData {
  payerName: string
  payerUpiId: string
  upiTransactionId: string
  screenshotFile: File | null
}

export default function PaymentPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [countdown, setCountdown] = useState(10)
  
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    defaultValues: {
      payerName: '',
      payerUpiId: '',
      upiTransactionId: '',
      screenshotFile: null,
    },
  })

  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      const response = await api.get(`/categories/${categoryId}/details`)
      return response.data.data
    },
    enabled: !!categoryId,
  })
  const category = categoryData?.category

  const paymentMutation = useMutation({
    mutationFn: async (formDataToSend: FormData) => {
      return api.post('/payments', formDataToSend)
    },
    onSuccess: () => {
      setShowSuccessModal(true)
      setCountdown(10)
    },
  })

  // Auto-redirect after 10 seconds
  useEffect(() => {
    if (showSuccessModal && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (showSuccessModal && countdown === 0) {
      navigate('/subscriptions')
    }
  }, [showSuccessModal, countdown, navigate])

  const handleRedirect = () => {
    navigate('/subscriptions')
  }

  const onSubmit = async (data: PaymentFormData) => {
    if (!data.screenshotFile) {
      return
    }

    const formDataToSend = new FormData()
    formDataToSend.append('categoryId', categoryId || '')
    formDataToSend.append('amount', (category?.price || 0).toString())
    formDataToSend.append('payerName', data.payerName)
    formDataToSend.append('payerUpiId', data.payerUpiId)
    if (data.upiTransactionId) {
      formDataToSend.append('upiTransactionId', data.upiTransactionId)
    }

    formDataToSend.append('screenshot', data.screenshotFile)

    paymentMutation.mutate(formDataToSend)
  }

  const { data: paymentConfig } = useQuery({
    queryKey: ['paymentConfig'],
    queryFn: async () => {
      const response = await api.get('/payments/config')
      return response.data.data
    },
  })

  const upiId = paymentConfig?.upiId || 'your-upi@paytm'
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`upi://pay?pa=${upiId}&am=${category?.price || 0}&cu=INR&tn=TestPrep-${category?.name || 'Category'}`)}`

  if (categoryLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">Loading...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Success Modal */}
      <Dialog open={showSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
              <FiCheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="text-center text-2xl text-gray-900">
              Payment Submitted Successfully!
            </DialogTitle>
            <DialogDescription className="text-center mt-2">
              Your payment request has been submitted and is pending admin review.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <FiCheckCircle className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>Your payment will be reviewed by our admin team</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>Review typically takes 24-48 hours</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>You'll receive a notification once your subscription is approved</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>Once approved, you'll have full access to all test series in this category</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Please keep your payment screenshot handy in case we need to verify the transaction.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 pt-2">
              <FiClock className="w-4 h-4" />
              <span>Redirecting to subscriptions page in {countdown} seconds...</span>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              onClick={handleRedirect}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Go to Subscriptions Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to={`/categories/${categoryId}`} className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-6">
          <FiArrowLeft className="mr-2" />
          Back to Category
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Subscribe to {category?.name}</CardTitle>
            <CardDescription>
              Complete the payment to get access to all test series in this category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Payment Details */}
              <div>
                <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-semibold">{category?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Amount:</span>
                    <span className="text-2xl font-bold text-purple-600">₹{category?.price}</span>
                  </div>
                </div>

                {/* QR Code */}
                <div className="mb-6 p-6 bg-gray-50 rounded-lg text-center">
                  <FiCreditCard className="w-8 h-8 text-purple-600 mx-auto mb-4" />
                  <p className="text-sm font-medium mb-3">Scan QR Code to Pay</p>
                  <img
                    src={qrCodeUrl}
                    alt="UPI QR Code"
                    className="mx-auto border-2 border-gray-200 rounded-lg p-2 bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-3">
                    UPI ID: {upiId}
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="payerName">
                      Your Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="payerName"
                      {...register('payerName', {
                        required: 'Your name is required',
                        minLength: {
                          value: 2,
                          message: 'Name must be at least 2 characters',
                        },
                        pattern: {
                          value: /^[a-zA-Z\s]+$/,
                          message: 'Name should only contain letters and spaces',
                        },
                      })}
                      placeholder="Enter your name"
                      className={errors.payerName ? 'border-red-500' : ''}
                    />
                    {errors.payerName && (
                      <p className="text-sm text-red-500 mt-1">{errors.payerName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="payerUpiId">
                      Your UPI ID <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="payerUpiId"
                      {...register('payerUpiId', {
                        required: 'UPI ID is required',
                        pattern: {
                          value: /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/,
                          message: 'Please enter a valid UPI ID (e.g., yourname@paytm)',
                        },
                      })}
                      placeholder="yourname@paytm"
                      className={errors.payerUpiId ? 'border-red-500' : ''}
                    />
                    {errors.payerUpiId && (
                      <p className="text-sm text-red-500 mt-1">{errors.payerUpiId.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="upiTransactionId">Transaction ID (Optional)</Label>
                    <Input
                      id="upiTransactionId"
                      {...register('upiTransactionId', {
                        pattern: {
                          value: /^[a-zA-Z0-9]+$/,
                          message: 'Transaction ID should only contain letters and numbers',
                        },
                      })}
                      placeholder="Enter transaction ID if available"
                      className={errors.upiTransactionId ? 'border-red-500' : ''}
                    />
                    {errors.upiTransactionId && (
                      <p className="text-sm text-red-500 mt-1">{errors.upiTransactionId.message}</p>
                    )}
                  </div>

                  <div>
                    <Controller
                      name="screenshotFile"
                      control={control}
                      rules={{
                        required: 'Payment screenshot is required',
                        validate: (value) => {
                          if (!value) {
                            return 'Please upload payment screenshot'
                          }
                          if (value && value.size > 5 * 1024 * 1024) {
                            return 'File size must be less than 5MB'
                          }
                          if (value && !value.type.startsWith('image/')) {
                            return 'Please upload an image file'
                          }
                          return true
                        },
                      }}
                      render={({ field }) => (
                        <div>
                          <FileUpload
                            value={field.value || null}
                            onChange={(file) => {
                              field.onChange(file)
                            }}
                            label="Upload payment screenshot"
                            required
                          />
                          {errors.screenshotFile && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.screenshotFile.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={paymentMutation.isPending || isSubmitting}
                  >
                    {paymentMutation.isPending || isSubmitting ? 'Submitting...' : 'Submit Payment'}
                  </Button>
                </form>
              </div>

              {/* Instructions */}
              <div>
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Instructions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start">
                        <FiCheckCircle className="mr-2 mt-1 text-blue-600 flex-shrink-0" />
                        <span>Scan the QR code using any UPI app (Paytm, PhonePe, Google Pay, etc.)</span>
                      </div>
                      <div className="flex items-start">
                        <FiCheckCircle className="mr-2 mt-1 text-blue-600 flex-shrink-0" />
                        <span>Enter the amount: <strong>₹{category?.price}</strong></span>
                      </div>
                      <div className="flex items-start">
                        <FiCheckCircle className="mr-2 mt-1 text-blue-600 flex-shrink-0" />
                        <span>Complete the payment through your UPI app</span>
                      </div>
                      <div className="flex items-start">
                        <FiCheckCircle className="mr-2 mt-1 text-blue-600 flex-shrink-0" />
                        <span>Take a screenshot of the payment confirmation</span>
                      </div>
                      <div className="flex items-start">
                        <FiCheckCircle className="mr-2 mt-1 text-blue-600 flex-shrink-0" />
                        <span>Upload the screenshot and fill in your details</span>
                      </div>
                      <div className="flex items-start">
                        <FiCheckCircle className="mr-2 mt-1 text-blue-600 flex-shrink-0" />
                        <span>Submit the form - Admin will review and approve within 24 hours</span>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> Your subscription will be activated only after admin approval. 
                        You will receive a notification once approved.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

