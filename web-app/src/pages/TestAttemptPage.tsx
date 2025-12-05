import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Layout from '@/components/layout/Layout'
import { FiClock, FiFlag, FiCheckCircle } from 'react-icons/fi'

interface Question {
  _id: string
  questionText: string
  questionFormattedText?: string
  questionImageUrl?: string
  direction?: string
  directionImageUrl?: string
  conclusion?: string
  conclusionImageUrl?: string
  options: Array<{ optionId: string; text: string; imageUrl?: string }>
  marks: number
  sectionId: string
}

export default function TestAttemptPage() {
  const { testSetId, attemptId } = useParams()
  const navigate = useNavigate()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set())
  const [timeRemaining, setTimeRemaining] = useState(0)

  const { data: attemptData, isLoading: isLoadingAttempt } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: async () => {
      const response = await api.get(`/attempts/${attemptId}`)
      return response.data.data
    },
    enabled: !!attemptId,
  })

  const questions = attemptData?.questions || []

  useEffect(() => {
    if (attemptData?.testSet?.durationMinutes) {
      const totalSeconds = attemptData.testSet.durationMinutes * 60
      setTimeRemaining(totalSeconds)
    }
  }, [attemptData])

  useEffect(() => {
    if (timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmitTest()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  const updateAnswerMutation = useMutation({
    mutationFn: async ({ questionId, optionId }: { questionId: string; optionId: string }) => {
      return api.put(`/attempts/${attemptId}/answer`, {
        questionId,
        selectedOptionId: optionId,
        markedForReview: false,
        timeSpentIncrementSeconds: 0,
      })
    },
  })

  const toggleReviewMutation = useMutation({
    mutationFn: async ({ questionId, marked }: { questionId: string; marked: boolean }) => {
      return api.put(`/attempts/${attemptId}/review`, { questionId, markedForReview: marked })
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/attempts/${attemptId}/submit`)
    },
    onSuccess: () => {
      navigate(`/test/${testSetId}/results/${attemptId}`)
    },
  })

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedOptions((prev) => ({ ...prev, [questionId]: optionId }))
    updateAnswerMutation.mutate({ questionId, optionId })
  }

  const handleToggleReview = (questionId: string) => {
    const isMarked = markedForReview.has(questionId)
    const newMarked = new Set(markedForReview)
    if (isMarked) {
      newMarked.delete(questionId)
    } else {
      newMarked.add(questionId)
    }
    setMarkedForReview(newMarked)
    toggleReviewMutation.mutate({ questionId, marked: !isMarked })
  }

  const handleSubmitTest = () => {
    if (window.confirm('Are you sure you want to submit the test?')) {
      submitMutation.mutate()
    }
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const currentQuestion = questions?.[currentQuestionIndex]
  const answeredCount = Object.keys(selectedOptions).length
  const reviewCount = markedForReview.size

  // Initialize selected options and marked for review from attempt data
  useEffect(() => {
    if (attemptData?.questions) {
      const initialSelectedOptions: Record<string, string> = {}
      const initialMarkedForReview = new Set<string>()

      attemptData.questions.forEach((q: any) => {
        if (q.selectedOptionId) {
          initialSelectedOptions[q._id] = q.selectedOptionId
        }
        if (q.markedForReview) {
          initialMarkedForReview.add(q._id)
        }
      })

      setSelectedOptions(initialSelectedOptions)
      setMarkedForReview(initialMarkedForReview)
    }
  }, [attemptData])

  if (isLoadingAttempt || !questions || questions.length === 0 || !currentQuestion) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">Loading...</div>
      </Layout>
    )
  }

  // Safety check for options
  if (!currentQuestion.options || !Array.isArray(currentQuestion.options)) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          Error: Question data is incomplete. Please refresh the page.
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Timer */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">{attemptData?.testSet?.name}</h1>
                <p className="text-sm text-gray-600">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-red-600">
                  <FiClock />
                  <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                </div>
                <Button variant="destructive" onClick={handleSubmitTest}>
                  Submit Test
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Direction */}
                  {currentQuestion.direction && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-2">Direction:</p>
                      <p className="text-gray-700">{currentQuestion.direction}</p>
                      {currentQuestion.directionImageUrl && (
                        <img
                          src={currentQuestion.directionImageUrl}
                          alt="Direction"
                          className="mt-2 max-w-full rounded"
                        />
                      )}
                    </div>
                  )}

                  {/* Question */}
                  <div>
                    <div className="text-lg font-medium mb-4">
                      {currentQuestionIndex + 1}.{' '}
                      {currentQuestion.questionFormattedText ? (
                        <span dangerouslySetInnerHTML={{ __html: currentQuestion.questionFormattedText }} />
                      ) : (
                        <span>{currentQuestion.questionText}</span>
                      )}
                    </div>
                    {currentQuestion.questionImageUrl && (
                      <img
                        src={currentQuestion.questionImageUrl}
                        alt="Question"
                        className="mb-4 max-w-full rounded"
                      />
                    )}
                  </div>

                  {/* Conclusion */}
                  {currentQuestion.conclusion && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-green-900 mb-2">Conclusion:</p>
                      <p className="text-gray-700">{currentQuestion.conclusion}</p>
                      {currentQuestion.conclusionImageUrl && (
                        <img
                          src={currentQuestion.conclusionImageUrl}
                          alt="Conclusion"
                          className="mt-2 max-w-full rounded"
                        />
                      )}
                    </div>
                  )}

                  {/* Options */}
                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => (
                      <button
                        key={option.optionId}
                        onClick={() => handleSelectOption(currentQuestion._id, option.optionId)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedOptions[currentQuestion._id] === option.optionId
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                              selectedOptions[currentQuestion._id] === option.optionId
                                ? 'border-purple-600 bg-purple-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {selectedOptions[currentQuestion._id] === option.optionId && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="font-medium mr-2">{option.optionId}.</span>
                          <span>{option.text}</span>
                        </div>
                        {option.imageUrl && (
                          <img
                            src={option.imageUrl}
                            alt={`Option ${option.optionId}`}
                            className="mt-2 max-w-xs rounded"
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleToggleReview(currentQuestion._id)}
                      className={markedForReview.has(currentQuestion._id) ? 'bg-yellow-50' : ''}
                    >
                      <FiFlag className="mr-2" />
                      {markedForReview.has(currentQuestion._id) ? 'Unmark Review' : 'Mark for Review'}
                    </Button>
                    <Button
                      onClick={() =>
                        setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))
                      }
                      disabled={currentQuestionIndex === questions.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Question Palette</h3>
                <div className="mb-4 space-y-2 text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-2" />
                    <span>Answered ({answeredCount})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded mr-2" />
                    <span>Marked for Review ({reviewCount})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-200 rounded mr-2" />
                    <span>Not Answered ({questions.length - answeredCount})</span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q: Question, index: number) => {
                    const isAnswered = !!selectedOptions[q._id]
                    const isMarked = markedForReview.has(q._id)
                    const isCurrent = index === currentQuestionIndex

                    return (
                      <button
                        key={q._id}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`w-10 h-10 rounded border-2 flex items-center justify-center text-sm font-medium ${
                          isCurrent
                            ? 'border-purple-600 bg-purple-100'
                            : isAnswered
                            ? 'border-green-500 bg-green-100'
                            : isMarked
                            ? 'border-yellow-500 bg-yellow-100'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}

