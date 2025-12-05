import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Layout from '@/components/layout/Layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { FiClock, FiFlag, FiCheck, FiPause, FiPlay, FiX } from 'react-icons/fi'

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
  const queryClient = useQueryClient()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set())
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set())
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [currentQuestionTime, setCurrentQuestionTime] = useState(0)
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({}) // Simple object: questionId -> seconds
  const [isPaused, setIsPaused] = useState(false)
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null)
  const [totalPausedTime, setTotalPausedTime] = useState(0) // Track total paused time
  const [showPauseConfirmation, setShowPauseConfirmation] = useState(false)
  const [showPauseDialog, setShowPauseDialog] = useState(false)
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false)
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(10)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const questionStartTimeRef = useRef<Date | null>(null)
  const timerIntervalRef = useRef<number | null>(null)
  const questionTimerIntervalRef = useRef<number | null>(null)
  const prevQuestionIndexRef = useRef<number>(-1)
  const autoPausedRef = useRef(false) // Track if auto-paused due to page visibility
  const lastSavedTimesRef = useRef<Record<string, number>>({}) // Track last saved time for each question
  const timerInitializedRef = useRef(false) // Track if timer has been initialized and started
  const hasLocalUpdatesRef = useRef(false) // Track if we've made local state updates that shouldn't be overwritten

  const { data: attemptData, isLoading: isLoadingAttempt } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: async () => {
      const response = await api.get(`/attempts/${attemptId}`)
      return response.data.data
    },
    enabled: !!attemptId,
  })

  const questions = attemptData?.questions || []

  // Initialize question times from database on page load/resume
  useEffect(() => {
    if (attemptData?.questions) {
      const initialQuestionTimes: Record<string, number> = {}
      const initialLastSaved: Record<string, number> = {}
      
      // Load all question times from database
      attemptData.questions.forEach((q: any) => {
        const time = q.timeSpentSeconds || 0
        initialQuestionTimes[q._id] = time
        initialLastSaved[q._id] = time // Track what was last saved
      })
      
      setQuestionTimes(initialQuestionTimes)
      lastSavedTimesRef.current = initialLastSaved
      
      // Calculate initial timer from sum of all question times
      if (attemptData?.testSet?.durationMinutes) {
        const totalSeconds = attemptData.testSet.durationMinutes * 60
        const totalQuestionTime = Object.values(initialQuestionTimes).reduce((sum, time) => sum + time, 0)
        const remaining = Math.max(0, totalSeconds - totalQuestionTime)
        setTimeRemaining(remaining)
      }
      
      // Also sync totalPausedTime from backend
      if (attemptData.totalPausedSeconds !== undefined) {
        setTotalPausedTime(attemptData.totalPausedSeconds)
      }
      
      // Check if test is paused (lastActiveAt is null)
      if (attemptData.status === 'IN_PROGRESS' && !attemptData.lastActiveAt && !isPaused) {
        // Test is paused - show pause dialog
        setIsPaused(true)
        setShowPauseDialog(true)
        autoPausedRef.current = true
      } else if (attemptData.status === 'IN_PROGRESS' && attemptData.lastActiveAt && isPaused && autoPausedRef.current) {
        // Test was auto-paused but is now active - auto resume
        resumeMutation.mutate()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptData, isPaused])

  // Calculate timer from sum of all question times
  useEffect(() => {
    if (attemptData?.testSet?.durationMinutes && questions.length > 0) {
      const totalSeconds = attemptData.testSet.durationMinutes * 60
      
      // Sum all question times from state
      const totalQuestionTime = Object.values(questionTimes).reduce((sum, time) => sum + time, 0)
      
      // Remaining = total duration - sum of all question times
      const remaining = Math.max(0, totalSeconds - totalQuestionTime)
      setTimeRemaining(remaining)
    }
  }, [attemptData, questionTimes, questions.length])

  // Initialize current question time when question changes
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex >= 0) {
      const currentQ = questions[currentQuestionIndex]
      if (currentQ) {
        // Get time from state (already loaded from DB)
        const questionTime = questionTimes[currentQ._id] || 0
        setCurrentQuestionTime(questionTime)
        
        // Start tracking from now
        questionStartTimeRef.current = new Date()
        
        // Always mark current question as visited
        setVisitedQuestions((prev) => {
          if (prev.has(currentQ._id)) {
            return prev // No change needed
          }
          return new Set([...prev, currentQ._id])
        })
      }
    }
  }, [currentQuestionIndex, questions, questionTimes])

  // Increment current question time every second
  useEffect(() => {
    // Clear any existing interval first
    if (questionTimerIntervalRef.current) {
      clearInterval(questionTimerIntervalRef.current)
      questionTimerIntervalRef.current = null
    }

    // Stop timer if time is up or paused
    if (isPaused || !questionStartTimeRef.current || questions.length === 0 || timeRemaining <= 0) {
      return
    }

    const currentQ = questions[currentQuestionIndex]
    if (!currentQ) return

    // Increment question time every second
    questionTimerIntervalRef.current = setInterval(() => {
      if (questionStartTimeRef.current && questions[currentQuestionIndex]?._id === currentQ._id && !isPaused && timeRemaining > 0) {
        // Increment this question's time in state
        setQuestionTimes((prev) => {
          const newTime = (prev[currentQ._id] || 0) + 1
          return { ...prev, [currentQ._id]: newTime }
        })
        
        // Update display
        setCurrentQuestionTime((prev) => prev + 1)
      }
    }, 1000)

    return () => {
      if (questionTimerIntervalRef.current) {
        clearInterval(questionTimerIntervalRef.current)
        questionTimerIntervalRef.current = null
      }
    }
  }, [currentQuestionIndex, isPaused, questions, timeRemaining])

  // Main timer - countdown every second
  useEffect(() => {
    // Mark timer as initialized once we start the countdown
    if (timeRemaining > 0 && !isPaused && !timerInitializedRef.current) {
      timerInitializedRef.current = true
    }

    if (isPaused || timeRemaining <= 0) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
      
      // When time reaches 0, stop all timers and show submit dialog
      // Only show dialog if timer was actually running (not on initial load)
      if (timeRemaining <= 0 && !showSubmitConfirmation && timerInitializedRef.current) {
        // Stop question timer
        if (questionTimerIntervalRef.current) {
          clearInterval(questionTimerIntervalRef.current)
          questionTimerIntervalRef.current = null
        }
        // Show submit dialog
        setShowSubmitConfirmation(true)
        setAutoSubmitCountdown(10)
      }
      
      return
    }

    // Simple countdown - timer is already calculated from question times sum
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Stop all timers
          if (questionTimerIntervalRef.current) {
            clearInterval(questionTimerIntervalRef.current)
            questionTimerIntervalRef.current = null
          }
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
  }, [timeRemaining, isPaused, showSubmitConfirmation])

  // Auto-submit countdown when dialog is shown due to time expiry
  useEffect(() => {
    if (showSubmitConfirmation && timeRemaining <= 0 && autoSubmitCountdown > 0) {
      const countdownInterval = setInterval(() => {
        setAutoSubmitCountdown((prev) => {
          if (prev <= 1) {
            // Auto submit
            setShowSubmitConfirmation(false)
            submitMutation.mutate()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        clearInterval(countdownInterval)
      }
    }
  }, [showSubmitConfirmation, autoSubmitCountdown, timeRemaining])

  // Save time to backend when changing questions
  useEffect(() => {
    // When question changes, save previous question's time to backend
    if (prevQuestionIndexRef.current !== currentQuestionIndex && prevQuestionIndexRef.current >= 0 && questions.length > 0) {
      const prevQ = questions[prevQuestionIndexRef.current]
      if (prevQ && questionTimes[prevQ._id] !== undefined) {
        // Get current time from state
        const currentTime = questionTimes[prevQ._id] || 0
        // Get last saved time
        const lastSaved = lastSavedTimesRef.current[prevQ._id] || 0
        // Calculate increment
        const increment = currentTime - lastSaved
        
        // Save if there's an increment OR if question was visited but has no time saved yet
        const shouldSave = increment > 0 || (visitedQuestions.has(prevQ._id) && lastSaved === 0 && currentTime === 0)
        
        if (shouldSave) {
          // Get the actual markedForReview status for this question
          const isMarkedForReview = markedForReview.has(prevQ._id)
          
          // If question was visited but has no time, save at least 1 second to persist visited status
          const timeToSave = increment > 0 ? increment : (visitedQuestions.has(prevQ._id) ? 1 : 0)
          
          if (timeToSave > 0) {
            // Save to backend with correct markedForReview value
            updateAnswerMutation.mutate({
              questionId: prevQ._id,
              optionId: selectedOptions[prevQ._id] || '',
              timeSpent: timeToSave,
              markedForReview: isMarkedForReview,
            })
            
            // Update last saved time
            lastSavedTimesRef.current[prevQ._id] = lastSaved + timeToSave
            // Update questionTimes to reflect saved time
            setQuestionTimes((prev) => ({
              ...prev,
              [prevQ._id]: lastSaved + timeToSave,
            }))
          }
        }
      }
    }
    
    // Update previous question index
    prevQuestionIndexRef.current = currentQuestionIndex
  }, [currentQuestionIndex, questions, questionTimes, selectedOptions, markedForReview, visitedQuestions])

  const updateAnswerMutation = useMutation({
    mutationFn: async ({ questionId, optionId, timeSpent, markedForReview }: { questionId: string; optionId: string; timeSpent: number; markedForReview?: boolean }) => {
      return api.put(`/attempts/${attemptId}/answer`, {
        questionId,
        selectedOptionId: optionId,
        markedForReview: markedForReview ?? false,
        timeSpentIncrementSeconds: timeSpent,
      })
    },
  })

  const toggleReviewMutation = useMutation({
    mutationFn: async ({ questionId, marked }: { questionId: string; marked: boolean }) => {
      return api.put(`/attempts/${attemptId}/review`, { questionId, markedForReview: marked })
    },
    // Don't invalidate queries - we update state immediately, so no need to refetch
    // This ensures instant UI updates without waiting for backend
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
      // Time is already in state, just pause
      return api.post(`/attempts/${attemptId}/pause`)
    },
    onSuccess: (data) => {
      setIsPaused(true)
      setPauseStartTime(new Date())
      setShowPauseConfirmation(false)
      setShowPauseDialog(true)
      // Update totalPausedTime from backend response
      if (data.data?.totalPausedSeconds !== undefined) {
        setTotalPausedTime(data.data.totalPausedSeconds)
      }
    },
  })

  const resumeMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/attempts/${attemptId}/resume`)
    },
    onSuccess: async (data) => {
      setIsPaused(false)
      setPauseStartTime(null)
      setShowPauseDialog(false)
      autoPausedRef.current = false
      // Update totalPausedTime from backend response
      if (data.data?.totalPausedSeconds !== undefined) {
        setTotalPausedTime(data.data.totalPausedSeconds)
      }
      // Refetch attempt data to get updated time
      if (attemptId) {
        await queryClient.invalidateQueries({ queryKey: ['attempt', attemptId] })
      }
    },
  })

  const handleSelectOption = (questionId: string, optionId: string) => {
    // Mark that we've made local updates
    hasLocalUpdatesRef.current = true
    // Update state immediately for instant UI feedback
    setSelectedOptions((prev) => ({ ...prev, [questionId]: optionId }))
    // Get the actual markedForReview status for this question
    const isMarkedForReview = markedForReview.has(questionId)
    // Save answer to backend (time is already being tracked by interval)
    updateAnswerMutation.mutate({ questionId, optionId, timeSpent: 0, markedForReview: isMarkedForReview })
  }

  const handleClearAnswer = (questionId: string) => {
    // Update state immediately for instant UI feedback
    setSelectedOptions((prev) => {
      const newOptions = { ...prev }
      delete newOptions[questionId]
      return newOptions
    })
    // Get the actual markedForReview status for this question
    const isMarkedForReview = markedForReview.has(questionId)
    // Save to backend (time is already being tracked by interval)
    updateAnswerMutation.mutate({ questionId, optionId: '', timeSpent: 0, markedForReview: isMarkedForReview })
  }

  const handleToggleReview = (questionId: string) => {
    const isMarked = markedForReview.has(questionId)
    const willMark = !isMarked
    const newMarked = new Set(markedForReview)
    
    if (isMarked) {
      newMarked.delete(questionId)
    } else {
      newMarked.add(questionId)
    }
    
    // Mark that we've made local updates (prevent useEffect from overwriting)
    hasLocalUpdatesRef.current = true
    
    // Update state immediately FIRST for instant UI feedback (synchronous)
    setMarkedForReview(newMarked)
    
    // If marking for review, automatically move to next question immediately
    if (willMark && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
    
    // Save to backend in background AFTER UI update (fire-and-forget, non-blocking)
    toggleReviewMutation.mutate({ questionId, marked: willMark }, {
      onError: (error) => {
        // If backend fails, revert the state change
        console.error('Failed to update review status:', error)
        setMarkedForReview((prev) => {
          const reverted = new Set(prev)
          if (willMark) {
            reverted.delete(questionId)
          } else {
            reverted.add(questionId)
          }
          return reverted
        })
      }
    })
  }

  const handleSaveAndNext = () => {
    const currentQ = questions[currentQuestionIndex]
    if (currentQ) {
      // Get the actual markedForReview status for this question
      const isMarkedForReview = markedForReview.has(currentQ._id)
      
      // Save answer to backend in background (don't wait for response)
      if (selectedOptions[currentQ._id]) {
        updateAnswerMutation.mutate({
          questionId: currentQ._id,
          optionId: selectedOptions[currentQ._id],
          timeSpent: 0,
          markedForReview: isMarkedForReview,
        })
      }
      
      // Move to next question immediately
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
    // Call backend resume endpoint
    resumeMutation.mutate()
  }

  // Handle page visibility changes (user navigates away/returns)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      setIsPageVisible(isVisible)

      if (!attemptId || !attemptData) return

      if (!isVisible && !isPaused) {
        // User navigated away - auto pause
        autoPausedRef.current = true
        pauseMutation.mutate()
      } else if (isVisible && isPaused && autoPausedRef.current) {
        // User returned - auto resume
        resumeMutation.mutate()
      }
    }

    const handleBeforeUnload = () => {
      // When user is about to leave, try to pause the test
      // Note: This may not always work due to browser restrictions
      if (!isPaused && attemptId) {
        // The backend will detect inactivity on next getAttempt call
        // So we don't need to do anything here - the backend handles it
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [attemptId, attemptData, isPaused])

  const handleSubmitTest = () => {
    setShowSubmitConfirmation(true)
  }

  const handleConfirmSubmit = () => {
    setShowSubmitConfirmation(false)
    submitMutation.mutate()
  }

  const handleCancelSubmit = () => {
    setShowSubmitConfirmation(false)
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
  const totalQuestions = questions.length
  const notAnsweredCount = totalQuestions - answeredCount

  // Initialize selected options and marked for review from attempt data
  // Only run on initial load or when attemptData changes significantly (not on every render)
  useEffect(() => {
    if (attemptData?.questions && attemptData.questions.length > 0 && !hasLocalUpdatesRef.current) {
      const initialSelectedOptions: Record<string, string> = {}
      const initialMarkedForReview = new Set<string>()
      const initialVisited = new Set<string>()

      attemptData.questions.forEach((q: any) => {
        // Use _id (backend always returns _id)
        const questionId = q._id || q.id
        
        if (q.selectedOptionId) {
          initialSelectedOptions[questionId] = q.selectedOptionId
        }
        // Check markedForReview - explicitly check for true boolean value
        // Also handle string "true" or any truthy value that represents marked
        if (q.markedForReview === true || q.markedForReview === 'true' || q.markedForReview === 1) {
          initialMarkedForReview.add(questionId)
        }
        // Mark questions as visited if they have answers OR time spent (even 1 second means visited)
        // Check both selectedOptionId and timeSpentSeconds to determine visited status
        if (q.selectedOptionId || (q.timeSpentSeconds !== undefined && q.timeSpentSeconds !== null && q.timeSpentSeconds > 0)) {
          initialVisited.add(questionId)
        }
      })

      // Always include the current question as visited
      if (currentQuestionIndex >= 0 && questions[currentQuestionIndex]) {
        initialVisited.add(questions[currentQuestionIndex]._id)
      }

      // Only set from backend data if we haven't made local updates
      setSelectedOptions(initialSelectedOptions)
      setMarkedForReview(initialMarkedForReview)
      setVisitedQuestions(initialVisited)
    }
  }, [attemptData, currentQuestionIndex, questions])

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
    // Current question is always considered visited
    const isVisited = isCurrent || visitedQuestions.has(questionId)

    if (isCurrent) {
      return 'current' // Shows with status color and yellow border
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

        {/* Submit Confirmation Dialog */}
        <Dialog 
          open={showSubmitConfirmation} 
          onOpenChange={timeRemaining <= 0 ? () => {} : setShowSubmitConfirmation}
          preventClose={timeRemaining <= 0}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {timeRemaining <= 0 ? 'Time Up! Test Will Auto-Submit' : 'Confirm Test Submission'}
              </DialogTitle>
              <DialogDescription>
                {timeRemaining <= 0 ? (
                  <span>Your test time has ended. The test will be automatically submitted in <strong>{autoSubmitCountdown}</strong> seconds.</span>
                ) : (
                  'Please review your test status before submitting:'
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold">Status</th>
                    <th className="text-right py-2 px-3 font-semibold">Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3">Time Left</td>
                    <td className="text-right py-2 px-3 font-medium text-blue-600">
                      {timeRemaining > 0 ? formatTime(timeRemaining) : '00:00'}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Attempted</td>
                    <td className="text-right py-2 px-3 font-medium text-green-600">{answeredCount}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Unattempted</td>
                    <td className="text-right py-2 px-3 font-medium text-red-600">{notAnsweredCount}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Marked</td>
                    <td className="text-right py-2 px-3 font-medium text-purple-600">{reviewCount}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Total Questions</td>
                    <td className="text-right py-2 px-3 font-semibold">{totalQuestions}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <DialogFooter>
              {timeRemaining > 0 ? (
                <>
                  <Button variant="outline" onClick={handleCancelSubmit}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleConfirmSubmit}>
                    Confirm & Submit
                  </Button>
                </>
              ) : (
                <div className="w-full text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Auto-submitting in <span className="font-bold text-red-600">{autoSubmitCountdown}</span> seconds...
                  </p>
                  <Button variant="destructive" onClick={handleConfirmSubmit} className="w-full">
                    Submit Now
                  </Button>
                </div>
              )}
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
                    <div className="w-4 h-4 bg-purple-500 rounded-full mr-2 relative">
                      <FiCheck className="absolute top-0 right-0 w-2.5 h-2.5 text-green-600" />
                    </div>
                    <span>Answered & Marked</span>
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
                <div className="grid grid-cols-5 gap-3">
                  {sectionQuestions.map((q: Question) => {
                    // Find the global index for this question
                    const globalIndex = questions.findIndex((q2: Question) => q2._id === q._id)
                    
                    // Calculate status directly from current state (not from cached status)
                    const isCurrent = globalIndex === currentQuestionIndex
                    const isAnswered = !!selectedOptions[q._id]
                    const isMarked = markedForReview.has(q._id)
                    const isVisited = isCurrent || visitedQuestions.has(q._id)
                    const isAnsweredAndMarked = isAnswered && isMarked
                    
                    // Determine status based on current state
                    let status: string
                    if (isCurrent) {
                      status = 'current'
                    } else if (isAnswered && isMarked) {
                      status = 'answered-and-marked'
                    } else if (isMarked) {
                      status = 'marked'
                    } else if (isAnswered) {
                      status = 'answered'
                    } else if (isVisited) {
                      status = 'visited'
                    } else {
                      status = 'not-visited'
                    }

                    let boxClasses = 'w-8 h-8 flex items-center justify-center text-xs font-medium relative'
                    
                    if (isCurrent) {
                      // Current question: use actual status color but with rounded rectangle shape
                      if (isAnsweredAndMarked) {
                        boxClasses += ' bg-purple-500 rounded-lg text-white border-2 border-yellow-400'
                      } else if (isMarked) {
                        boxClasses += ' bg-purple-500 rounded-lg text-white border-2 border-yellow-400'
                      } else if (isAnswered) {
                        boxClasses += ' bg-green-500 rounded-lg text-white border-2 border-yellow-400'
                      } else if (visitedQuestions.has(q._id)) {
                        boxClasses += ' bg-red-500 rounded-lg text-white border-2 border-yellow-400'
                      } else {
                        boxClasses += ' border-2 border-yellow-400 bg-white text-black rounded-lg'
                      }
                    } else if (status === 'answered-and-marked') {
                      boxClasses += ' bg-purple-500 rounded-full text-white'
                    } else if (status === 'marked') {
                      boxClasses += ' bg-purple-500 rounded-full text-white'
                    } else if (status === 'answered') {
                      boxClasses += ' bg-green-500 rounded-t-full text-white'
                    } else if (status === 'visited') {
                      boxClasses += ' bg-red-500 rounded-b-full text-white'
                    } else {
                      boxClasses += ' border-2 border-gray-300 bg-white text-black'
                    }

                    return (
                      <button
                        key={q._id}
                        onClick={() => {
                          // Mark this question as visited immediately
                          setVisitedQuestions((prev) => {
                            const newSet = new Set(prev)
                            newSet.add(q._id)
                            return newSet
                          })
                          
                          // If question hasn't been visited before (no time spent), save minimal time to backend
                          const currentTime = questionTimes[q._id] || 0
                          const lastSaved = lastSavedTimesRef.current[q._id] || 0
                          if (currentTime === 0 && lastSaved === 0) {
                            // Save 1 second to mark as visited in backend
                            const isMarkedForReview = markedForReview.has(q._id)
                            updateAnswerMutation.mutate({
                              questionId: q._id,
                              optionId: selectedOptions[q._id] || '',
                              timeSpent: 1, // Minimal time to mark as visited
                              markedForReview: isMarkedForReview,
                            })
                            // Update local state immediately
                            setQuestionTimes((prev) => ({
                              ...prev,
                              [q._id]: 1,
                            }))
                            // Update lastSavedTimesRef to prevent duplicate saves
                            lastSavedTimesRef.current[q._id] = 1
                          }
                          
                          // Then switch to this question
                          setCurrentQuestionIndex(globalIndex)
                        }}
                        className={boxClasses}
                      >
                        {globalIndex + 1}
                        {isAnsweredAndMarked && (
                          <FiCheck className="absolute top-0 right-0 w-3 h-3 text-green-300" strokeWidth={3} />
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
