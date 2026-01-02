import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Layout from '@/components/layout/Layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { FiChevronsLeft, FiChevronsRight, FiChevronLeft, FiCheckCircle, FiXCircle, FiCircle, FiBook, FiFileText, FiX, FiArrowLeft, FiBarChart2 } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'

interface Question {
  _id?: string
  questionId?: string
  questionOrder: number
  languages: {
    en: {
      direction?: string
      directionFormattedText?: string
      directionImageUrl?: string
      questionText: string
      questionFormattedText?: string
      questionImageUrl?: string
      conclusion?: string
      conclusionFormattedText?: string
      conclusionImageUrl?: string
      options: Array<{ optionId: string; text: string; imageUrl?: string }>
      explanationText?: string
      explanationFormattedText?: string
      explanationImageUrls?: string[]
    }
    hi?: {
      direction?: string
      directionFormattedText?: string
      directionImageUrl?: string
      questionText: string
      questionFormattedText?: string
      questionImageUrl?: string
      conclusion?: string
      conclusionFormattedText?: string
      conclusionImageUrl?: string
      options: Array<{ optionId: string; text: string; imageUrl?: string }>
      explanationText?: string
      explanationFormattedText?: string
      explanationImageUrls?: string[]
    }
    gu?: {
      direction?: string
      directionFormattedText?: string
      directionImageUrl?: string
      questionText: string
      questionFormattedText?: string
      questionImageUrl?: string
      conclusion?: string
      conclusionFormattedText?: string
      conclusionImageUrl?: string
      options: Array<{ optionId: string; text: string; imageUrl?: string }>
      explanationText?: string
      explanationFormattedText?: string
      explanationImageUrls?: string[]
    }
  }
  marks: number
  averageTimeSeconds?: number
  sectionId: string
  correctOptionId?: string
  selectedOptionId?: string
  isCorrect?: boolean
  timeSpentSeconds?: number
  markedForReview?: boolean
  gainedMarks?: number
}

