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
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem('selectedLanguage') || 'en'
  })
  
  // Helper to decode HTML entities
  const decodeHTML = (html: string): string => {
    if (!html || typeof html !== 'string') return html || ''
    const textarea = document.createElement('textarea')
    textarea.innerHTML = html
    return textarea.value
  }

  // Helper to check if a string contains HTML
  const containsHTML = (str: string | undefined | null): boolean => {
    if (!str || typeof str !== 'string') return false
    // Check for HTML tags (including escaped ones like &lt;)
    return /<[a-z][\s\S]*>/i.test(str) || /&lt;[a-z][\s\S]*&gt;/i.test(str)
  }

  // Helper to get explanation content for a question based on selected language
  const getExplanationContent = (question: any) => {
    // Try selected language first
    if (question.languages && question.languages[selectedLanguage]) {
      const langContent = question.languages[selectedLanguage]
      if (langContent.explanationText || langContent.explanationFormattedText || (langContent.explanationImageUrls && langContent.explanationImageUrls.length > 0)) {
        return {
          explanationText: langContent.explanationText,
          explanationFormattedText: langContent.explanationFormattedText,
          explanationImageUrls: langContent.explanationImageUrls || [],
        }
      }
    }
    // Fallback to English
    if (question.languages?.en) {
      return {
        explanationText: question.languages.en.explanationText,
        explanationFormattedText: question.languages.en.explanationFormattedText,
        explanationImageUrls: question.languages.en.explanationImageUrls || [],
      }
    }
    // Legacy fallback (should not happen with new structure)
    return {
      explanationText: question.explanationText,
      explanationFormattedText: question.explanationFormattedText,
      explanationImageUrls: question.explanationImageUrls || [],
    }
  }

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

  // Calculate percentage: (totalScore / totalMarks) * 100
  // Use totalMarks from backend if available, otherwise calculate from questions
  const totalMarks = results.totalMarks || results.questions?.reduce((sum: number, q: any) => sum + (q.marks || 1), 0) || 0
  const percentage = totalMarks > 0 ? (results.totalScore / totalMarks) * 100 : 0

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
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Question Review</h2>
              {(() => {
                // Get all available languages from all questions
                const availableLanguages = new Set<string>()
                results.questions?.forEach((q: any) => {
                  if (q.languages) {
                    if (q.languages.en) availableLanguages.add('en')
                    if (q.languages.hi) availableLanguages.add('hi')
                    if (q.languages.gu) availableLanguages.add('gu')
                  }
                })
                
                if (availableLanguages.size > 1) {
                  return (
                    <select
                      value={selectedLanguage}
                      onChange={(e) => {
                        setSelectedLanguage(e.target.value)
                        localStorage.setItem('selectedLanguage', e.target.value)
                      }}
                      className="px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      {availableLanguages.has('en') && <option value="en">English</option>}
                      {availableLanguages.has('hi') && <option value="hi">Hindi</option>}
                      {availableLanguages.has('gu') && <option value="gu">Gujarati</option>}
                    </select>
                  )
                }
                return null
              })()}
            </div>
            {results.questions?.map((q: any, index: number) => {
              const explanationContent = getExplanationContent(q)
              return (
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
                {(q.direction || q.directionFormattedText) && (() => {
                  const rawDirectionContent = q.directionFormattedText || q.direction || ''
                  const isHTML = containsHTML(rawDirectionContent)
                  // Decode HTML entities if it's HTML
                  const directionContent = isHTML ? decodeHTML(rawDirectionContent) : rawDirectionContent
                  
                  return (
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm font-medium text-blue-900 mb-1">Direction:</p>
                      {isHTML ? (
                        <div 
                          className="text-sm text-gray-700 prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline" 
                          dangerouslySetInnerHTML={{ __html: directionContent }} 
                        />
                      ) : (
                        <p className="text-sm text-gray-700">{directionContent}</p>
                      )}
                      {q.directionImageUrl && (
                        <img src={q.directionImageUrl} alt="Direction" className="mt-2 max-w-xs rounded" />
                      )}
                    </div>
                  )
                })()}

                {/* Question */}
                <div>
                  {q.questionFormattedText ? (
                    <div 
                      className="font-medium mb-2" 
                      dangerouslySetInnerHTML={{ __html: decodeHTML(q.questionFormattedText) }} 
                    />
                  ) : q.questionText ? (
                    (() => {
                      const isHTML = containsHTML(q.questionText)
                      return isHTML ? (
                        <div 
                          className="font-medium mb-2" 
                          dangerouslySetInnerHTML={{ __html: decodeHTML(q.questionText) }} 
                        />
                      ) : (
                        <p className="font-medium mb-2">{q.questionText}</p>
                      )
                    })()
                  ) : null}
                  {q.questionImageUrl && (
                    <img src={q.questionImageUrl} alt="Question" className="max-w-md rounded mb-2" />
                  )}
                </div>

                {/* Conclusion */}
                {(q.conclusion || q.conclusionFormattedText) && (() => {
                  const rawConclusionContent = q.conclusionFormattedText || q.conclusion || ''
                  const isHTML = containsHTML(rawConclusionContent)
                  const conclusionContent = isHTML ? decodeHTML(rawConclusionContent) : rawConclusionContent
                  
                  return (
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-sm font-medium text-green-900 mb-1">Conclusion:</p>
                      {isHTML ? (
                        <div 
                          className="text-sm text-gray-700 prose prose-sm max-w-none [&_p]:mb-2 [&_strong]:font-bold" 
                          dangerouslySetInnerHTML={{ __html: conclusionContent }} 
                        />
                      ) : (
                        <p className="text-sm text-gray-700">{conclusionContent}</p>
                      )}
                      {q.conclusionImageUrl && (
                        <img src={q.conclusionImageUrl} alt="Conclusion" className="mt-2 max-w-xs rounded" />
                      )}
                    </div>
                  )
                })()}

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
                  const hasExplanationText = explanationContent.explanationFormattedText || explanationContent.explanationText
                  
                  // Check if explanation images exist
                  let validImages: string[] = []
                  if (explanationContent.explanationImageUrls) {
                    if (Array.isArray(explanationContent.explanationImageUrls)) {
                      validImages = explanationContent.explanationImageUrls.filter(
                        (img: string) => img && typeof img === 'string' && img.trim() && img !== 'null' && img !== 'undefined'
                      )
                    } else if (typeof explanationContent.explanationImageUrls === 'string' && explanationContent.explanationImageUrls.trim() && explanationContent.explanationImageUrls !== 'null' && explanationContent.explanationImageUrls !== 'undefined') {
                      validImages = [explanationContent.explanationImageUrls]
                    }
                  }
                  const hasExplanationImages = validImages.length > 0
                  
                  // Show explanation section if either text or images exist
                  if (hasExplanationText || hasExplanationImages) {
                    return (
                      <div className="bg-purple-50 p-3 rounded">
                        <p className="text-sm font-medium text-purple-900 mb-1">Explanation:</p>
                        {/* Show text first if it exists */}
                        {hasExplanationText && (() => {
                          // Determine which content to use and if it contains HTML
                          const rawContent = explanationContent.explanationFormattedText || explanationContent.explanationText || ''
                          const isHTML = containsHTML(rawContent)
                          // Decode HTML entities if it's HTML
                          const contentToRender = isHTML ? decodeHTML(rawContent) : rawContent
                          
                          return (
                            <>
                              {isHTML ? (
                                <div
                                  className="text-sm text-gray-700 prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline [&_img]:inline-block [&_img]:align-middle [&_u]:underline [&_br]:block"
                                  dangerouslySetInnerHTML={{ __html: contentToRender }}
                                />
                              ) : (
                                <p className="text-sm text-gray-700">{contentToRender}</p>
                              )}
                            </>
                          )
                        })()}
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
              )
            })}
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
                    <div className="w-4 h-4 bg-red-500 rounded-b-lg mr-2" />
                    <span>Incorrect</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded mr-2" />
                    <span>Unattempted</span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {results.questions?.map((q: any, index: number) => {
                    const isCorrect = q.isCorrect
                    const isAnswered = !!q.selectedOptionId
                    const isMarked = q.markedForReview
                    const isSelected = selectedQuestionIndex === index

                    let boxClasses = 'w-8 h-8 flex items-center justify-center text-xs font-medium relative cursor-pointer'
                    
                    if (isSelected) {
                      // Selected question: use actual status color but with yellow border
                      if (isCorrect) {
                        boxClasses += ' bg-green-500 rounded-lg text-white border-2 border-yellow-400'
                      } else if (isAnswered) {
                        boxClasses += ' bg-red-500 rounded-lg text-white border-2 border-yellow-400'
                      } else {
                        boxClasses += ' border-2 border-yellow-400 bg-white text-black rounded-lg'
                      }
                    } else if (isCorrect) {
                      // Correct answer: green with rounded top corners (matching test attempt design)
                      boxClasses += ' bg-green-500 rounded-t-full text-white'
                    } else if (isAnswered) {
                      // Incorrect answer: red with rounded top corners (matching test attempt design)
                      boxClasses += ' bg-red-500 rounded-b-full text-white'
                    } else {
                      // Unattempted: white with border (square, matching test attempt design)
                      boxClasses += ' border-2 border-gray-300 bg-white text-black'
                    }

                    return (
                      <button
                        key={q.questionId}
                        onClick={() => scrollToQuestion(index)}
                        className={boxClasses}
                        title={`Question ${index + 1}: ${isCorrect ? 'Correct' : isAnswered ? 'Incorrect' : 'Unattempted'}${isMarked ? ' (Marked for Review)' : ''}`}
                      >
                        {index + 1}
                        {isMarked && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-white shadow-sm" />
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

