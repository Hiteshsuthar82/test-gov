import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Layout from '@/components/layout/Layout'
import { FileUpload } from '@/components/ui/file-upload'
import { FiCheckCircle, FiArrowLeft, FiCreditCard } from 'react-icons/fi'

export default function PaymentPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    payerName: '',
    payerUpiId: '',
    upiTransactionId: '',
  })
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)

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
      alert('Payment submitted successfully! It will be reviewed by admin.')
      navigate('/profile')
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!screenshotFile) {
      alert('Please upload payment screenshot')
      return
    }

    if (!formData.payerName || !formData.payerUpiId) {
      alert('Please fill all required fields')
      return
    }

    const formDataToSend = new FormData()
    formDataToSend.append('categoryId', categoryId || '')
    formDataToSend.append('amount', (category?.price || 0).toString())
    formDataToSend.append('payerName', formData.payerName)
    formDataToSend.append('payerUpiId', formData.payerUpiId)
    if (formData.upiTransactionId) {
      formDataToSend.append('upiTransactionId', formData.upiTransactionId)
    }

    formDataToSend.append('screenshot', screenshotFile)

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

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="payerName">Your Name *</Label>
                    <Input
                      id="payerName"
                      value={formData.payerName}
                      onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
                      placeholder="Enter your name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="payerUpiId">Your UPI ID *</Label>
                    <Input
                      id="payerUpiId"
                      value={formData.payerUpiId}
                      onChange={(e) => setFormData({ ...formData, payerUpiId: e.target.value })}
                      placeholder="yourname@paytm"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="upiTransactionId">Transaction ID (Optional)</Label>
                    <Input
                      id="upiTransactionId"
                      value={formData.upiTransactionId}
                      onChange={(e) => setFormData({ ...formData, upiTransactionId: e.target.value })}
                      placeholder="Enter transaction ID if available"
                    />
                  </div>

                  <div>
                    <FileUpload
                      value={screenshotFile}
                      onChange={(file) => {
                        setScreenshotFile(file)
                      }}
                      label="Upload payment screenshot"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={paymentMutation.isPending}
                  >
                    {paymentMutation.isPending ? 'Submitting...' : 'Submit Payment'}
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

