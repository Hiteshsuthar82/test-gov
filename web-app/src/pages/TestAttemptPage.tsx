import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Layout from '@/components/layout/Layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { FiClock, FiFlag, FiCheckCircle, FiPause, FiPlay, FiX } from 'react-icons/fi'

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
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set())
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [currentQuestionTime, setCurrentQuestionTime] = useState(0)
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({}) // Track accumulated time per question
  const [isPaused, setIsPaused] = useState(false)
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null)
  const [totalPausedTime, setTotalPausedTime] = useState(0) // Track total paused time
  const [showPauseConfirmation, setShowPauseConfirmation] = useState(false)
  const [showPauseDialog, setShowPauseDialog] = useState(false)
  const questionStartTimeRef = useRef<Date | null>(null)
  const timerIntervalRef = useRef<number | null>(null)
  const questionTimerIntervalRef = useRef<number | null>(null)
  const prevQuestionIndexRef = useRef<number>(-1)

  const { data: attemptData, isLoading: isLoadingAttempt } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: async () => {
      const response = await api.get(`/attempts/${attemptId}`)
      return response.data.data
    },
    enabled: !!attemptId,
  })

  const questions = attemptData?.questions || []

  // Initialize time remaining from attempt data (accounting for pause time)
  useEffect(() => {
    if (attemptData?.testSet?.durationMinutes && attemptData?.startedAt) {
      const startedAt = new Date(attemptData.startedAt)
      const now = new Date()
      // Calculate elapsed time minus any paused time
      const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000) - totalPausedTime
      const totalSeconds = attemptData.testSet.durationMinutes * 60
      const remaining = Math.max(0, totalSeconds - elapsedSeconds)
      setTimeRemaining(remaining)
    }
  }, [attemptData, totalPausedTime])

  // Initialize question times from attempt data
  useEffect(() => {
    if (attemptData?.questions) {
      const initialQuestionTimes: Record<string, number> = {}
      attemptData.questions.forEach((q: any) => {
        if (q.timeSpentSeconds > 0) {
          initialQuestionTimes[q._id] = q.timeSpentSeconds
        }
      })
      setQuestionTimes(initialQuestionTimes)
    }
  }, [attemptData])

  // Mark first question as visited when test starts
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex === 0 && !visitedQuestions.has(questions[0]._id)) {
      setVisitedQuestions(new Set([questions[0]._id]))
      const firstQuestion = questions[0]
      const accumulatedTime = questionTimes[firstQuestion._id] || 0
      setCurrentQuestionTime(accumulatedTime)
      questionStartTimeRef.current = new Date(new Date().getTime() - accumulatedTime * 1000)
    }
  }, [questions.length])

  // Track current question time - only for the active question
  useEffect(() => {
    // Clear any existing interval first
    if (questionTimerIntervalRef.current) {
      clearInterval(questionTimerIntervalRef.current)
      questionTimerIntervalRef.current = null
    }

    // Only start timer if not paused and we have a valid question
    if (isPaused || !questionStartTimeRef.current || questions.length === 0) {
      return
    }

    const currentQ = questions[currentQuestionIndex]
    if (!currentQ) return

    // Start timer for current question only
    questionTimerIntervalRef.current = setInterval(() => {
      if (questionStartTimeRef.current && questions[currentQuestionIndex]?._id === currentQ._id) {
        // Calculate elapsed time since question was opened in THIS session
        const elapsedSinceOpen = Math.floor((new Date().getTime() - questionStartTimeRef.current.getTime()) / 1000)
        // Get accumulated time from previous visits
        const accumulatedTime = questionTimes[currentQ._id] || 0
        // Total time = accumulated from previous visits + time in current session
        const totalTime = accumulatedTime + elapsedSinceOpen
        setCurrentQuestionTime(totalTime)
      }
    }, 1000)

    return () => {
      if (questionTimerIntervalRef.current) {
        clearInterval(questionTimerIntervalRef.current)
        questionTimerIntervalRef.current = null
      }
    }
  }, [currentQuestionIndex, isPaused, questions, questionTimes])

  // Main timer
  useEffect(() => {
    if (isPaused || timeRemaining <= 0) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
      return
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmitTest()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [timeRemaining, isPaused])

  // Save time when leaving a question and load time when entering a question
  useEffect(() => {
    // Save time for previous question when switching away
    if (prevQuestionIndexRef.current !== currentQuestionIndex && prevQuestionIndexRef.current >= 0 && questions.length > 0) {
      const prevQ = questions[prevQuestionIndexRef.current]
      if (prevQ && questionStartTimeRef.current && !isPaused) {
        // Calculate time spent in this session (from when we opened this question)
        const timeSpentThisSession = Math.floor((new Date().getTime() - questionStartTimeRef.current.getTime()) / 1000)
        if (timeSpentThisSession > 0) {
          // Add to accumulated time for this question
          const currentAccumulated = questionTimes[prevQ._id] || 0
          const newAccumulated = currentAccumulated + timeSpentThisSession
          setQuestionTimes((prev) => ({ ...prev, [prevQ._id]: newAccumulated }))
          
          // Update backend with time spent
          updateAnswerMutation.mutate({
            questionId: prevQ._id,
            optionId: selectedOptions[prevQ._id] || '',
            timeSpent: timeSpentThisSession,
          })
        }
      }
    }
    
    // Load time for new question when entering
    if (questions.length > 0 && !isPaused) {
      const currentQ = questions[currentQuestionIndex]
      if (currentQ) {
        setVisitedQuestions((prev) => new Set([...prev, currentQ._id]))
        
        // Get accumulated time for this question (from previous visits)
        const accumulatedTime = questionTimes[currentQ._id] || 0
        
        // Set the current question time display to accumulated time
        setCurrentQuestionTime(accumulatedTime)
        
        // Set start time reference to NOW (not accounting for accumulated time)
        // This way, elapsed time = now - startTime, and total = accumulated + elapsed
        questionStartTimeRef.current = new Date()
        
        // Update previous question index
        prevQuestionIndexRef.current = currentQuestionIndex
      }
    }
  }, [currentQuestionIndex, isPaused, questions, questionTimes])

  const updateAnswerMutation = useMutation({
    mutationFn: async ({ questionId, optionId, timeSpent }: { questionId: string; optionId: string; timeSpent: number }) => {
      return api.put(`/attempts/${attemptId}/answer`, {
        questionId,
        selectedOptionId: optionId,
        markedForReview: false,
        timeSpentIncrementSeconds: timeSpent,
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

  const pauseMutation = useMutation({
    mutationFn: async () => {
      // Save time for current question before pausing
      const currentQ = questions[currentQuestionIndex]
      if (currentQ && questionStartTimeRef.current && !isPaused) {
        const timeSpentThisSession = Math.floor((new Date().getTime() - questionStartTimeRef.current.getTime()) / 1000)
        if (timeSpentThisSession > 0) {
          const currentAccumulated = questionTimes[currentQ._id] || 0
          const newAccumulated = currentAccumulated + timeSpentThisSession
          setQuestionTimes((prev) => ({ ...prev, [currentQ._id]: newAccumulated }))
        }
      }
      return api.post(`/attempts/${attemptId}/pause`)
    },
    onSuccess: () => {
      setIsPaused(true)
      setPauseStartTime(new Date())
      setShowPauseConfirmation(false)
      setShowPauseDialog(true)
    },
  })

  const handleSelectOption = (questionId: string, optionId: string) => {
    // Calculate time spent since question was opened in this session
    const timeSpentSinceOpen = questionStartTimeRef.current 
      ? Math.floor((new Date().getTime() - questionStartTimeRef.current.getTime()) / 1000)
      : 0
    
    // Add to accumulated time for this question
    const accumulatedTime = questionTimes[questionId] || 0
    const totalTimeSpent = accumulatedTime + timeSpentSinceOpen
    
    // Update question times
    setQuestionTimes((prev) => ({ ...prev, [questionId]: totalTimeSpent }))
    
    setSelectedOptions((prev) => ({ ...prev, [questionId]: optionId }))
    updateAnswerMutation.mutate({ questionId, optionId, timeSpent: timeSpentSinceOpen })
    
    // Reset start time for current session (timer continues from now)
    questionStartTimeRef.current = new Date()
    setCurrentQuestionTime(totalTimeSpent)
  }

  const handleClearAnswer = (questionId: string) => {
    // Calculate time spent since question was opened in this session
    const timeSpentSinceOpen = questionStartTimeRef.current 
      ? Math.floor((new Date().getTime() - questionStartTimeRef.current.getTime()) / 1000)
      : 0
    
    // Add to accumulated time for this question
    const accumulatedTime = questionTimes[questionId] || 0
    const totalTimeSpent = accumulatedTime + timeSpentSinceOpen
    
    // Update question times
    setQuestionTimes((prev) => ({ ...prev, [questionId]: totalTimeSpent }))
    
    setSelectedOptions((prev) => {
      const newOptions = { ...prev }
      delete newOptions[questionId]
      return newOptions
    })
    updateAnswerMutation.mutate({ questionId, optionId: '', timeSpent: timeSpentSinceOpen })
    
    // Reset start time for current session (timer continues from now)
    questionStartTimeRef.current = new Date()
    setCurrentQuestionTime(totalTimeSpent)
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

  const handleSaveAndNext = () => {
    const currentQ = questions[currentQuestionIndex]
    if (currentQ) {
      // Calculate time spent since question was opened in this session
      const timeSpentSinceOpen = questionStartTimeRef.current 
        ? Math.floor((new Date().getTime() - questionStartTimeRef.current.getTime()) / 1000)
        : 0
      
      // Add to accumulated time for this question
      const accumulatedTime = questionTimes[currentQ._id] || 0
      const totalTimeSpent = accumulatedTime + timeSpentSinceOpen
      
      // Update question times
      setQuestionTimes((prev) => ({ ...prev, [currentQ._id]: totalTimeSpent }))
      
      if (selectedOptions[currentQ._id]) {
        updateAnswerMutation.mutate({
          questionId: currentQ._id,
          optionId: selectedOptions[currentQ._id],
          timeSpent: timeSpentSinceOpen,
        })
      }
      
      // Move to next question (this will trigger the useEffect to save time and load next question)
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
      }
    }
  }

  const handlePause = () => {
    // Show confirmation dialog first
    setShowPauseConfirmation(true)
  }

  const handleConfirmPause = () => {
    // After confirmation, actually pause the test
    pauseMutation.mutate()
  }

  const handleCancelPause = () => {
    setShowPauseConfirmation(false)
  }

  const handleResume = () => {
    if (pauseStartTime) {
      // Calculate pause duration
      const pauseDuration = Math.floor((new Date().getTime() - pauseStartTime.getTime()) / 1000)
      
      // Add to total paused time
      setTotalPausedTime((prev) => prev + pauseDuration)
      
      // Resume the test
      setIsPaused(false)
      setPauseStartTime(null)
      setShowPauseDialog(false)
      
      // Restart question timer from now (accumulated time is already saved)
      const currentQ = questions[currentQuestionIndex]
      if (currentQ) {
        const accumulatedTime = questionTimes[currentQ._id] || 0
        setCurrentQuestionTime(accumulatedTime)
        questionStartTimeRef.current = new Date() // Start fresh from now
      }
    }
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

  const formatShortTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentQuestion = questions?.[currentQuestionIndex]
  const answeredCount = Object.keys(selectedOptions).length
  const reviewCount = markedForReview.size

  // Initialize selected options and marked for review from attempt data
  useEffect(() => {
    if (attemptData?.questions) {
      const initialSelectedOptions: Record<string, string> = {}
      const initialMarkedForReview = new Set<string>()
      const initialVisited = new Set<string>()

      attemptData.questions.forEach((q: any) => {
        if (q.selectedOptionId) {
          initialSelectedOptions[q._id] = q.selectedOptionId
        }
        if (q.markedForReview) {
          initialMarkedForReview.add(q._id)
        }
        // Mark questions as visited if they have answers or time spent
        if (q.selectedOptionId || q.timeSpentSeconds > 0) {
          initialVisited.add(q._id)
        }
      })

      setSelectedOptions(initialSelectedOptions)
      setMarkedForReview(initialMarkedForReview)
      setVisitedQuestions(initialVisited)
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

  // Get current section questions if section-wise timing is enabled
  const testSet = attemptData?.testSet
  const currentSectionId = attemptData?.currentSectionId
  const sectionQuestions = testSet?.hasSectionWiseTiming && currentSectionId
    ? questions.filter((q: Question) => q.sectionId === currentSectionId)
    : questions

  const getQuestionStatus = (questionId: string, index: number) => {
    const isCurrent = index === currentQuestionIndex
    const isAnswered = !!selectedOptions[questionId]
    const isMarked = markedForReview.has(questionId)
    const isVisited = visitedQuestions.has(questionId)

    if (isCurrent) {
      return 'current' // Red with rounded bottom corners
    }
    if (isAnswered && isMarked) {
      return 'answered-and-marked' // Purple round with green icon
    }
    if (isMarked) {
      return 'marked' // Purple round
    }
    if (isAnswered) {
      return 'answered' // Green with rounded top corners
    }
    if (isVisited) {
      return 'visited' // Red with rounded bottom corners
    }
    return 'not-visited' // White
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Pause Confirmation Dialog */}
        <Dialog open={showPauseConfirmation} onOpenChange={setShowPauseConfirmation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pause Test</DialogTitle>
              <DialogDescription>
                Are you sure you want to pause the test? The timer will stop and you will need to resume to continue.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelPause}>
                Cancel
              </Button>
              <Button onClick={handleConfirmPause}>
                Yes, Pause Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pause Dialog - Cannot be closed except by Resume button */}
        <Dialog open={showPauseDialog} preventClose={true}>
          <DialogContent 
            className="pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <div className="flex items-center gap-3">
                <FiPause className="h-6 w-6 text-yellow-600" />
                <DialogTitle>Test Paused</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                Your test has been paused. The timer has stopped. Click the Resume button below to continue your test.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                onClick={handleResume}
                className="w-full"
                size="lg"
              >
                <FiPlay className="mr-2" />
                Resume Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Header with Timer */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold">{attemptData?.testSet?.name}</h1>
                <p className="text-sm text-gray-600">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
              <div className="flex items-center space-x-4 flex-wrap">
                <div className="flex items-center space-x-2 text-blue-600">
                  <FiClock />
                  <span className="text-sm">Current: {formatShortTime(currentQuestionTime)}</span>
                </div>
                <div className="flex items-center space-x-2 text-red-600">
                  <FiClock />
                  <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                </div>
                {isPaused ? (
                  <Button variant="outline" disabled>
                    <FiPause className="mr-2" />
                    Paused
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handlePause}>
                    <FiPause className="mr-2" />
                    Pause
                  </Button>
                )}
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
                    {currentQuestion.options.map((option: { optionId: string; text: string; imageUrl?: string }) => (
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
                      onClick={() => {
                        const prevIndex = Math.max(0, currentQuestionIndex - 1)
                        if (prevIndex < currentQuestionIndex && questions[prevIndex]) {
                          // Mark previous question as visited
                          setVisitedQuestions((prev) => new Set([...prev, questions[prevIndex]._id]))
                        }
                        setCurrentQuestionIndex(prevIndex)
                      }}
                      disabled={currentQuestionIndex === 0}
                    >
                      Previous
                    </Button>
                    <div className="flex gap-2">
                      {selectedOptions[currentQuestion._id] && (
                        <Button
                          variant="outline"
                          onClick={() => handleClearAnswer(currentQuestion._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FiX className="mr-2" />
                          Clear
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => handleToggleReview(currentQuestion._id)}
                        className={markedForReview.has(currentQuestion._id) ? 'bg-yellow-50' : ''}
                      >
                        <FiFlag className="mr-2" />
                        {markedForReview.has(currentQuestion._id) ? 'Unmark Review' : 'Mark for Review'}
                      </Button>
                      <Button
                        onClick={handleSaveAndNext}
                        disabled={currentQuestionIndex === questions.length - 1}
                      >
                        Save & Next
                      </Button>
                    </div>
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
                    <div className="w-4 h-4 bg-green-500 rounded-t-lg mr-2" />
                    <span>Answered ({answeredCount})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-500 rounded-full mr-2" />
                    <span>Marked for Review ({reviewCount})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded-b-lg mr-2" />
                    <span>Visited</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded mr-2" />
                    <span>Not Visited</span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {sectionQuestions.map((q: Question) => {
                    // Find the global index for this question
                    const globalIndex = questions.findIndex((q2: Question) => q2._id === q._id)
                    const status = getQuestionStatus(q._id, globalIndex)

                    let boxClasses = 'w-10 h-10 border-2 flex items-center justify-center text-sm font-medium relative'
                    
                    if (status === 'current') {
                      boxClasses += ' border-red-600 bg-red-100 rounded-b-lg'
                    } else if (status === 'answered-and-marked') {
                      boxClasses += ' border-purple-600 bg-purple-100 rounded-full'
                    } else if (status === 'marked') {
                      boxClasses += ' border-purple-600 bg-purple-100 rounded-full'
                    } else if (status === 'answered') {
                      boxClasses += ' border-green-500 bg-green-100 rounded-t-lg'
                    } else if (status === 'visited') {
                      boxClasses += ' border-red-500 bg-red-100 rounded-b-lg'
                    } else {
                      boxClasses += ' border-gray-300 bg-white'
                    }

                    return (
                      <button
                        key={q._id}
                        onClick={() => {
                          // Save time for current question before switching
                          const currentQ = questions[currentQuestionIndex]
                          if (currentQ && questionStartTimeRef.current && !isPaused && currentQ._id !== q._id) {
                            const timeSpentThisSession = Math.floor((new Date().getTime() - questionStartTimeRef.current.getTime()) / 1000)
                            if (timeSpentThisSession > 0) {
                              const currentAccumulated = questionTimes[currentQ._id] || 0
                              const newAccumulated = currentAccumulated + timeSpentThisSession
                              setQuestionTimes((prev) => ({ ...prev, [currentQ._id]: newAccumulated }))
                            }
                          }
                          // Mark question as visited when clicked
                          setVisitedQuestions((prev) => new Set([...prev, q._id]))
                          setCurrentQuestionIndex(globalIndex)
                        }}
                        className={boxClasses}
                      >
                        {globalIndex + 1}
                        {status === 'answered-and-marked' && (
                          <FiCheckCircle className="absolute top-0 right-0 w-3 h-3 text-green-600 bg-white rounded-full" />
                        )}
                      </button>
                    )
                  })}
                </div>
                {testSet?.hasSectionWiseTiming && currentSectionId && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Current Section:</strong> {testSet.sections?.find((s: any) => s.sectionId === currentSectionId)?.sectionName || currentSectionId}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Showing {sectionQuestions.length} of {questions.length} questions
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}
