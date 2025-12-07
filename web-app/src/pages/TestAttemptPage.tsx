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
  const [timerBaseTime, setTimerBaseTime] = useState<number | null>(null) // Base remaining seconds calculated from question times
  const [timerBaseTimestamp, setTimerBaseTimestamp] = useState<number | null>(null) // When we calculated the base time
  const [currentQuestionTime, setCurrentQuestionTime] = useState(0)
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({}) // Simple object: questionId -> seconds
  const [sectionTimeRemaining, setSectionTimeRemaining] = useState(0) // Section timer when section-wise timing is enabled
  const [sectionTimerBaseTime, setSectionTimerBaseTime] = useState<number | null>(null) // Base remaining seconds from backend
  const [sectionTimerBaseTimestamp, setSectionTimerBaseTimestamp] = useState<number | null>(null) // When we received the base time
  const [isPaused, setIsPaused] = useState(false)
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null)
  const [totalPausedTime, setTotalPausedTime] = useState(0) // Track total paused time
  const [showPauseConfirmation, setShowPauseConfirmation] = useState(false)
  const [showPauseDialog, setShowPauseDialog] = useState(false)
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false)
  const [showSubmitSectionConfirmation, setShowSubmitSectionConfirmation] = useState(false)
  const [showLastQuestionDialog, setShowLastQuestionDialog] = useState(false)
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(10)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null) // For section selection when hasSectionWiseTiming is false
  const questionStartTimeRef = useRef<Date | null>(null)
  const timerIntervalRef = useRef<number | null>(null)
  const questionTimerIntervalRef = useRef<number | null>(null)
  const sectionTimerIntervalRef = useRef<number | null>(null) // Section timer interval
  const prevQuestionIndexRef = useRef<number>(-1)
  const autoPausedRef = useRef(false) // Track if auto-paused due to page visibility
  const lastSavedTimesRef = useRef<Record<string, number>>({}) // Track last saved time for each question
  const timerInitializedRef = useRef(false) // Track if timer has been initialized and started
  const hasLocalUpdatesRef = useRef(false) // Track if we've made local state updates that shouldn't be overwritten
  const sectionIndexInitializedRef = useRef(false) // Track if we've initialized the question index for current section
  const prevSectionIdRef = useRef<string | undefined>(undefined) // Track previous section ID to detect section changes
  const sectionTimerInitializedRef = useRef(false) // Track if section timer has been initialized
  const sectionTimerCalculatedFromQuestionsRef = useRef(false) // Track if we've calculated from question times (for resume/refresh)
  const [sectionTimerReady, setSectionTimerReady] = useState(false) // State to track section timer initialization (triggers re-renders)
  const [questionReady, setQuestionReady] = useState(false) // State to track when question is initialized (triggers re-renders)
  const sectionTimeRemainingRef = useRef(0) // Ref to track latest section time remaining
  const timeRemainingRef = useRef(0) // Ref to track latest time remaining
  const isPausedRef = useRef(false) // Ref to track latest paused state

  const { data: attemptData, isLoading: isLoadingAttempt } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: async () => {
      const response = await api.get(`/attempts/${attemptId}`)
      return response.data.data
    },
    enabled: !!attemptId,
  })

  // Note: Section timer is now calculated from question times (like whole test timer)
  // No need to query section timer from backend - we calculate it locally

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
      
      // Reset timer base time to allow recalculation on resume/refresh
      // This ensures timer is recalculated from question times on load/resume
      const hasSectionWiseTiming = attemptData?.testSet?.hasSectionWiseTiming === true
      if (!hasSectionWiseTiming) {
        // Reset whole test timer base time
        setTimerBaseTime(null)
        setTimerBaseTimestamp(null)
        timerInitializedRef.current = false
      } else {
        // Reset section timer base time for section-wise timing
        setSectionTimerBaseTime(null)
        setSectionTimerBaseTimestamp(null)
        sectionTimerInitializedRef.current = false
        sectionTimerCalculatedFromQuestionsRef.current = false // Reset flag to allow recalculation
        setSectionTimerReady(false)
      }
      
      // Also sync totalPausedTime from backend
      if (attemptData.totalPausedSeconds !== undefined) {
        setTotalPausedTime(attemptData.totalPausedSeconds)
      }
      
      // Check if test is paused (lastActiveAt is null)
      // When resuming from test details page, auto-resume instead of showing pause dialog
      if (attemptData.status === 'IN_PROGRESS' && !attemptData.lastActiveAt && !isPaused) {
        // Test is paused - auto resume when coming from resume button (don't show dialog)
        // This handles the case when user clicks "Resume" from test details page
        resumeMutation.mutate()
      } else if (attemptData.status === 'IN_PROGRESS' && attemptData.lastActiveAt && isPaused && autoPausedRef.current) {
        // Test was auto-paused but is now active - auto resume
        resumeMutation.mutate()
      }
      
      // When resuming, ensure question is marked as ready after questionTimes are loaded
      // Force the question initialization effect to run by ensuring questionReady is set
      // This is a workaround for the resume case where the effect might not trigger properly
      if (attemptData.questions && attemptData.questions.length > 0 && currentQuestionIndex >= 0) {
        const currentQ = attemptData.questions[currentQuestionIndex]
        if (currentQ && Object.keys(initialQuestionTimes).length > 0) {
          // QuestionTimes have been loaded, ensure question is ready
          // Use setTimeout to ensure this runs after setQuestionTimes state update completes
          setTimeout(() => {
            if (!questionStartTimeRef.current) {
              questionStartTimeRef.current = new Date()
            }
            setQuestionReady(true)
          }, 50) // Small delay to ensure state update has propagated
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptData, isPaused])

  // Calculate section timer from question times (only when section-wise timing is enabled)
  // Similar to whole test timer - calculate from question times on refresh/resume, then countdown smoothly
  useEffect(() => {
    const hasSectionWiseTiming = attemptData?.testSet?.hasSectionWiseTiming === true
    const currentSectionId = attemptData?.currentSectionId
    
    if (!hasSectionWiseTiming || !currentSectionId || !attemptData?.testSet?.sections) {
      // Section timing is not active, reset
      setSectionTimeRemaining(0)
      setSectionTimerBaseTime(null)
      setSectionTimerBaseTimestamp(null)
      sectionTimerInitializedRef.current = false
      setSectionTimerReady(false)
      return
    }

    // Find current section to get its duration
    const currentSection = attemptData.testSet.sections.find(
      (s: any) => s.sectionId === currentSectionId
    )
    
    if (!currentSection || !currentSection.durationMinutes) {
      return
    }

    const sectionDurationSeconds = currentSection.durationMinutes * 60

    // Only calculate if timer hasn't been initialized yet (initial load/resume/refresh)
    // Similar to whole test timer logic
    // Wait for questionTimes to be populated (from attemptData effect)
    // Check if we have question times loaded - if questionTimes has keys, it means we loaded from DB (resume/refresh)
    const hasQuestionTimes = Object.keys(questionTimes).length > 0
    
    // Only calculate if:
    // 1. Timer hasn't been initialized yet (sectionTimerBaseTime === null)
    // 2. We have questions loaded
    // 3. If we have questionTimes, use them (resume/refresh), otherwise start fresh (initial start)
    // 4. If we haven't calculated from questions yet but have questionTimes, recalculate
    const shouldCalculate = sectionTimerBaseTime === null || 
      (hasQuestionTimes && !sectionTimerCalculatedFromQuestionsRef.current)
    
    if (shouldCalculate && questions.length > 0) {
      let remaining: number
      
      if (hasQuestionTimes) {
        // On resume/refresh: Calculate from question times
        // Sum time spent in current section's questions only
        const currentSectionQuestions = questions.filter((q: Question) => {
          // Ensure question has sectionId and it matches current section
          return q.sectionId && q.sectionId === currentSectionId
        })
        
        const totalSectionQuestionTime = currentSectionQuestions.reduce((sum: number, q: Question) => {
          const time = questionTimes[q._id] || 0
          return sum + time
        }, 0)
        
        // Remaining = section duration - sum of time spent in current section's questions
        remaining = Math.max(0, sectionDurationSeconds - totalSectionQuestionTime)
        sectionTimerCalculatedFromQuestionsRef.current = true // Mark that we calculated from questions
      } else {
        // On initial start: Start from full section duration
        // This happens when questionTimes is empty (no data loaded yet)
        remaining = sectionDurationSeconds
      }
      
      // Store base time and timestamp for smooth countdown
      setSectionTimerBaseTime(remaining)
      setSectionTimerBaseTimestamp(Date.now())
      setSectionTimeRemaining(remaining)
      sectionTimerInitializedRef.current = true
      setSectionTimerReady(true) // Update state to trigger question timer effect
    }
  }, [attemptData, questionTimes, questions, sectionTimerBaseTime])

  // Calculate initial timer from sum of all question times (only when section-wise timing is disabled)
  // Only recalculate on initial load/resume/refresh, not every time questionTimes changes
  useEffect(() => {
    const hasSectionWiseTiming = attemptData?.testSet?.hasSectionWiseTiming === true
    if (!hasSectionWiseTiming && attemptData?.testSet?.durationMinutes && questions.length > 0) {
      // Only calculate if timer hasn't been initialized yet (initial load/resume/refresh)
      if (timerBaseTime === null && Object.keys(questionTimes).length > 0) {
        const totalSeconds = attemptData.testSet.durationMinutes * 60
        
        // Sum all question times from state
        const totalQuestionTime = Object.values(questionTimes).reduce((sum, time) => sum + time, 0)
        
        // Remaining = total duration - sum of all question times
        const remaining = Math.max(0, totalSeconds - totalQuestionTime)
        
        // Store base time and timestamp for smooth countdown
        setTimerBaseTime(remaining)
        setTimerBaseTimestamp(Date.now())
        setTimeRemaining(remaining)
        timerInitializedRef.current = true
      }
    } else if (hasSectionWiseTiming) {
      // Reset timer when section-wise timing is enabled
      setTimerBaseTime(null)
      setTimerBaseTimestamp(null)
      timerInitializedRef.current = false
    }
  }, [attemptData, questionTimes, questions.length, timerBaseTime])

  // Initialize current question time when question changes or when questionTimes are loaded (for resume)
  useEffect(() => {
    // Only initialize if we have questions, a valid index, and questionTimes has been loaded
    // This ensures it works on resume when questionTimes might load after questions
    if (questions.length > 0 && currentQuestionIndex >= 0 && Object.keys(questionTimes).length > 0) {
      const currentQ = questions[currentQuestionIndex]
      if (currentQ) {
        // Get time from state (already loaded from DB)
        const questionTime = questionTimes[currentQ._id] || 0
        setCurrentQuestionTime(questionTime)
        
        // Start tracking from now - set this immediately so question timer can start
        // Only set if not already set (to avoid resetting on every render)
        if (!questionStartTimeRef.current) {
          questionStartTimeRef.current = new Date()
        }
        setQuestionReady(true) // Mark question as ready to trigger question timer effect
        
        // Always mark current question as visited
        setVisitedQuestions((prev) => {
          if (prev.has(currentQ._id)) {
            return prev // No change needed
          }
          return new Set([...prev, currentQ._id])
        })
      } else {
        setQuestionReady(false)
      }
    } else if (questions.length === 0 || currentQuestionIndex < 0) {
      // Reset if no question
      questionStartTimeRef.current = null
      setQuestionReady(false)
    }
    // Note: Don't set questionReady to false if questionTimes is empty yet - wait for it to load
  }, [currentQuestionIndex, questions, questionTimes, attemptData]) // Add attemptData to ensure it runs on resume

  // Keep refs in sync with state
  useEffect(() => {
    sectionTimeRemainingRef.current = sectionTimeRemaining
  }, [sectionTimeRemaining])

  useEffect(() => {
    timeRemainingRef.current = timeRemaining
  }, [timeRemaining])

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  // Increment current question time every second
  useEffect(() => {
    // Clear any existing interval first
    if (questionTimerIntervalRef.current) {
      clearInterval(questionTimerIntervalRef.current)
      questionTimerIntervalRef.current = null
    }

    const hasSectionWiseTiming = attemptData?.testSet?.hasSectionWiseTiming === true
    
    // Don't require section timer to be ready - start question timer independently
    // Only check time expired if timers are initialized (but don't block starting)
    const timeExpired = hasSectionWiseTiming 
      ? (sectionTimerInitializedRef.current && sectionTimeRemainingRef.current <= 0)
      : (timerInitializedRef.current && timeRemainingRef.current <= 0)

    // Start timer if question is ready, not paused, has questions, and time not expired
    if (!questionReady || isPausedRef.current || !questionStartTimeRef.current || questions.length === 0 || timeExpired) {
      return
    }

    const currentQ = questions[currentQuestionIndex]
    if (!currentQ) return

    const questionId = currentQ._id

    // Increment question time every second
    questionTimerIntervalRef.current = setInterval(() => {
      // Use refs to get latest values inside interval
      const paused = isPausedRef.current
      const currentQuestion = questions[currentQuestionIndex]
      
      if (questionStartTimeRef.current && currentQuestion?._id === questionId && !paused) {
        // Check time expired again inside interval using refs
        // Only check if timer is initialized (don't block if not initialized yet)
        const expired = hasSectionWiseTiming 
          ? (sectionTimerInitializedRef.current && sectionTimeRemainingRef.current <= 0)
          : (timerInitializedRef.current && timeRemainingRef.current <= 0)
        
        if (!expired) {
          // Increment this question's time in state
          setQuestionTimes((prev) => {
            const newTime = (prev[questionId] || 0) + 1
            return { ...prev, [questionId]: newTime }
          })
          
          // Update display
          setCurrentQuestionTime((prev) => prev + 1)
        }
      }
    }, 1000)

    return () => {
      if (questionTimerIntervalRef.current) {
        clearInterval(questionTimerIntervalRef.current)
        questionTimerIntervalRef.current = null
      }
    }
  }, [currentQuestionIndex, questions, attemptData?.testSet?.hasSectionWiseTiming, sectionTimerReady, questionReady])

  // Main timer - countdown every second (only when section-wise timing is disabled)
  // Use base time approach for smooth countdown (like section timer)
  useEffect(() => {
    const hasSectionWiseTiming = attemptData?.testSet?.hasSectionWiseTiming === true
    
    // Skip main timer if section-wise timing is enabled
    if (hasSectionWiseTiming) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      return
    }

    // Need base time and timestamp to calculate remaining time
    if (timerBaseTime === null || timerBaseTimestamp === null) {
      return
    }

    if (isPaused) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      return
    }

    // Calculate remaining time: base time minus seconds passed since we calculated it
    const calculateRemaining = () => {
      const now = Date.now()
      const secondsPassed = Math.floor((now - timerBaseTimestamp) / 1000)
      return Math.max(0, timerBaseTime - secondsPassed)
    }

    // Update immediately
    const remaining = calculateRemaining()
    setTimeRemaining(remaining)

    // When time reaches 0, stop all timers and show submit dialog
    if (remaining <= 0 && !showSubmitConfirmation && timerInitializedRef.current) {
      // Stop question timer
      if (questionTimerIntervalRef.current) {
        clearInterval(questionTimerIntervalRef.current)
        questionTimerIntervalRef.current = null
      }
      // Show submit dialog
      setShowSubmitConfirmation(true)
      setAutoSubmitCountdown(10)
      return
    }

    // Timer countdown - recalculate from base time every second
    timerIntervalRef.current = setInterval(() => {
      const newRemaining = calculateRemaining()
      setTimeRemaining(newRemaining)
      
      if (newRemaining <= 0) {
        // Stop all timers
        if (questionTimerIntervalRef.current) {
          clearInterval(questionTimerIntervalRef.current)
          questionTimerIntervalRef.current = null
        }
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
        
        // Show submit dialog if not already showing
        if (!showSubmitConfirmation && timerInitializedRef.current) {
          setShowSubmitConfirmation(true)
          setAutoSubmitCountdown(10)
        }
      }
    }, 1000)

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [timerBaseTime, timerBaseTimestamp, isPaused, showSubmitConfirmation, attemptData?.testSet?.hasSectionWiseTiming])

  // Section timer - countdown every second when section-wise timing is enabled
  // Use base time from backend and countdown from there, accounting for time passed
  useEffect(() => {
    const hasSectionWiseTiming = attemptData?.testSet?.hasSectionWiseTiming === true
    const currentSectionId = attemptData?.currentSectionId
    
    // Only run section timer if section-wise timing is enabled
    if (!hasSectionWiseTiming) {
      if (sectionTimerIntervalRef.current) {
        clearInterval(sectionTimerIntervalRef.current)
        sectionTimerIntervalRef.current = null
      }
      return
    }

    // Need base time and timestamp to calculate remaining time
    if (sectionTimerBaseTime === null || sectionTimerBaseTimestamp === null) {
      return
    }

    if (isPaused) {
      if (sectionTimerIntervalRef.current) {
        clearInterval(sectionTimerIntervalRef.current)
        sectionTimerIntervalRef.current = null
      }
      return
    }

    // Calculate remaining time: base time minus seconds passed since we received it
    const calculateRemaining = () => {
      const now = Date.now()
      const secondsPassed = Math.floor((now - sectionTimerBaseTimestamp) / 1000)
      return Math.max(0, sectionTimerBaseTime - secondsPassed)
    }

    // Update immediately
    const remaining = calculateRemaining()
    setSectionTimeRemaining(remaining)

    // When section time reaches 0, auto-submit the section
    if (remaining <= 0 && !showSubmitSectionConfirmation && sectionTimerInitializedRef.current && currentSectionId) {
      // Stop question timer
      if (questionTimerIntervalRef.current) {
        clearInterval(questionTimerIntervalRef.current)
        questionTimerIntervalRef.current = null
      }
      // Auto-submit section
      submitSectionMutation.mutate(currentSectionId)
      return
    }

    // Section timer countdown - recalculate from base time every second
    sectionTimerIntervalRef.current = setInterval(() => {
      const newRemaining = calculateRemaining()
      setSectionTimeRemaining(newRemaining)
      
      if (newRemaining <= 0) {
        // Stop all timers
        if (questionTimerIntervalRef.current) {
          clearInterval(questionTimerIntervalRef.current)
          questionTimerIntervalRef.current = null
        }
        if (sectionTimerIntervalRef.current) {
          clearInterval(sectionTimerIntervalRef.current)
          sectionTimerIntervalRef.current = null
        }
        
        // Auto-submit section if not already submitting
        if (!showSubmitSectionConfirmation && sectionTimerInitializedRef.current && currentSectionId) {
          submitSectionMutation.mutate(currentSectionId)
        }
      }
    }, 1000)

    return () => {
      if (sectionTimerIntervalRef.current) {
        clearInterval(sectionTimerIntervalRef.current)
        sectionTimerIntervalRef.current = null
      }
    }
  }, [sectionTimerBaseTime, sectionTimerBaseTimestamp, isPaused, showSubmitSectionConfirmation, attemptData?.testSet?.hasSectionWiseTiming, attemptData?.currentSectionId])

  // Auto-submit countdown when dialog is shown due to time expiry
  useEffect(() => {
    const hasSectionWiseTiming = attemptData?.testSet?.hasSectionWiseTiming === true
    const timeExpired = hasSectionWiseTiming 
      ? sectionTimeRemaining <= 0 
      : timeRemaining <= 0
    
    if (showSubmitConfirmation && timeExpired && autoSubmitCountdown > 0) {
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
  }, [showSubmitConfirmation, autoSubmitCountdown, timeRemaining, sectionTimeRemaining, attemptData?.testSet?.hasSectionWiseTiming])

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

  const submitSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      // If test is paused, resume it first before submitting section
      if (isPaused && attemptId) {
        try {
          await api.post(`/attempts/${attemptId}/resume`)
          setIsPaused(false)
          setShowPauseDialog(false)
        } catch (error) {
          console.error('Failed to resume test before submitting section:', error)
          // Continue anyway, backend will handle it
        }
      }
      return api.post(`/attempts/${attemptId}/submit-section`, { sectionId })
    },
    onSuccess: async (data) => {
      setShowSubmitSectionConfirmation(false)
      
      // If test is completed, navigate to results
      if (data.data?.testCompleted) {
        navigate(`/test/${testSetId}/results/${attemptId}`)
        return
      }
      
      // Get the next section ID from response
      const nextSectionId = data.data?.currentSectionId
      
      // Reset section timer for new section
      setSectionTimeRemaining(0)
      setSectionTimerBaseTime(null)
      setSectionTimerBaseTimestamp(null)
      sectionTimerInitializedRef.current = false
      setSectionTimerReady(false)
      
      // Refetch attempt data to get updated section info
      if (attemptId) {
        await queryClient.invalidateQueries({ queryKey: ['attempt', attemptId] })
        await queryClient.invalidateQueries({ queryKey: ['section-timer', attemptId] })
        
        // The useEffect watching currentSectionId will handle navigation to first question
        // Just ensure the refetch completes so the new currentSectionId is available
      }
    },
    onError: (error: any) => {
      console.error('Failed to submit section:', error)
      // Show error message to user
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to submit section. Please try again.'
      alert(errorMessage)
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
      // Refetch attempt data and section timer to get updated time
      if (attemptId) {
        await queryClient.invalidateQueries({ queryKey: ['attempt', attemptId] })
        await queryClient.invalidateQueries({ queryKey: ['section-timer', attemptId] })
      }
      // Ensure question timer starts after resume
      if (questions.length > 0 && currentQuestionIndex >= 0) {
        const currentQ = questions[currentQuestionIndex]
        if (currentQ) {
          if (!questionStartTimeRef.current) {
            questionStartTimeRef.current = new Date()
          }
          setQuestionReady(true)
        }
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
    // If sections exist but section-wise timing is disabled, find next in same section
    if (willMark) {
      const currentQ = questions[currentQuestionIndex]
      if (currentQ) {
        let nextIndex = currentQuestionIndex + 1
        if (hasSections && !hasSectionWiseTiming && currentQ.sectionId) {
          // Find next question in the same section
          const currentSectionQuestions = questions.filter((q: Question) => q.sectionId === currentQ.sectionId)
          const currentSectionIndex = currentSectionQuestions.findIndex((q: Question) => q._id === currentQ._id)
          if (currentSectionIndex < currentSectionQuestions.length - 1) {
            // There's a next question in this section
            const nextQuestionInSection = currentSectionQuestions[currentSectionIndex + 1]
            nextIndex = questions.findIndex((q: Question) => q._id === nextQuestionInSection._id)
          } else {
            // No more questions in this section, don't move
            return
          }
        }
        
        if (nextIndex < questions.length && nextIndex > currentQuestionIndex) {
          setCurrentQuestionIndex(nextIndex)
        }
      }
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
      
      // Calculate section-related variables
      const testSet = attemptData?.testSet
      const currentSectionId = attemptData?.currentSectionId
      const hasSections = testSet?.sections && testSet.sections.length > 0
      const hasSectionWiseTiming = testSet?.hasSectionWiseTiming === true
      const isLastSection = hasSectionWiseTiming && currentSectionId && testSet?.sections
        ? (() => {
            const currentSectionIndex = testSet.sections.findIndex((s: any) => s.sectionId === currentSectionId)
            return currentSectionIndex === testSet.sections.length - 1
          })()
        : false
      
      // Check if this is the last question
      let isLastQuestionInSection = false
      let isLastQuestionInTest = false
      
      if (hasSectionWiseTiming && currentQ.sectionId) {
        // Check if it's last question in current section
        const currentSectionQuestions = questions.filter((q: Question) => q.sectionId === currentQ.sectionId)
        const currentSectionIndex = currentSectionQuestions.findIndex((q: Question) => q._id === currentQ._id)
        isLastQuestionInSection = currentSectionIndex === currentSectionQuestions.length - 1
        isLastQuestionInTest = isLastSection && isLastQuestionInSection
      } else if (hasSections && !hasSectionWiseTiming && currentQ.sectionId) {
        // Check if it's last question in selected section
        const currentSectionQuestions = questions.filter((q: Question) => q.sectionId === currentQ.sectionId)
        const currentSectionIndex = currentSectionQuestions.findIndex((q: Question) => q._id === currentQ._id)
        isLastQuestionInSection = currentSectionIndex === currentSectionQuestions.length - 1
        isLastQuestionInTest = false // Can navigate to other sections
      } else {
        // No sections - check if it's last question overall
        isLastQuestionInTest = currentQuestionIndex === questions.length - 1
      }
      
      // If it's the last question, show popup instead of navigating
      if (isLastQuestionInTest || (hasSectionWiseTiming && isLastQuestionInSection)) {
        setShowLastQuestionDialog(true)
        return
      }
      
      // Find next question - if sections exist but section-wise timing is disabled, find next in same section
      let nextIndex = currentQuestionIndex + 1
      if (hasSections && !hasSectionWiseTiming && currentQ.sectionId) {
        // Find next question in the same section
        const currentSectionQuestions = questions.filter((q: Question) => q.sectionId === currentQ.sectionId)
        const currentSectionIndex = currentSectionQuestions.findIndex((q: Question) => q._id === currentQ._id)
        if (currentSectionIndex < currentSectionQuestions.length - 1) {
          // There's a next question in this section
          const nextQuestionInSection = currentSectionQuestions[currentSectionIndex + 1]
          nextIndex = questions.findIndex((q: Question) => q._id === nextQuestionInSection._id)
        } else {
          // No more questions in this section, stay on current question
          return
        }
      }
      
      // Move to next question immediately
      if (nextIndex < questions.length && nextIndex > currentQuestionIndex) {
        setCurrentQuestionIndex(nextIndex)
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

  const handleSubmitSection = () => {
    if (currentSectionId) {
      setShowSubmitSectionConfirmation(true)
    }
  }

  const handleConfirmSubmitSection = () => {
    if (currentSectionId) {
      submitSectionMutation.mutate(currentSectionId)
    }
  }

  const handleCancelSubmitSection = () => {
    setShowSubmitSectionConfirmation(false)
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

  // Navigate to first question when section changes (after section submission)
  useEffect(() => {
    if (attemptData?.testSet && questions.length > 0) {
      const testSet = attemptData.testSet
      const hasSectionWiseTiming = testSet.hasSectionWiseTiming === true
      const currentSectionId = attemptData.currentSectionId
      
      if (hasSectionWiseTiming && currentSectionId) {
        // Check if section has changed (e.g., after section submission)
        // Only navigate if we had a previous section and it's different from current
        if (prevSectionIdRef.current !== undefined && prevSectionIdRef.current !== currentSectionId) {
          // Section changed - navigate to first question of new section
          const firstQuestionInSection = questions.find((q: Question) => q.sectionId === currentSectionId)
          if (firstQuestionInSection) {
            const firstIndex = questions.findIndex((q: Question) => q._id === firstQuestionInSection._id)
            if (firstIndex >= 0) {
              setCurrentQuestionIndex(firstIndex)
            }
          }
          
          // Reset section timer - it will be initialized from backend
          setSectionTimeRemaining(0)
          setSectionTimerBaseTime(null)
          setSectionTimerBaseTimestamp(null)
          sectionTimerInitializedRef.current = false
          setSectionTimerReady(false)
          
          // Refetch section timer for new section
          if (attemptId) {
            queryClient.invalidateQueries({ queryKey: ['section-timer', attemptId] })
          }
        }
        
        // Update previous section ID (initialize on first load)
        if (prevSectionIdRef.current === undefined || prevSectionIdRef.current !== currentSectionId) {
          prevSectionIdRef.current = currentSectionId
        }
      }
    }
  }, [attemptData?.currentSectionId, questions, attemptData?.testSet, attemptId, queryClient])

  // Initialize current question index to first question of current section when section-wise timing is enabled
  useEffect(() => {
    if (attemptData?.testSet && questions.length > 0 && !sectionIndexInitializedRef.current) {
      const testSet = attemptData.testSet
      const hasSectionWiseTiming = testSet.hasSectionWiseTiming === true
      const currentSectionId = attemptData.currentSectionId
      
      if (hasSectionWiseTiming && currentSectionId) {
        // Find first question of current section
        const firstQuestionInSection = questions.find((q: Question) => q.sectionId === currentSectionId)
        if (firstQuestionInSection) {
          const firstIndex = questions.findIndex((q: Question) => q._id === firstQuestionInSection._id)
          // Only update if current index is not already in the current section
          const currentQ = questions[currentQuestionIndex]
          if (currentQ && currentQ.sectionId !== currentSectionId && firstIndex >= 0) {
            setCurrentQuestionIndex(firstIndex)
            sectionIndexInitializedRef.current = true
            prevSectionIdRef.current = currentSectionId
          } else if (currentQ && currentQ.sectionId === currentSectionId) {
            // Already on a question from current section, mark as initialized
            sectionIndexInitializedRef.current = true
            prevSectionIdRef.current = currentSectionId
          }
        }
      } else {
        // Not section-wise timing, mark as initialized
        sectionIndexInitializedRef.current = true
      }
    }
  }, [attemptData, questions, currentQuestionIndex])

  // Initialize selected section when sections exist but section-wise timing is disabled
  useEffect(() => {
    if (attemptData?.testSet && questions.length > 0 && currentQuestionIndex >= 0) {
      const testSet = attemptData.testSet
      const hasSections = testSet.sections && testSet.sections.length > 0
      const hasSectionWiseTiming = testSet.hasSectionWiseTiming === true
      
      if (hasSections && !hasSectionWiseTiming && selectedSectionId === null) {
        const currentQ = questions[currentQuestionIndex]
        if (currentQ) {
          setSelectedSectionId(currentQ.sectionId)
        }
      }
    }
  }, [attemptData, selectedSectionId, questions, currentQuestionIndex])

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
  const hasSections = testSet?.sections && testSet.sections.length > 0
  const hasSectionWiseTiming = testSet?.hasSectionWiseTiming === true

  // Determine which questions to show in palette
  const sectionQuestions = hasSectionWiseTiming && currentSectionId
    ? questions.filter((q: Question) => q.sectionId === currentSectionId)
    : hasSections && !hasSectionWiseTiming && selectedSectionId
    ? questions.filter((q: Question) => q.sectionId === selectedSectionId)
    : questions

  // Calculate section-specific stats when section-wise timing is enabled
  const getSectionStats = () => {
    if (!hasSectionWiseTiming || !currentSectionId) {
      return null
    }
    const currentSectionQuestions = questions.filter((q: Question) => q.sectionId === currentSectionId)
    const sectionAnsweredCount = currentSectionQuestions.filter((q: Question) => selectedOptions[q._id]).length
    const sectionMarkedCount = currentSectionQuestions.filter((q: Question) => markedForReview.has(q._id)).length
    const sectionTotalCount = currentSectionQuestions.length
    const sectionUnansweredCount = sectionTotalCount - sectionAnsweredCount
    
    return {
      answered: sectionAnsweredCount,
      unanswered: sectionUnansweredCount,
      marked: sectionMarkedCount,
      total: sectionTotalCount,
    }
  }

  const sectionStats = getSectionStats()

  // Check if current section is the last section
  const isLastSection = hasSectionWiseTiming && currentSectionId && testSet?.sections
    ? (() => {
        const currentSectionIndex = testSet.sections.findIndex((s: any) => s.sectionId === currentSectionId)
        return currentSectionIndex === testSet.sections.length - 1
      })()
    : false

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
          onOpenChange={() => {
            const hasSectionWiseTiming = attemptData?.testSet?.hasSectionWiseTiming === true
            const timeExpired = hasSectionWiseTiming 
              ? sectionTimeRemaining <= 0 
              : timeRemaining <= 0
            if (!timeExpired) {
              setShowSubmitConfirmation(false)
            }
          }}
          preventClose={(() => {
            const hasSectionWiseTiming = attemptData?.testSet?.hasSectionWiseTiming === true
            return hasSectionWiseTiming 
              ? sectionTimeRemaining <= 0 
              : timeRemaining <= 0
          })()}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {(() => {
                  const hasSectionWiseTiming = attemptData?.testSet?.hasSectionWiseTiming === true
                  const timeExpired = hasSectionWiseTiming 
                    ? sectionTimeRemaining <= 0 
                    : timeRemaining <= 0
                  return timeExpired ? 'Time Up! Test Will Auto-Submit' : 'Confirm Test Submission'
                })()}
              </DialogTitle>
              <DialogDescription>
                {(() => {
                  const hasSectionWiseTiming = attemptData?.testSet?.hasSectionWiseTiming === true
                  const timeExpired = hasSectionWiseTiming 
                    ? sectionTimeRemaining <= 0 
                    : timeRemaining <= 0
                  return timeExpired ? (
                    <span>Your test time has ended. The test will be automatically submitted in <strong>{autoSubmitCountdown}</strong> seconds.</span>
                  ) : (
                    'Please review your test status before submitting:'
                  )
                })()}
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
                      {hasSectionWiseTiming 
                        ? (sectionTimeRemaining > 0 ? formatTime(sectionTimeRemaining) : '00:00')
                        : (timeRemaining > 0 ? formatTime(timeRemaining) : '00:00')
                      }
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
              {(() => {
                const hasSectionWiseTiming = attemptData?.testSet?.hasSectionWiseTiming === true
                const timeExpired = hasSectionWiseTiming 
                  ? sectionTimeRemaining <= 0 
                  : timeRemaining <= 0
                
                return timeExpired ? (
                  <div className="w-full text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      Auto-submitting in <span className="font-bold text-red-600">{autoSubmitCountdown}</span> seconds...
                    </p>
                    <Button variant="destructive" onClick={handleConfirmSubmit} className="w-full">
                      Submit Now
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleCancelSubmit}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleConfirmSubmit}>
                      Confirm & Submit
                    </Button>
                  </>
                )
              })()}
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

        {/* Section Selection Tabs (show when sections exist) */}
        {hasSections && testSet?.sections && (
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {testSet.sections
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((section: any) => {
                    const sectionQuestionsCount = questions.filter((q: Question) => q.sectionId === section.sectionId).length
                    const isSelected = hasSectionWiseTiming 
                      ? currentSectionId === section.sectionId
                      : selectedSectionId === section.sectionId
                    
                    // Get section status from sectionTimings
                    let sectionStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | null = null
                    let tooltipMessage = ""
                    
                    if (hasSectionWiseTiming) {
                      const sectionTiming = attemptData?.sectionTimings?.find(
                        (st: any) => st.sectionId === section.sectionId
                      )
                      
                      if (sectionTiming) {
                        sectionStatus = sectionTiming.status as 'COMPLETED' | 'IN_PROGRESS'
                      } else {
                        // Section not started yet - check if it's before or after current section
                        const currentSectionOrder = testSet.sections.find((s: any) => s.sectionId === currentSectionId)?.order || 0
                        const sectionOrder = section.order
                        if (sectionOrder < currentSectionOrder) {
                          // This section should have been started but wasn't - treat as completed
                          sectionStatus = 'COMPLETED'
                        } else {
                          // Section is pending (not started yet)
                          sectionStatus = 'PENDING'
                        }
                      }
                      
                      // Determine tooltip message based on status
                      if (sectionStatus === 'COMPLETED') {
                        tooltipMessage = "You have submitted this section and cannot access it further."
                      } else if (sectionStatus === 'PENDING') {
                        tooltipMessage = "Submit the current section to open the next section."
                      }
                    }
                    
                    // Current section is enabled, others are disabled when section-wise timing is enabled
                    const isDisabled = hasSectionWiseTiming && currentSectionId !== section.sectionId
                    
                    return (
                      <div key={section.sectionId} className="relative group">
                        <button
                          onClick={() => {
                            if (!isDisabled) {
                              if (hasSectionWiseTiming) {
                                // When section-wise timing is enabled, clicking current section does nothing
                                // (it's already selected and enabled)
                                return
                              } else {
                                setSelectedSectionId(section.sectionId)
                                // Switch to first question of this section
                                const firstQuestionInSection = questions.find((q: Question) => q.sectionId === section.sectionId)
                                if (firstQuestionInSection) {
                                  const firstIndex = questions.findIndex((q: Question) => q._id === firstQuestionInSection._id)
                                  setCurrentQuestionIndex(firstIndex)
                                }
                              }
                            }
                          }}
                          disabled={isDisabled}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            isDisabled
                              ? sectionStatus === 'COMPLETED'
                              ? 'bg-green-100 text-green-700 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title={isDisabled ? tooltipMessage : undefined}
                        >
                          {section.name} ({sectionQuestionsCount})
                          {sectionStatus === 'COMPLETED' && (
                            <span className="ml-2 text-xs">✓</span>
                          )}
                        </button>
                        {isDisabled && tooltipMessage && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            {tooltipMessage}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        )}

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
                {hasSectionWiseTiming ? (
                  <div className="flex items-center space-x-2 text-red-600">
                    <FiClock />
                    <span className="font-mono font-bold">
                      Section: {formatTime(sectionTimeRemaining)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-red-600">
                    <FiClock />
                    <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                  </div>
                )}
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
                    // A question is visited if: it's current, in visitedQuestions set, or has time spent
                    const hasTimeSpent = (questionTimes[q._id] || 0) > 0
                    const isVisited = isCurrent || visitedQuestions.has(q._id) || hasTimeSpent
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
                          // Mark this question as visited immediately - use functional update to ensure we have latest state
                          setVisitedQuestions((prev) => {
                            if (prev.has(q._id)) {
                              return prev // Already visited, no change needed
                            }
                            const newSet = new Set(prev)
                            newSet.add(q._id)
                            return newSet
                          })
                          
                          // Always ensure questionTimes has an entry for this question (even if 0)
                          // This ensures the question is tracked as visited
                          setQuestionTimes((prev) => {
                            if (prev[q._id] !== undefined) {
                              return prev // Already has time, no change needed
                            }
                            return { ...prev, [q._id]: 0 }
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
                          
                          // Update selected section if section-wise timing is disabled and question is from different section
                          if (hasSections && !hasSectionWiseTiming && q.sectionId && selectedSectionId !== q.sectionId) {
                            setSelectedSectionId(q.sectionId)
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
                {hasSectionWiseTiming && currentSectionId && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Current Section:</strong> {testSet.sections?.find((s: any) => s.sectionId === currentSectionId)?.name || currentSectionId}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Showing {sectionQuestions.length} of {questions.length} questions
                    </p>
                  </div>
                )}
                {hasSections && !hasSectionWiseTiming && selectedSectionId && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Selected Section:</strong> {testSet.sections?.find((s: any) => s.sectionId === selectedSectionId)?.name || selectedSectionId}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Showing {sectionQuestions.length} of {questions.length} questions
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Section Button (only when section-wise timing is enabled and not last section) */}
            {hasSectionWiseTiming && currentSectionId && !isLastSection && (
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <Button
                    variant="destructive"
                    onClick={handleSubmitSection}
                    className="w-full"
                    disabled={submitSectionMutation.isPending}
                  >
                    {submitSectionMutation.isPending ? 'Submitting...' : 'Submit Section'}
                  </Button>
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Submit the current section to proceed to the next section
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Last Question Dialog */}
      <Dialog open={showLastQuestionDialog} onOpenChange={setShowLastQuestionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Last Question Reached</DialogTitle>
            <DialogDescription>
              {hasSectionWiseTiming && isLastSection
                ? "You have reached the last question of this section. Please wait till the time allotted for this section is over or submit the test."
                : hasSectionWiseTiming
                ? "You have reached the last question of this section. Please wait till the time allotted for this section is over or submit the section to move to next section."
                : "You have reached the last question of this test. Please wait till the time allotted is over or submit the test."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowLastQuestionDialog(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Section Confirmation Dialog */}
      <Dialog open={showSubmitSectionConfirmation} onOpenChange={setShowSubmitSectionConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Section Submission</DialogTitle>
            <DialogDescription>
              Please review your section status before submitting. Once submitted, you cannot return to this section.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                Current Section: {testSet?.sections?.find((s: any) => s.sectionId === currentSectionId)?.name || currentSectionId}
              </p>
              {!isLastSection && (
                <p className="text-xs text-gray-600">
                  You will be moved to the next section after submission.
                </p>
              )}
            </div>
            {sectionStats && (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold">Status</th>
                    <th className="text-right py-2 px-3 font-semibold">Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3">Attempted</td>
                    <td className="text-right py-2 px-3 font-medium text-green-600">{sectionStats.answered}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Unattempted</td>
                    <td className="text-right py-2 px-3 font-medium text-red-600">{sectionStats.unanswered}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Marked</td>
                    <td className="text-right py-2 px-3 font-medium text-purple-600">{sectionStats.marked}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Total Questions</td>
                    <td className="text-right py-2 px-3 font-semibold">{sectionStats.total}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelSubmitSection}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmSubmitSection} disabled={submitSectionMutation.isPending}>
              {submitSectionMutation.isPending ? 'Submitting...' : 'Confirm & Submit Section'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