export default function SolutionPage() {
  const { testSetId, attemptId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem('selectedLanguage') || 'en'
  })
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [isReattemptMode, setIsReattemptMode] = useState(() => {
    // Check if reattempt mode should be enabled from localStorage
    const reattemptFromStorage = localStorage.getItem('isReattemptMode')
    if (reattemptFromStorage === 'true') {
      // Clear it after reading to avoid persisting across page reloads
      localStorage.removeItem('isReattemptMode')
      return true
    }
    return false
  })
  const [reattemptSelections, setReattemptSelections] = useState<Record<string, string>>({})
  const [showSolution, setShowSolution] = useState<Record<string, boolean>>({})
  const [showQuestionPaper, setShowQuestionPaper] = useState(false)
  const [isEbookView, setIsEbookView] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)

  const { data: results, isLoading } = useQuery({
    queryKey: ['results', attemptId],
    queryFn: async () => {
      const response = await api.get(`/attempts/${attemptId}/deep-dive`)
      return response.data.data
    },
  })

  const questions: Question[] = results?.questions || []
  const testSet = results?.testSet

  // Initialize selected options from results
  useEffect(() => {
    if (questions.length > 0) {
      const initialSelections: Record<string, string> = {}
      questions.forEach((q: any) => {
        if (q.selectedOptionId) {
          const qId = q.questionId || q._id
          if (qId) {
            initialSelections[qId] = q.selectedOptionId
          }
        }
      })
      setSelectedOptions(initialSelections)
    }
  }, [questions])

  // Reset reattempt selections when mode is turned off then on
  useEffect(() => {
    if (isReattemptMode) {
      // Clear previous reattempt selections when mode is turned on
      setReattemptSelections({})
      setShowSolution({})
    } else {
      // Clear localStorage when reattempt mode is turned off
      localStorage.removeItem('isReattemptMode')
    }
  }, [isReattemptMode])

  // Get available languages for a question
  const getAvailableLanguages = (question: Question): string[] => {
    const available: string[] = ['en']
    if (question.languages?.hi) available.push('hi')
    if (question.languages?.gu) available.push('gu')
    return available
  }

  // Get question content for selected language
  const getQuestionContent = (question: Question, lang: string) => {
    if (question.languages && question.languages[lang as keyof typeof question.languages]) {
      const langContent = question.languages[lang as keyof typeof question.languages]
      if (langContent && langContent.questionText) {
        return langContent
      }
    }
    return question.languages.en
  }

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

  // Get explanation content
  const getExplanationContent = (question: any) => {
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
    if (question.languages?.en) {
      return {
        explanationText: question.languages.en.explanationText,
        explanationFormattedText: question.languages.en.explanationFormattedText,
        explanationImageUrls: question.languages.en.explanationImageUrls || [],
      }
    }
    return {
      explanationText: question.explanationText,
      explanationFormattedText: question.explanationFormattedText,
      explanationImageUrls: question.explanationImageUrls || [],
    }
  }

  // Get current question
  const currentQuestion = questions[currentQuestionIndex]
  const currentQuestionId = currentQuestion ? (currentQuestion.questionId || currentQuestion._id) : null
  const currentQuestionContent = currentQuestion ? getQuestionContent(currentQuestion, selectedLanguage) : null

  // Get sections
  const sections = testSet?.sections || []
  const hasSections = sections.length > 0

  // Get questions for current section
  const getSectionQuestions = (sectionId: string | null) => {
    if (!sectionId) return questions
    return questions.filter((q: Question) => q.sectionId === sectionId)
  }

  const sectionQuestions = selectedSectionId ? getSectionQuestions(selectedSectionId) : questions

  // Get current question index within the section
  const getCurrentSectionQuestionIndex = () => {
    if (!selectedSectionId) return currentQuestionIndex
    const currentQId = currentQuestion ? (currentQuestion.questionId || currentQuestion._id) : null
    return sectionQuestions.findIndex((q: Question) => {
      const qId = q.questionId || q._id
      return qId === currentQId
    })
  }

  const currentSectionQuestionIndex = getCurrentSectionQuestionIndex()

  // Function to handle section changes and navigate to first question
  const handleSectionChange = useCallback((sectionId: string) => {
    setSelectedSectionId(sectionId)
    const firstQuestionInSection = questions.find((q: Question) => q.sectionId === sectionId)
    if (firstQuestionInSection) {
      const firstQId = firstQuestionInSection.questionId || firstQuestionInSection._id
      const firstIndex = questions.findIndex((q: Question) => {
        const qId = q.questionId || q._id
        return qId === firstQId
      })
      if (firstIndex >= 0) {
        setCurrentQuestionIndex(firstIndex)
      }
    }
  }, [questions])

  // Check if current section is the last section
  const sortedSections = sections.sort((a: any, b: any) => a.order - b.order)
  const currentSectionIndex = selectedSectionId ? sortedSections.findIndex((s: any) => s.sectionId === selectedSectionId) : -1
  const isLastSection = currentSectionIndex === sortedSections.length - 1
  const isLastQuestionInSection = selectedSectionId && currentSectionQuestionIndex === sectionQuestions.length - 1

  // Set initial section
  useEffect(() => {
    if (hasSections && sections.length > 0 && !selectedSectionId) {
      handleSectionChange(sections[0].sectionId)
    }
  }, [hasSections, sections, questions, selectedSectionId])

  // Handle option selection in reattempt mode
  const handleSelectOption = (questionId: string, optionId: string) => {
    if (!isReattemptMode) return

    setReattemptSelections((prev) => ({ ...prev, [questionId]: optionId }))

    const question = questions.find((q: Question) => {
      const qId = q.questionId || q._id
      return qId === questionId
    })
    if (question && question.correctOptionId === optionId) {
      toast.success('You got it right!')
      setShowSolution((prev) => ({ ...prev, [questionId]: true }))
    } else {
      toast.error('You got it wrong, please check the solution')
      setShowSolution((prev) => ({ ...prev, [questionId]: true }))
    }
  }

  // Calculate gained marks for a question
  const getGainedMarks = (question: any): number => {
    if (question.gainedMarks !== undefined) return question.gainedMarks
    if (question.isCorrect) return question.marks || 1
    if (question.selectedOptionId && !question.isCorrect && testSet?.negativeMarking) {
      return -(testSet.negativeMarking || 0)
    }
    return 0
  }

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  // Get speed indicator for a question
  const getSpeedIndicator = (question: any) => {
    if (!question.averageTimeSeconds || !question.timeSpentSeconds) return null
    const timeSpent = question.timeSpentSeconds
    const avgTime = question.averageTimeSeconds
    const isCorrect = question.isCorrect

    if (timeSpent < avgTime * 0.5 && isCorrect) return 'superfast'
    if (timeSpent <= avgTime && isCorrect) return 'ontime'
    if (timeSpent > avgTime && isCorrect) return 'slow'
    if (timeSpent <= avgTime && !isCorrect) return 'ontimebutwrong'
    return null
  }

  // Calculate summary data
  const calculateSummary = () => {
    const summary: Record<string, { total: number; correct: number; incorrect: number; skipped: number; marks: number }> = {}

    sections.forEach((section: any) => {
      const sectionQuestions = questions.filter((q: any) => q.sectionId === section.sectionId)
      const correct = sectionQuestions.filter((q: any) => q.isCorrect).length
      const incorrect = sectionQuestions.filter((q: any) => q.isCorrect === false && q.selectedOptionId).length
      const skipped = sectionQuestions.filter((q: any) => !q.selectedOptionId).length
      const marks = sectionQuestions.reduce((sum: number, q: any) => sum + getGainedMarks(q), 0)

      summary[section.sectionId] = {
        total: sectionQuestions.length,
        correct,
        incorrect,
        skipped,
        marks,
      }
    })

    return summary
  }

  const summaryData = calculateSummary()

  if (isLoading) {
    return (
      <Layout hideNavbar={true}>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">Loading...</div>
      </Layout>
    )
  }

  if (!results || !currentQuestion) {
    return (
      <Layout hideNavbar={true}>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">Solution not found</div>
      </Layout>
    )
  }

  const availableLanguages = getAvailableLanguages(currentQuestion)

  return (
    <Layout hideNavbar={true}>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="border-b bg-white px-6 py-3 flex items-center justify-between flex-shrink-0">
          {/* Left Section - Back Arrow and Test Info */}
          <div className="flex items-center gap-4">
            {/* Back Arrow */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100"
            >
              <FiArrowLeft className="w-5 h-5" />
            </Button>

            {/* Test Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <div className="text-lg font-bold text-gray-900 leading-none">{testSet?.name}</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">
                  {results?.category?.name || 'Category'}
                </span>
                <span className="text-gray-400 h-fit text-xs">•</span>
                <span className="font-medium text-blue-600">
                  {results?.category?.section?.name || 'Section'}
                </span>
              </div>
              </div>
            </div>
          </div>

          {/* Right Section - Analysis Button */}
          <div className="flex items-center gap-4">
            {showQuestionPaper && (
              <Button
                variant="outline"
                onClick={() => setIsEbookView(!isEbookView)}
                size="sm"
              >
                {isEbookView ? (
                  <>
                    <FiX className="mr-2" />
                    Exit eBook View
                  </>
                ) : (
                  <>
                    <FiBook className="mr-2" />
                    eBook View
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate(`/test/${testSetId}/analysis/${attemptId}`)}
              size="sm"
              className="flex items-center gap-2"
            >
              <FiBarChart2 className="w-4 h-4" />
              Analysis
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Side - Scrollable Content */}
          <div className="flex-1 flex flex-col overflow-hidden border-r">
            {showQuestionPaper ? (
              /* Question Paper View */
<div className="flex-1 overflow-y-auto bg-white p-8">
  {sections.map((section: any) => {
    const sectionQuestions = questions.filter((q: any) => q.sectionId === section.sectionId)
    return (
      <div key={section.sectionId} className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{section.name}</h2>
        <div className="space-y-6">
          {sectionQuestions.map((q: any, idx: number) => {
            const qContent = getQuestionContent(q, selectedLanguage)
            const gainedMarks = getGainedMarks(q)
            const qId = q.questionId || q._id
            return (
              <div key={qId} className="border-b pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    {isEbookView ? (
                      <div className="space-y-4">
                        <div className="font-medium">
                          Q. {q.questionOrder || (idx + 1)}){' '}
                          {qContent.questionFormattedText ? (
                            <span 
                              className="prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline"
                              dangerouslySetInnerHTML={{ __html: decodeHTML(qContent.questionFormattedText) }} 
                            />
                          ) : qContent.questionText ? (
                            (() => {
                              const isHTML = containsHTML(qContent.questionText)
                              return isHTML ? (
                                <span 
                                  className="prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline"
                                  dangerouslySetInnerHTML={{ __html: decodeHTML(qContent.questionText) }} 
                                />
                              ) : (
                                <span>{qContent.questionText}</span>
                              )
                            })()
                          ) : null}
                        </div>
                        {qContent.direction && (
                          <div className="text-sm text-gray-600">
                            <strong>Direction:</strong>{' '}
                            {(() => {
                              const rawDirectionContent = qContent.directionFormattedText || qContent.direction || ''
                              const isHTML = containsHTML(rawDirectionContent)
                              // Decode HTML entities if it's HTML
                              const directionContent = isHTML ? decodeHTML(rawDirectionContent) : rawDirectionContent

                              return isHTML ? (
                                <span
                                  className="prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline"
                                  dangerouslySetInnerHTML={{ __html: directionContent }}
                                />
                              ) : directionContent ? (
                                <span>{directionContent}</span>
                              ) : null
                            })()}
                          </div>
                        )}
                        {qContent.conclusion && (
                          <div className="text-sm text-gray-600">
                            <strong>Conclusion:</strong>{' '}
                            {qContent.conclusionFormattedText ? (
                              <span 
                                className="prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline"
                                dangerouslySetInnerHTML={{ __html: decodeHTML(qContent.conclusionFormattedText) }} 
                              />
                            ) : qContent.conclusion ? (
                              (() => {
                                const isHTML = containsHTML(qContent.conclusion)
                                return isHTML ? (
                                  <span 
                                    className="prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline"
                                    dangerouslySetInnerHTML={{ __html: decodeHTML(qContent.conclusion) }} 
                                  />
                                ) : (
                                  <span>{qContent.conclusion}</span>
                                )
                              })()
                            ) : null}
                          </div>
                        )}
                        <div className="space-y-2">
                          {qContent.options.map((opt: any) => (
                            <div key={opt.optionId} className="flex items-start">
                              <span className="font-medium mr-2">{opt.optionId})</span>
                              {(() => {
                                const isHTML = containsHTML(opt.text)
                                return isHTML ? (
                                  <span 
                                    className="prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline"
                                    dangerouslySetInnerHTML={{ __html: decodeHTML(opt.text) }} 
                                  />
                                ) : (
                                  <span>{opt.text}</span>
                                )
                              })()}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="font-medium">
  Q. {q.questionOrder || (idx + 1)}){' '}
  {qContent.questionFormattedText ? (
    <span 
      className="prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline [&_img]:inline-block [&_img]:align-middle [&_u]:underline [&_br]:block"
      dangerouslySetInnerHTML={{ __html: decodeHTML(qContent.questionFormattedText) }} 
    />
  ) : qContent.questionText ? (
    (() => {
      const isHTML = containsHTML(qContent.questionText)
      const decodedText = isHTML ? decodeHTML(qContent.questionText) : qContent.questionText
      
      return isHTML ? (
        <span 
          className="prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline [&_img]:inline-block [&_img]:align-middle [&_u]:underline [&_br]:block"
          dangerouslySetInnerHTML={{ __html: decodedText }} 
        />
      ) : (
        <span>{decodedText}</span>
      )
    })()
  ) : null}
</div>
                    )}
                  </div>
                  {!isEbookView && (
                    <div className="ml-4 font-semibold">
                      {gainedMarks > 0 ? '+' : ''}{gainedMarks}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  })}
</div>
            ) : (
              <>
                {/* Section Selection Row */}
                {hasSections && (
                  <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50 flex-shrink-0 flex-wrap">
                    {sections
                      .sort((a: any, b: any) => a.order - b.order)
                      .map((section: any) => {
                        const isSelected = selectedSectionId === section.sectionId
                        return (
                          <button
                            key={section.sectionId}
                            onClick={() => handleSectionChange(section.sectionId)}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {section.name}
                          </button>
                        )
                      })}
                  </div>
                )}

                {/* Question Number and Info */}
                <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 flex-shrink-0">
                  <div className="text-lg font-semibold">
                    Question {selectedSectionId ? (currentSectionQuestionIndex + 1) : (currentQuestion.questionOrder || (currentQuestionIndex + 1))} of {sectionQuestions.length}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">
                        Marks: {getGainedMarks(currentQuestion)}
                      </span>
                      {currentQuestion.timeSpentSeconds && (
                        <span className="text-blue-600">
                          Time: {formatTime(currentQuestion.timeSpentSeconds)}
                        </span>
                      )}
                      {currentQuestion.averageTimeSeconds && (
                        <span className="text-gray-600">
                          Avg: {formatTime(currentQuestion.averageTimeSeconds)}
                        </span>
                      )}
                    </div>
                    {availableLanguages.length > 1 && (
                      <select
                        value={selectedLanguage}
                        onChange={(e) => {
                          setSelectedLanguage(e.target.value)
                          localStorage.setItem('selectedLanguage', e.target.value)
                        }}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        {availableLanguages.includes('en') && <option value="en">English</option>}
                        {availableLanguages.includes('hi') && <option value="hi">Hindi</option>}
                        {availableLanguages.includes('gu') && <option value="gu">Gujarati</option>}
                      </select>
                    )}
                  </div>
                </div>

                {/* Content Box - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                    {currentQuestionContent && (
                      <>
                        {currentQuestionContent.direction || currentQuestionContent.directionImageUrl ? (
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            {/* Left Box: Direction */}
                            <div className="bg-blue-50 p-4 rounded-lg overflow-y-auto max-h-[calc(100vh-265px)]">
                              <p className="text-sm font-medium text-blue-900 mb-2">Direction:</p>
                              {(() => {
                                const rawDirectionContent = currentQuestionContent.directionFormattedText || currentQuestionContent.direction || ''
                                const isHTML = containsHTML(rawDirectionContent)
                                // Decode HTML entities if it's HTML
                                const directionContent = isHTML ? decodeHTML(rawDirectionContent) : rawDirectionContent
                                
                                return isHTML ? (
                                  <div 
                                    className="text-gray-700 mb-2 prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline" 
                                    dangerouslySetInnerHTML={{ __html: directionContent }} 
                                  />
                                ) : directionContent ? (
                                  <p className="text-gray-700 mb-2">{directionContent}</p>
                                ) : null
                              })()}
                              {currentQuestionContent.directionImageUrl && (
                                <img
                                  src={currentQuestionContent.directionImageUrl}
                                  alt="Direction"
                                  className="mt-2 max-w-full rounded"
                                />
                              )}
                            </div>
                            {/* Right Box: Question, Conclusion, Options */}
                            <div className="overflow-y-auto max-h-[calc(100vh-265px)]">
                              {/* Question */}
                              <div className="mb-4">
                                <div className="text-lg font-medium mb-2">
                                  {selectedSectionId ? (currentSectionQuestionIndex + 1) : (currentQuestion.questionOrder || (currentQuestionIndex + 1))}.{' '}
                                  {currentQuestionContent.questionFormattedText ? (
                                    <span dangerouslySetInnerHTML={{ __html: decodeHTML(currentQuestionContent.questionFormattedText) }} />
                                  ) : currentQuestionContent.questionText ? (
                                    (() => {
                                      const isHTML = containsHTML(currentQuestionContent.questionText)
                                      return isHTML ? (
                                        <span dangerouslySetInnerHTML={{ __html: decodeHTML(currentQuestionContent.questionText) }} />
                                      ) : (
                                        <span>{currentQuestionContent.questionText}</span>
                                      )
                                    })()
                                  ) : null}
                                </div>
                                {currentQuestionContent.questionImageUrl && (
                                  <img
                                    src={currentQuestionContent.questionImageUrl}
                                    alt="Question"
                                    className="max-w-full rounded mb-2"
                                  />
                                )}
                              </div>

                              {/* Conclusion */}
                              {currentQuestionContent.conclusion && (
                                <div className="bg-green-50 p-4 rounded-lg mb-4">
                                  <p className="text-sm font-medium text-green-900 mb-2">Conclusion:</p>
                                  {currentQuestionContent.conclusionFormattedText ? (
                                    <div 
                                      className="text-gray-700 prose prose-sm max-w-none [&_p]:mb-2 [&_strong]:font-bold" 
                                      dangerouslySetInnerHTML={{ __html: decodeHTML(currentQuestionContent.conclusionFormattedText) }} 
                                    />
                                  ) : currentQuestionContent.conclusion ? (
                                    (() => {
                                      const isHTML = containsHTML(currentQuestionContent.conclusion)
                                      return isHTML ? (
                                        <div 
                                          className="text-gray-700 prose prose-sm max-w-none [&_p]:mb-2 [&_strong]:font-bold" 
                                          dangerouslySetInnerHTML={{ __html: decodeHTML(currentQuestionContent.conclusion) }} 
                                        />
                                      ) : (
                                        <p className="text-gray-700">{currentQuestionContent.conclusion}</p>
                                      )
                                    })()
                                  ) : null}
                                  {currentQuestionContent.conclusionImageUrl && (
                                    <img
                                      src={currentQuestionContent.conclusionImageUrl}
                                      alt="Conclusion"
                                      className="mt-2 max-w-full rounded"
                                    />
                                  )}
                                </div>
                              )}

                              {/* Options */}
                              <div className="space-y-3 relative">
                              {currentQuestionContent.options.map((option: { optionId: string; text: string; imageUrl?: string }) => {
                                const questionId = currentQuestionId || ''
                                const isCorrect = currentQuestion.correctOptionId === option.optionId
                                  const isSelected = !isReattemptMode
                                    ? selectedOptions[questionId] === option.optionId
                                    : reattemptSelections[questionId] === option.optionId
                                  const isAttempted = selectedOptions[questionId] === option.optionId
                                  const showSolutionForThis = showSolution[questionId] || !isReattemptMode

                                  let optionClasses = 'w-full text-left p-4 rounded-lg border-2 transition-all'
                                  if (isReattemptMode && showSolutionForThis) {
                                    if (isCorrect) {
                                      optionClasses += ' border-green-500 bg-green-50'
                                    } else if (isSelected && !isCorrect) {
                                      optionClasses += ' border-red-500 bg-red-50'
                                    } else {
                                      optionClasses += ' border-gray-200'
                                    }
                                  } else if (!isReattemptMode) {
                                    if (isCorrect) {
                                      optionClasses += ' border-green-500 bg-green-50'
                                    } else if (isAttempted && !isCorrect) {
                                      optionClasses += ' border-red-500 bg-red-50'
                                    } else {
                                      optionClasses += ' border-gray-200'
                                    }
                                  } else {
                                    optionClasses += isSelected ? ' border-purple-600 bg-purple-50' : ' border-gray-200 hover:border-purple-300'
                                  }

                                  return (
                                    <button
                                      key={option.optionId}
                                      onClick={() => handleSelectOption(questionId, option.optionId)}
                                      disabled={!isReattemptMode || showSolutionForThis}
                                      className={optionClasses}
                                    >
                                      <div className="flex items-center">
                                        <div
                                          className={`min-w-6 max-w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                                            isCorrect && showSolutionForThis
                                              ? 'border-green-600 bg-green-600'
                                              : isSelected && !isCorrect && showSolutionForThis
                                              ? 'border-red-600 bg-red-600'
                                              : isSelected
                                              ? 'border-purple-600 bg-purple-600'
                                              : 'border-gray-300'
                                          }`}
                                        >
                                          {(isSelected || (isCorrect && showSolutionForThis)) && (
                                            <div className="w-2 h-2 rounded-full bg-white" />
                                          )}
                                        </div>
                                        <span className="font-medium mr-2">{option.optionId}.</span>
                                        {(() => {
                                          const isHTML = containsHTML(option.text)
                                          return isHTML ? (
                                            <span
                                              className="prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline [&_img]:inline-block [&_img]:align-middle [&_u]:underline [&_br]:block"
                                              dangerouslySetInnerHTML={{ __html: decodeHTML(option.text) }}
                                            />
                                          ) : (
                                            <span>{option.text}</span>
                                          )
                                        })()}
                                        {isCorrect && showSolutionForThis && (
                                          <FiCheckCircle className="ml-auto text-green-600" />
                                        )}
                                        {isSelected && !isCorrect && showSolutionForThis && (
                                          <FiXCircle className="ml-auto text-red-600" />
                                        )}
                                      </div>
                                      {option.imageUrl && (
                                        <img
                                          src={option.imageUrl}
                                          alt={`Option ${option.optionId}`}
                                          className="mt-2 max-w-xs rounded"
                                        />
                                      )}
                                    </button>
                                  )
                                })}
                                {isReattemptMode && currentQuestionId && !showSolution[currentQuestionId] && (
                                  <button
                                    onClick={() => setShowSolution((prev) => ({ ...prev, [currentQuestionId]: true }))}
                                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                                  >
                                    View Solution
                                  </button>
                                )}
                              </div>

                              {/* Solution Tab */}
                              {((!isReattemptMode && currentQuestion.correctOptionId) || (isReattemptMode && currentQuestionId && showSolution[currentQuestionId])) && (
                                <div className="mt-4 bg-purple-50 p-4 rounded-lg">
                                  <p className="text-sm font-medium text-purple-900 mb-2">Solution:</p>
                                  {(() => {
                                    const explanationContent = getExplanationContent(currentQuestion)
                                    const hasExplanationText = explanationContent.explanationFormattedText || explanationContent.explanationText
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

                                    if (hasExplanationText || hasExplanationImages) {
                                      return (
                                        <>
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
                                          {hasExplanationImages && (
                                            <div className={hasExplanationText ? "mt-2 space-y-2" : "space-y-2"}>
                                              {validImages.map((img: string, i: number) => (
                                                <img
                                                  key={i}
                                                  src={img}
                                                  alt={`Explanation ${i + 1}`}
                                                  className="max-w-md rounded"
                                                  onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                  }}
                                                />
                                              ))}
                                            </div>
                                          )}
                                        </>
                                      )
                                    }
                                    return null
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Single Box: Question, Conclusion, Options */
                          <div className="overflow-y-auto">
                            {/* Question */}
                            <div className="mb-4">
                              <div className="text-lg font-medium mb-2">
                                {selectedSectionId ? (currentSectionQuestionIndex + 1) : (currentQuestion.questionOrder || (currentQuestionIndex + 1))}.{' '}
                                {(() => {
                                  const isHTML = containsHTML(currentQuestionContent.questionFormattedText)
                                  return isHTML && currentQuestionContent.questionFormattedText ? (
                                    <span
                                      className="prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline [&_img]:inline-block [&_img]:align-middle [&_u]:underline [&_br]:block"
                                      dangerouslySetInnerHTML={{ __html: decodeHTML(currentQuestionContent.questionFormattedText) }}
                                    />
                                  ) : (
                                    <span>{currentQuestionContent.questionText}</span>
                                  )
                                })()}
                              </div>
                              {currentQuestionContent.questionImageUrl && (
                                <img
                                  src={currentQuestionContent.questionImageUrl}
                                  alt="Question"
                                  className="max-w-full rounded mb-2"
                                />
                              )}
                            </div>

                            {/* Conclusion */}
                            {currentQuestionContent.conclusion && (
                              <div className="bg-green-50 p-4 rounded-lg mb-4">
                                <p className="text-sm font-medium text-green-900 mb-2">Conclusion:</p>
                                {(() => {
                                  const isHTML = containsHTML(currentQuestionContent.conclusionFormattedText)
                                  return isHTML && currentQuestionContent.conclusionFormattedText ? (
                                    <div
                                      className="text-gray-700 prose prose-sm max-w-none [&_p]:mb-2 [&_strong]:font-bold"
                                      dangerouslySetInnerHTML={{ __html: decodeHTML(currentQuestionContent.conclusionFormattedText) }}
                                    />
                                  ) : (
                                    <p className="text-gray-700">{currentQuestionContent.conclusion}</p>
                                  )
                                })()}
                                {currentQuestionContent.conclusionImageUrl && (
                                  <img
                                    src={currentQuestionContent.conclusionImageUrl}
                                    alt="Conclusion"
                                    className="mt-2 max-w-full rounded"
                                  />
                                )}
                              </div>
                            )}

                            {/* Options */}
                            <div className="space-y-3 relative">
                              {currentQuestionContent.options.map((option: { optionId: string; text: string; imageUrl?: string }) => {
                                const questionId = currentQuestionId || ''
                                const isCorrect = currentQuestion.correctOptionId === option.optionId
                                const isSelected = !isReattemptMode
                                  ? selectedOptions[questionId] === option.optionId
                                  : reattemptSelections[questionId] === option.optionId
                                const isAttempted = selectedOptions[questionId] === option.optionId
                                const showSolutionForThis = showSolution[questionId] || !isReattemptMode

                                let optionClasses = 'w-full text-left p-4 rounded-lg border-2 transition-all'
                                if (isReattemptMode && showSolutionForThis) {
                                  if (isCorrect) {
                                    optionClasses += ' border-green-500 bg-green-50'
                                  } else if (isSelected && !isCorrect) {
                                    optionClasses += ' border-red-500 bg-red-50'
                                  } else {
                                    optionClasses += ' border-gray-200'
                                  }
                                } else if (!isReattemptMode) {
                                  if (isCorrect) {
                                    optionClasses += ' border-green-500 bg-green-50'
                                  } else if (isAttempted && !isCorrect) {
                                    optionClasses += ' border-red-500 bg-red-50'
                                  } else {
                                    optionClasses += ' border-gray-200'
                                  }
                                } else {
                                  optionClasses += isSelected ? ' border-purple-600 bg-purple-50' : ' border-gray-200 hover:border-purple-300'
                                }

                                return (
                                  <button
                                    key={option.optionId}
                                    onClick={() => handleSelectOption(questionId, option.optionId)}
                                    disabled={!isReattemptMode || showSolutionForThis}
                                    className={optionClasses}
                                  >
                                    <div className="flex items-center">
                                      <div
                                        className={`min-w-6 max-w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                                          isCorrect && showSolutionForThis
                                            ? 'border-green-600 bg-green-600'
                                            : isSelected && !isCorrect && showSolutionForThis
                                            ? 'border-red-600 bg-red-600'
                                            : isSelected
                                            ? 'border-purple-600 bg-purple-600'
                                            : 'border-gray-300'
                                        }`}
                                      >
                                        {(isSelected || (isCorrect && showSolutionForThis)) && (
                                          <div className="w-2 h-2 rounded-full bg-white" />
                                        )}
                                      </div>
                                      <span className="font-medium mr-2">{option.optionId}.</span>
                                      {(() => {
                                        const isHTML = containsHTML(option.text)
                                        return isHTML ? (
                                          <span
                                            className="prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline [&_img]:inline-block [&_img]:align-middle [&_u]:underline [&_br]:block"
                                            dangerouslySetInnerHTML={{ __html: decodeHTML(option.text) }}
                                          />
                                        ) : (
                                          <span>{option.text}</span>
                                        )
                                      })()}
                                      {isCorrect && showSolutionForThis && (
                                        <FiCheckCircle className="ml-auto text-green-600" />
                                      )}
                                      {isSelected && !isCorrect && showSolutionForThis && (
                                        <FiXCircle className="ml-auto text-red-600" />
                                      )}
                                    </div>
                                    {option.imageUrl && (
                                      <img
                                        src={option.imageUrl}
                                        alt={`Option ${option.optionId}`}
                                        className="mt-2 max-w-xs rounded"
                                      />
                                    )}
                                  </button>
                                )
                              })}
                              {isReattemptMode && currentQuestionId && !showSolution[currentQuestionId] && (
                                <button
                                  onClick={() => setShowSolution((prev) => ({ ...prev, [currentQuestionId]: true }))}
                                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                                >
                                  View Solution
                                </button>
                              )}
                            </div>

                            {/* Solution Tab */}
                            {((!isReattemptMode && currentQuestion.correctOptionId) || (isReattemptMode && currentQuestionId && showSolution[currentQuestionId])) && (
                              <div className="mt-4 bg-purple-50 p-4 rounded-lg">
                                <p className="text-sm font-medium text-purple-900 mb-2">Solution:</p>
                                {(() => {
                                  const explanationContent = getExplanationContent(currentQuestion)
                                  const hasExplanationText = explanationContent.explanationFormattedText || explanationContent.explanationText
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

                                  if (hasExplanationText || hasExplanationImages) {
                                    return (
                                      <>
                                        {hasExplanationText && (
                                          <>
                                            {explanationContent.explanationFormattedText ? (
                                              (() => {
                                                const isHTML = containsHTML(explanationContent.explanationFormattedText)
                                                return (
                                                  <div
                                                    className="text-sm text-gray-700 prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline [&_img]:inline-block [&_img]:align-middle [&_u]:underline [&_br]:block"
                                                    dangerouslySetInnerHTML={{ __html: isHTML ? decodeHTML(explanationContent.explanationFormattedText) : explanationContent.explanationFormattedText }}
                                                  />
                                                )
                                              })()
                                            ) : (
                                              (() => {
                                                const isHTML = containsHTML(explanationContent.explanationText)
                                                return isHTML ? (
                                                  <div
                                                    className="text-sm text-gray-700 prose prose-sm max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_div]:mb-2 [&_span]:inline [&_img]:inline-block [&_img]:align-middle [&_u]:underline [&_br]:block"
                                                    dangerouslySetInnerHTML={{ __html: decodeHTML(explanationContent.explanationText) }}
                                                  />
                                                ) : (
                                                  <p className="text-sm text-gray-700">{explanationContent.explanationText}</p>
                                                )
                                              })()
                                            )}
                                          </>
                                        )}
                                        {hasExplanationImages && (
                                          <div className={hasExplanationText ? "mt-2 space-y-2" : "space-y-2"}>
                                            {validImages.map((img: string, i: number) => (
                                              <img
                                                key={i}
                                                src={img}
                                                alt={`Explanation ${i + 1}`}
                                                className="max-w-md rounded"
                                                onError={(e) => {
                                                  e.currentTarget.style.display = 'none'
                                                }}
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    )
                                  }
                                  return null
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="border-t bg-white px-4 py-3 flex items-center justify-between flex-shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedSectionId && currentSectionQuestionIndex > 0) {
                        // Navigate to previous question in section
                        const prevSectionQuestion = sectionQuestions[currentSectionQuestionIndex - 1]
                        const prevGlobalIndex = questions.findIndex((q: Question) => {
                          const qId = q.questionId || q._id
                          const prevQId = prevSectionQuestion.questionId || prevSectionQuestion._id
                          return qId === prevQId
                        })
                        if (prevGlobalIndex >= 0) {
                          setCurrentQuestionIndex(prevGlobalIndex)
                        }
                      } else if (!selectedSectionId && currentQuestionIndex > 0) {
                        setCurrentQuestionIndex(currentQuestionIndex - 1)
                      }
                    }}
                    disabled={selectedSectionId ? currentSectionQuestionIndex === 0 : currentQuestionIndex === 0}
                    size="sm"
                  >
                    <FiChevronLeft className="mr-2" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Re-attempt Questions</span>
                    <button
                      onClick={() => setIsReattemptMode(!isReattemptMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        isReattemptMode ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isReattemptMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {selectedSectionId && isLastQuestionInSection && !isLastSection ? (
                    <Button
                      onClick={() => {
                        // Move to next section
                        const nextSection = sortedSections[currentSectionIndex + 1]
                        if (nextSection) {
                          handleSectionChange(nextSection.sectionId)
                        }
                      }}
                      size="sm"
                    >
                      Next Section
                      <FiChevronLeft className="ml-2 rotate-180" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        if (selectedSectionId && currentSectionQuestionIndex < sectionQuestions.length - 1) {
                          // Navigate to next question in section
                          const nextSectionQuestion = sectionQuestions[currentSectionQuestionIndex + 1]
                          const nextGlobalIndex = questions.findIndex((q: Question) => {
                            const qId = q.questionId || q._id
                            const nextQId = nextSectionQuestion.questionId || nextSectionQuestion._id
                            return qId === nextQId
                          })
                          if (nextGlobalIndex >= 0) {
                            setCurrentQuestionIndex(nextGlobalIndex)
                          }
                        } else if (!selectedSectionId && currentQuestionIndex < questions.length - 1) {
                          setCurrentQuestionIndex(currentQuestionIndex + 1)
                        }
                      }}
                      disabled={selectedSectionId ? Boolean(isLastQuestionInSection && isLastSection) : (currentQuestionIndex === questions.length - 1)}
                      size="sm"
                    >
                      Next
                      <FiChevronLeft className="ml-2 rotate-180" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Side - Fixed Sidebar */}
          <div className={`relative flex flex-col border-l bg-white flex-shrink-0 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
          }`}>
            {/* Collapse Button */}
            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white border border-r-0 border-gray-300 rounded-l-lg p-2 hover:bg-gray-50 transition-colors z-20 shadow-sm"
              >
                <FiChevronsRight className="w-5 h-5 text-gray-600" />
              </button>
            )}

            {/* User Greeting */}
            {isSidebarOpen && (
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-medium">Hello {user?.name || 'User'}</p>
              </div>
            )}

            {/* Indication Guidelines */}
            {isSidebarOpen && (
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold mb-3 text-sm">Indication</h3>
                <div className="text-xs flex gap-x-5 gap-y-2 flex-wrap">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-t-lg mr-2 flex-shrink-0" />
                    <span>Correct</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded-b-lg mr-2 flex-shrink-0" />
                    <span>Incorrect</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded mr-2 flex-shrink-0" />
                    <span>Unattempted</span>
                  </div>
                </div>
              </div>
            )}

            {/* Speed Indicators */}
            {/* {isSidebarOpen && (
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold mb-2 text-sm">Speed Indicators</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded mr-1" />
                    <span>Superfast</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-400 rounded mr-1" />
                    <span>On Time</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-400 rounded mr-1" />
                    <span>Slow</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-400 rounded mr-1" />
                    <span>On Time but Wrong</span>
                  </div>
                </div>
              </div>
            )} */}

            {/* Current Section Name */}
            {isSidebarOpen && selectedSectionId && (
              <div className="px-4 py-2 bg-gray-100 border-b">
                <p className="text-sm font-medium">
                  Section: {sections.find((s: any) => s.sectionId === selectedSectionId)?.name || selectedSectionId}
                </p>
              </div>
            )}

            {/* Question Palette */}
            {isSidebarOpen && (
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="grid grid-cols-5 gap-3">
                  {sectionQuestions.map((q: any) => {
                    const qId = q.questionId || q._id
                    const globalIndex = questions.findIndex((q2: Question) => {
                      const q2Id = q2.questionId || q2._id
                      return q2Id === qId
                    })
                    const isCurrent = globalIndex === currentQuestionIndex
                    const isCorrect = q.isCorrect
                    const isAnswered = !!q.selectedOptionId
                    const isMarked = q.markedForReview

                    let boxClasses = 'w-8 h-8 flex items-center justify-center text-xs font-medium relative cursor-pointer'
                    
                    if (isCurrent) {
                      if (isCorrect) {
                        boxClasses += ' bg-green-500 rounded-lg text-white border-2 border-yellow-400'
                      } else if (isAnswered) {
                        boxClasses += ' bg-red-500 rounded-lg text-white border-2 border-yellow-400'
                      } else {
                        boxClasses += ' border-2 border-yellow-400 bg-white text-black rounded-lg'
                      }
                    } else if (isCorrect) {
                      boxClasses += ' bg-green-500 rounded-t-full text-white'
                    } else if (isAnswered) {
                      boxClasses += ' bg-red-500 rounded-b-full text-white'
                    } else {
                      boxClasses += ' border-2 border-gray-300 bg-white text-black'
                    }

                    return (
                      <button
                        key={qId}
                        onClick={() => {
                          setCurrentQuestionIndex(globalIndex)
                          if (hasSections && q.sectionId && selectedSectionId !== q.sectionId) {
                            handleSectionChange(q.sectionId)
                          }
                        }}
                        className={boxClasses}
                      >
                        {q.questionOrder || (globalIndex + 1)}
                        {isMarked && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-white shadow-sm" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Fixed Buttons at Bottom */}
            {isSidebarOpen && (
              <div className="border-t px-4 py-3 flex-shrink-0 space-y-2">
                <Button
                  variant="outline"
                  onClick={() => setShowQuestionPaper(!showQuestionPaper)}
                  className="w-full"
                  size="sm"
                >
                  <FiFileText className="mr-2" />
                  {showQuestionPaper ? 'Hide Question Paper' : 'Question Paper'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSummary(true)}
                  className="w-full"
                  size="sm"
                >
                  Summary
                </Button>
              </div>
            )}
          </div>

          {/* Expand Button */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-r-0 border-gray-300 rounded-l-lg p-2 hover:bg-gray-50 transition-colors z-20 shadow-sm"
            >
              <FiChevronsLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Summary</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold">Section Name</th>
                  <th className="text-center py-3 px-4 font-semibold">No of Questions</th>
                  <th className="text-center py-3 px-4 font-semibold">Correct</th>
                  <th className="text-center py-3 px-4 font-semibold">Incorrect</th>
                  <th className="text-center py-3 px-4 font-semibold">Skipped</th>
                  <th className="text-center py-3 px-4 font-semibold">Marks</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section: any) => {
                  const data = summaryData[section.sectionId]
                  if (!data) return null
                  return (
                    <tr key={section.sectionId} className="border-b">
                      <td className="py-3 px-4">{section.name}</td>
                      <td className="py-3 px-4 text-center">{data.total}</td>
                      <td className="py-3 px-4 text-center text-green-600">{data.correct}</td>
                      <td className="py-3 px-4 text-center text-red-600">{data.incorrect}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{data.skipped}</td>
                      <td className="py-3 px-4 text-center font-semibold">{data.marks}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSummary(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

