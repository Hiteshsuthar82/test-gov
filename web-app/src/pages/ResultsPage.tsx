import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Layout from '@/components/layout/Layout'
import { FiCheckCircle, FiXCircle, FiCircle, FiTrendingUp } from 'react-icons/fi'

export default function ResultsPage() {
  const { attemptId } = useParams()
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null)

  const { data: results, isLoading } = useQuery({
    queryKey: ['results', attemptId],
    queryFn: async () => {
      const response = await api.get(`/attempts/${attemptId}/deep-dive`)
      return response.data.data
    },
  })

  const scrollToQuestion = (index: number) => {
    setSelectedQuestionIndex(index)
    const element = document.getElementById(`question-${index}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const getQuestionStatus = (q: any, index: number) => {
    const isSelected = selectedQuestionIndex === index
    const isCorrect = q.isCorrect
    const isAnswered = !!q.selectedOptionId
    const isMarked = q.markedForReview

    if (isSelected) {
      return 'current'
    }
    if (isCorrect && isMarked) {
      return 'correct-and-marked'
    }
    if (isCorrect) {
      return 'correct'
    }
    if (isAnswered && isMarked) {
      return 'wrong-and-marked'
    }
    if (isAnswered) {
      return 'wrong'
    }
    if (isMarked) {
      return 'marked'
    }
    return 'unanswered'
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">Loading...</div>
      </Layout>
    )
  }

  if (!results) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">Results not found</div>
      </Layout>
    )
  }

  const percentage = results.totalScore > 0 ? (results.totalScore / (results.questions?.length || 1)) * 100 : 0

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Test Results</h1>
          <p className="text-gray-600">Review your performance and answers</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Score</p>
                  <p className="text-3xl font-bold text-green-700">{results.totalScore}</p>
                </div>
                <FiTrendingUp className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Correct</p>
                  <p className="text-3xl font-bold text-green-600">{results.totalCorrect}</p>
                </div>
                <FiCheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Wrong</p>
                  <p className="text-3xl font-bold text-red-600">{results.totalWrong}</p>
                </div>
                <FiXCircle className="w-12 h-12 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Percentage</p>
                  <p className="text-3xl font-bold text-purple-600">{percentage.toFixed(1)}%</p>
                </div>
                <FiCircle className="w-12 h-12 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Questions Review */}
          <div className="lg:col-span-3 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Question Review</h2>
            {results.questions?.map((q: any, index: number) => (
              <Card 
                key={q.questionId} 
                id={`question-${index}`}
                className={`${q.isCorrect ? 'border-green-200' : 'border-red-200'} ${
                  selectedQuestionIndex === index ? 'ring-2 ring-purple-500' : ''
                }`}
              >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">
                    Question {index + 1}
                    {q.isCorrect ? (
                      <FiCheckCircle className="inline ml-2 text-green-600" />
                    ) : (
                      <FiXCircle className="inline ml-2 text-red-600" />
                    )}
                  </CardTitle>
                  <div className="text-sm text-gray-600">
                    Time: {Math.floor(q.timeSpentSeconds / 60)}m {q.timeSpentSeconds % 60}s
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Direction */}
                {q.direction && (
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm font-medium text-blue-900 mb-1">Direction:</p>
                    <p className="text-sm text-gray-700">{q.direction}</p>
                    {q.directionImageUrl && (
                      <img src={q.directionImageUrl} alt="Direction" className="mt-2 max-w-xs rounded" />
                    )}
                  </div>
                )}

                {/* Question */}
                <div>
                  {q.questionFormattedText ? (
                    <div className="font-medium mb-2" dangerouslySetInnerHTML={{ __html: q.questionFormattedText }} />
                  ) : (
                    <p className="font-medium mb-2">{q.questionText}</p>
                  )}
                  {q.questionImageUrl && (
                    <img src={q.questionImageUrl} alt="Question" className="max-w-md rounded mb-2" />
                  )}
                </div>

                {/* Conclusion */}
                {q.conclusion && (
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-sm font-medium text-green-900 mb-1">Conclusion:</p>
                    <p className="text-sm text-gray-700">{q.conclusion}</p>
                    {q.conclusionImageUrl && (
                      <img src={q.conclusionImageUrl} alt="Conclusion" className="mt-2 max-w-xs rounded" />
                    )}
                  </div>
                )}

                {/* Options */}
                <div className="space-y-2">
                  {q.options.map((opt: any) => {
                    const isSelected = q.selectedOptionId === opt.optionId
                    const isCorrect = q.correctOptionId === opt.optionId

                    return (
                      <div
                        key={opt.optionId}
                        className={`p-3 rounded border-2 ${
                          isCorrect
                            ? 'border-green-500 bg-green-50'
                            : isSelected && !isCorrect
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="font-medium mr-2">{opt.optionId}.</span>
                          <span>{opt.text}</span>
                          {isCorrect && <FiCheckCircle className="ml-auto text-green-600" />}
                          {isSelected && !isCorrect && <FiXCircle className="ml-auto text-red-600" />}
                        </div>
                        {opt.imageUrl && (
                          <img src={opt.imageUrl} alt={`Option ${opt.optionId}`} className="mt-2 max-w-xs rounded" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Explanation */}
                {(() => {
                  // Check if explanation text exists
                  const hasExplanationText = q.explanationFormattedText || q.explanationText
                  
                  // Check if explanation images exist
                  let validImages: string[] = []
                  if (q.explanationImageUrls) {
                    if (Array.isArray(q.explanationImageUrls)) {
                      validImages = q.explanationImageUrls.filter(
                        (img: string) => img && typeof img === 'string' && img.trim() && img !== 'null' && img !== 'undefined'
                      )
                    } else if (typeof q.explanationImageUrls === 'string' && q.explanationImageUrls.trim() && q.explanationImageUrls !== 'null' && q.explanationImageUrls !== 'undefined') {
                      validImages = [q.explanationImageUrls]
                    }
                  }
                  const hasExplanationImages = validImages.length > 0
                  
                  // Show explanation section if either text or images exist
                  if (hasExplanationText || hasExplanationImages) {
                    return (
                      <div className="bg-purple-50 p-3 rounded">
                        <p className="text-sm font-medium text-purple-900 mb-1">Explanation:</p>
                        {/* Show text first if it exists */}
                        {hasExplanationText && (
                          <>
                            {q.explanationFormattedText ? (
                              <div
                                className="text-sm text-gray-700"
                                dangerouslySetInnerHTML={{ __html: q.explanationFormattedText }}
                              />
                            ) : (
                              <p className="text-sm text-gray-700">{q.explanationText}</p>
                            )}
                          </>
                        )}
                        {/* Show images after text (or alone if no text) */}
                        {hasExplanationImages && (
                          <div className={hasExplanationText ? "mt-2 space-y-2" : "space-y-2"}>
                            {validImages.map((img: string, i: number) => (
                              <img 
                                key={i} 
                                src={img} 
                                alt={`Explanation ${i + 1}`} 
                                className="max-w-md rounded"
                                onError={(e) => {
                                  // Hide image if it fails to load
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }
                  return null
                })()}
              </CardContent>
            </Card>
          ))}
          </div>

          {/* Question Status Sheet */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Question Palette</h3>
                <div className="mb-4 space-y-2 text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-t-lg mr-2" />
                    <span>Correct</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded-t-lg mr-2" />
                    <span>Wrong</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-500 rounded-full mr-2" />
                    <span>Marked for Review</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-200 border-2 border-gray-300 rounded mr-2" />
                    <span>Unanswered</span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {results.questions?.map((q: any, index: number) => {
                    const status = getQuestionStatus(q, index)
                    const isCorrect = q.isCorrect
                    const isAnswered = !!q.selectedOptionId
                    const isMarked = q.markedForReview

                    let boxClasses = 'w-10 h-10 border-2 flex items-center justify-center text-sm font-medium relative cursor-pointer'
                    
                    if (status === 'current') {
                      boxClasses += ' border-purple-600 bg-purple-100 ring-2 ring-purple-500'
                    } else if (status === 'correct-and-marked') {
                      boxClasses += ' border-green-500 bg-green-100 rounded-full'
                    } else if (status === 'wrong-and-marked') {
                      boxClasses += ' border-red-500 bg-red-100 rounded-full'
                    } else if (status === 'correct') {
                      boxClasses += ' border-green-500 bg-green-100 rounded-t-lg'
                    } else if (status === 'wrong') {
                      boxClasses += ' border-red-500 bg-red-100 rounded-t-lg'
                    } else if (status === 'marked') {
                      boxClasses += ' border-purple-500 bg-purple-100 rounded-full'
                    } else {
                      boxClasses += ' border-gray-300 bg-white'
                    }

                    return (
                      <button
                        key={q.questionId}
                        onClick={() => scrollToQuestion(index)}
                        className={boxClasses}
                        title={`Question ${index + 1}: ${isCorrect ? 'Correct' : isAnswered ? 'Wrong' : 'Unanswered'}${isMarked ? ' (Marked)' : ''}`}
                      >
                        {index + 1}
                        {(status === 'correct-and-marked' || status === 'wrong-and-marked') && (
                          <FiCheckCircle className="absolute top-0 right-0 w-3 h-3 text-green-600 bg-white rounded-full" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    </Layout>
  )
}

