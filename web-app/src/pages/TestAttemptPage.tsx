import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Layout from '@/components/layout/Layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { FiClock, FiFlag, FiCheck, FiPause, FiPlay, FiX, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'

interface Question {
  _id: string
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
    }
  }
  marks: number
  averageTimeSeconds?: number
  sectionId: string
}

export default function TestAttemptPage() {
  const { testSetId, attemptId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  // Initialize language from localStorage (set by instructions page) or default to 'en'
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem('selectedLanguage') || 'en'
  })
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({}) // Track answers saved to backend
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
  const prevQuestionIdRef = useRef<string | null>(null) // Track previous question ID to detect question changes
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
  const justResumedRef = useRef(false) // Track if we just resumed to prevent flicker
  const skipTimerRecalculationRef = useRef(false) // Track if we should skip timer recalculation (after pause calculation)

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

  // Helper function to get available languages for a question
  const getAvailableLanguages = (question: Question): string[] => {
    const available: string[] = ['en'] // English is always available
    const enContent = question.languages?.en
    
    if (!enContent) return available
    
    // Check if Hindi has all required fields
    const hiContent = question.languages?.hi
    if (hiContent) {
      let hiIsComplete = true
      
      // Must have question text
      if (!hiContent.questionText || hiContent.questionText.trim() === '') {
        hiIsComplete = false
      }
      
      // If English has direction, Hindi must have it too
      if (enContent.direction || enContent.directionFormattedText) {
        if (!hiContent.direction && !hiContent.directionFormattedText) {
          hiIsComplete = false
        }
      }
      
      // If English has conclusion, Hindi must have it too
      if (enContent.conclusion || enContent.conclusionFormattedText) {
        if (!hiContent.conclusion && !hiContent.conclusionFormattedText) {
          hiIsComplete = false
        }
      }
      
      // Must have same number of options as English
      if (!hiContent.options || hiContent.options.length !== enContent.options.length) {
        hiIsComplete = false
      }
      
      // All options must have text
      if (hiContent.options) {
        for (const opt of hiContent.options) {
          if (!opt.text || opt.text.trim() === '') {
            hiIsComplete = false
            break
          }
        }
      }
      
      if (hiIsComplete) {
        available.push('hi')
      }
    }
    
    // Check if Gujarati has all required fields
    const guContent = question.languages?.gu
    if (guContent) {
      let guIsComplete = true
      
      // Must have question text
      if (!guContent.questionText || guContent.questionText.trim() === '') {
        guIsComplete = false
      }
      
      // If English has direction, Gujarati must have it too
      if (enContent.direction || enContent.directionFormattedText) {
        if (!guContent.direction && !guContent.directionFormattedText) {
          guIsComplete = false
        }
      }
      
      // If English has conclusion, Gujarati must have it too
      if (enContent.conclusion || enContent.conclusionFormattedText) {
        if (!guContent.conclusion && !guContent.conclusionFormattedText) {
          guIsComplete = false
        }
      }
      
      // Must have same number of options as English
      if (!guContent.options || guContent.options.length !== enContent.options.length) {
        guIsComplete = false
      }
      
      // All options must have text
      if (guContent.options) {
        for (const opt of guContent.options) {
          if (!opt.text || opt.text.trim() === '') {
            guIsComplete = false
            break
          }
        }
      }
      
      if (guIsComplete) {
        available.push('gu')
      }
    }
    
    return available
  }

  // Helper function to get question content for a specific language
  const getQuestionContent = (question: Question, lang: string) => {
    // Try to get from languages object
    if (question.languages && question.languages[lang as keyof typeof question.languages]) {
      const langContent = question.languages[lang as keyof typeof question.languages]
      if (langContent && langContent.questionText) {
        return langContent
      }
    }
    
    // Fall back to English
    return question.languages.en
  }

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
        // Calculate time spent increment for current question before auto-resuming
        const currentQ = questions[currentQuestionIndex]
        const timeSpentIncrement = currentQ ? getTimeSpentIncrement(currentQ._id) : 0
        resumeMutation.mutate({ 
          questionId: currentQ?._id, 
          timeSpentSeconds: timeSpentIncrement > 0 ? timeSpentIncrement : undefined 
        })
        // Update last saved time if we sent time
        if (currentQ && timeSpentIncrement > 0) {
          const lastSaved = lastSavedTimesRef.current[currentQ._id] || 0
          lastSavedTimesRef.current[currentQ._id] = lastSaved + timeSpentIncrement
        }
      } else if (attemptData.status === 'IN_PROGRESS' && attemptData.lastActiveAt && isPaused && autoPausedRef.current) {
        // Test was auto-paused but is now active - auto resume
        // Calculate time spent increment for current question before auto-resuming
        const currentQ = questions[currentQuestionIndex]
        const timeSpentIncrement = currentQ ? getTimeSpentIncrement(currentQ._id) : 0
        resumeMutation.mutate({ 
          questionId: currentQ?._id, 
          timeSpentSeconds: timeSpentIncrement > 0 ? timeSpentIncrement : undefined 
        })
        // Update last saved time if we sent time
        if (currentQ && timeSpentIncrement > 0) {
          const lastSaved = lastSavedTimesRef.current[currentQ._id] || 0
          lastSavedTimesRef.current[currentQ._id] = lastSaved + timeSpentIncrement
        }
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

    // Don't recalculate timer when paused - preserve current timer values
    if (isPaused) {
      return
    }

    // Don't recalculate if we just calculated on pause - timers are already correct
    if (skipTimerRecalculationRef.current && sectionTimerBaseTime !== null) {
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
          const time = (questionTimes[q._id] as number) || 0
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
  }, [attemptData, questionTimes, questions, sectionTimerBaseTime, isPaused])

  // Calculate initial timer from sum of all question times (only when section-wise timing is disabled)
  // Only recalculate on initial load/resume/refresh, not every time questionTimes changes
  useEffect(() => {
    const hasSectionWiseTiming = attemptData?.testSet?.hasSectionWiseTiming === true
    if (!hasSectionWiseTiming && attemptData?.testSet?.durationMinutes && questions.length > 0) {
      // Don't recalculate timer when paused - preserve current timer values
      if (isPaused) {
        return
      }
      // Don't recalculate if we just calculated on pause - timers are already correct
      if (skipTimerRecalculationRef.current && timerBaseTime !== null) {
        return
      }
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
  }, [attemptData, questionTimes, questions.length, timerBaseTime, isPaused])

  // Initialize current question time when question changes or when questionTimes are loaded (for resume)
  useEffect(() => {
    // Only initialize if we have questions, a valid index, and questionTimes has been loaded
    // This ensures it works on resume when questionTimes might load after questions
    // Don't reset currentQuestionTime if test is paused (to preserve the time when paused)
    if (questions.length > 0 && currentQuestionIndex >= 0 && Object.keys(questionTimes).length > 0 && !isPaused) {
      const currentQ = questions[currentQuestionIndex]
      if (currentQ) {
        // Get time from state (already loaded from DB)
        const questionTime = questionTimes[currentQ._id] || 0
        const questionId = currentQ._id
        
        // Check if question actually changed
        const questionChanged = prevQuestionIdRef.current !== questionId
        
        // Always update currentQuestionTime when question changes, regardless of time values
        // This ensures the display shows the correct time for each question
        if (questionChanged) {
          // Question changed - always update to show the new question's time
          setCurrentQuestionTime(questionTime)
          prevQuestionIdRef.current = questionId
          // Reset questionStartTime when question changes (so timer starts fresh for new question)
          questionStartTimeRef.current = new Date()
        } else if (currentQuestionTime === 0 || questionTime > currentQuestionTime) {
          // Same question but time needs updating (initial load or backend update)
          setCurrentQuestionTime(questionTime)
        }
        
        // Set questionStartTime if not already set (for initial load)
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
      prevQuestionIdRef.current = null
      setQuestionReady(false)
    }
    // Note: Don't set questionReady to false if questionTimes is empty yet - wait for it to load
  }, [currentQuestionIndex, questions, questionTimes, attemptData, isPaused]) // Dependencies: question index, questions array, questionTimes, attemptData, and pause state

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
      // Calculate time spent increment for current question before auto-submitting section
      const currentQ = questions[currentQuestionIndex]
      const timeSpentIncrement = currentQ ? getTimeSpentIncrement(currentQ._id) : 0
      // Auto-submit section with time spent
      submitSectionMutation.mutate({ 
        sectionId: currentSectionId, 
        questionId: currentQ?._id,
        timeSpentSeconds: timeSpentIncrement > 0 ? timeSpentIncrement : undefined 
      })
      // Update last saved time if we sent time
      if (currentQ && timeSpentIncrement > 0) {
        const lastSaved = lastSavedTimesRef.current[currentQ._id] || 0
        lastSavedTimesRef.current[currentQ._id] = lastSaved + timeSpentIncrement
        // Also update questionTimes to reflect saved time
        setQuestionTimes((prev) => ({
          ...prev,
          [currentQ._id]: lastSaved + timeSpentIncrement,
        }))
      }
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
          // Calculate time spent increment for current question before auto-submitting section
          const currentQ = questions[currentQuestionIndex]
          const timeSpentIncrement = currentQ ? getTimeSpentIncrement(currentQ._id) : 0
          // Auto-submit section with time spent
          submitSectionMutation.mutate({ 
            sectionId: currentSectionId, 
            questionId: currentQ?._id,
            timeSpentSeconds: timeSpentIncrement > 0 ? timeSpentIncrement : undefined 
          })
          // Update last saved time if we sent time
          if (currentQ && timeSpentIncrement > 0) {
            const currentTime = questionTimes[currentQ._id] || 0
            const lastSaved = lastSavedTimesRef.current[currentQ._id] || 0
            lastSavedTimesRef.current[currentQ._id] = lastSaved + timeSpentIncrement
          }
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
            // Calculate time spent increment for current question before auto-submitting
            const currentQ = questions[currentQuestionIndex]
            const timeSpentIncrement = currentQ ? getTimeSpentIncrement(currentQ._id) : 0
            submitMutation.mutate({ 
              questionId: currentQ?._id, 
              timeSpentSeconds: timeSpentIncrement > 0 ? timeSpentIncrement : undefined 
            })
            // Update last saved time if we sent time
            if (currentQ && timeSpentIncrement > 0) {
              const currentTime = questionTimes[currentQ._id] || 0
              const lastSaved = lastSavedTimesRef.current[currentQ._id] || 0
              lastSavedTimesRef.current[currentQ._id] = lastSaved + timeSpentIncrement
            }
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
        
        // Clear unsaved selection from local state when navigating away
        // Restore saved answer if it exists, otherwise clear the selection
        const currentSelection = selectedOptions[prevQ._id]
        const savedAnswer = savedAnswers[prevQ._id]
        const hasUnsavedSelection = currentSelection && currentSelection !== savedAnswer
        
        if (hasUnsavedSelection) {
          setSelectedOptions((prev) => {
            const newOptions = { ...prev }
            if (savedAnswer) {
              // Restore the saved answer
              newOptions[prevQ._id] = savedAnswer
            } else {
              // No saved answer, clear the unsaved selection
              delete newOptions[prevQ._id]
            }
            return newOptions
          })
        }
        
        // Save if there's an increment OR if question was visited but has no time saved yet
        const shouldSave = increment > 0 || (visitedQuestions.has(prevQ._id) && lastSaved === 0 && currentTime === 0)
        
        if (shouldSave) {
          // Get the actual markedForReview status for this question
          const isMarkedForReview = markedForReview.has(prevQ._id)
          
          // If question was visited but has no time, save at least 1 second to persist visited status
          const timeToSave = increment > 0 ? increment : (visitedQuestions.has(prevQ._id) ? 1 : 0)
          
          if (timeToSave > 0) {
            // Only save the optionId if it's already been saved before (in savedAnswers)
            // Don't save unsaved selections when just navigating
            const optionIdToSave = savedAnswers[prevQ._id] || ''
            
            // Save to backend with correct markedForReview value
            updateAnswerMutation.mutate({
              questionId: prevQ._id,
              optionId: optionIdToSave,
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
  }, [currentQuestionIndex, questions, questionTimes, selectedOptions, savedAnswers, markedForReview, visitedQuestions])

  // Restore saved answer when viewing a question (if it exists and differs from current selection)
  // Only restore when question changes, not when selectedOptions changes
  useEffect(() => {
    if (currentQuestionIndex >= 0 && questions[currentQuestionIndex]) {
      const currentQ = questions[currentQuestionIndex]
      const savedAnswer = savedAnswers[currentQ._id]
      
      // Use functional update to read the latest selectedOptions state
      if (savedAnswer) {
        setSelectedOptions((prev) => {
          const currentSelection = prev[currentQ._id]
          // If current selection differs from saved answer, restore the saved answer
          if (currentSelection !== savedAnswer) {
            return {
              ...prev,
              [currentQ._id]: savedAnswer,
            }
          }
          return prev // No change needed
        })
      }
    }
    // Only depend on currentQuestionIndex and savedAnswers, not selectedOptions
    // This ensures we only restore when navigating to a question, not when user makes a selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, questions, savedAnswers])

  // Helper function to calculate time spent increment for a question
  const getTimeSpentIncrement = (questionId: string): number => {
    const currentTime = questionTimes[questionId] || 0
    const lastSaved = lastSavedTimesRef.current[questionId] || 0
    const increment = currentTime - lastSaved
    // Return increment if positive, otherwise return 0 (or 1 if question was visited but has no time)
    if (increment > 0) {
      return increment
    }
    // If question was visited but has no time saved, return 1 to mark as visited
    if (visitedQuestions.has(questionId) && lastSaved === 0 && currentTime === 0) {
      return 1
    }
    return 0
  }

  const updateAnswerMutation = useMutation({
    mutationFn: async ({ questionId, optionId, timeSpent, markedForReview }: { questionId: string; optionId: string; timeSpent: number; markedForReview?: boolean }) => {
      return api.put(`/attempts/${attemptId}/answer`, {
        questionId,
        selectedOptionId: optionId,
        markedForReview: markedForReview ?? false,
        timeSpentIncrementSeconds: timeSpent,
      })
    },
    onSuccess: (data, variables) => {
      // Update saved answers when mutation succeeds
      setSavedAnswers((prev) => {
        if (variables.optionId) {
          // Save the answer
          return {
            ...prev,
            [variables.questionId]: variables.optionId,
          }
        } else {
          // Clear the answer
          const newAnswers = { ...prev }
          delete newAnswers[variables.questionId]
          return newAnswers
        }
      })
    },
  })

  const toggleReviewMutation = useMutation({
    mutationFn: async ({ questionId, marked, timeSpentSeconds }: { questionId: string; marked: boolean; timeSpentSeconds?: number }) => {
      const body: any = { questionId, markedForReview: marked }
      if (timeSpentSeconds !== undefined && timeSpentSeconds > 0) {
        body.timeSpentIncrementSeconds = timeSpentSeconds
      }
      return api.put(`/attempts/${attemptId}/review`, body)
    },
    // Don't invalidate queries - we update state immediately, so no need to refetch
    // This ensures instant UI updates without waiting for backend
  })

  const submitMutation = useMutation({
    mutationFn: async ({ questionId, timeSpentSeconds }: { questionId?: string; timeSpentSeconds?: number }) => {
      const body: any = {}
      if (questionId) {
        body.questionId = questionId
      }
      if (timeSpentSeconds !== undefined && timeSpentSeconds > 0) {
        body.timeSpentIncrementSeconds = timeSpentSeconds
      }
      return api.post(`/attempts/${attemptId}/submit`, body)
    },
    onSuccess: () => {
      navigate(`/test/${testSetId}/results/${attemptId}`)
    },
  })

  const submitSectionMutation = useMutation({
    mutationFn: async ({ sectionId, questionId, timeSpentSeconds }: { sectionId: string; questionId?: string; timeSpentSeconds?: number }) => {
      // If test is paused, resume it first before submitting section
      if (isPaused && attemptId) {
        try {
          const resumeBody: any = {}
          if (questionId) {
            resumeBody.questionId = questionId
          }
          if (timeSpentSeconds !== undefined && timeSpentSeconds > 0) {
            resumeBody.timeSpentIncrementSeconds = timeSpentSeconds
          }
          await api.post(`/attempts/${attemptId}/resume`, resumeBody)
          setIsPaused(false)
          setShowPauseDialog(false)
        } catch (error) {
          console.error('Failed to resume test before submitting section:', error)
          // Continue anyway, backend will handle it
        }
      }
      const body: any = { sectionId }
      if (questionId) {
        body.questionId = questionId
      }
      if (timeSpentSeconds !== undefined && timeSpentSeconds > 0) {
        body.timeSpentIncrementSeconds = timeSpentSeconds
      }
      return api.post(`/attempts/${attemptId}/submit-section`, body)
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
    mutationFn: async ({ questionId, timeSpentSeconds }: { questionId?: string; timeSpentSeconds?: number }) => {
      const body: any = {}
      if (questionId) {
        body.questionId = questionId
      }
      if (timeSpentSeconds !== undefined && timeSpentSeconds > 0) {
        body.timeSpentIncrementSeconds = timeSpentSeconds
      }
      return api.post(`/attempts/${attemptId}/pause`, body)
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
    mutationFn: async ({ questionId, timeSpentSeconds }: { questionId?: string; timeSpentSeconds?: number }) => {
      const body: any = {}
      if (questionId) {
        body.questionId = questionId
      }
      if (timeSpentSeconds !== undefined && timeSpentSeconds > 0) {
        body.timeSpentIncrementSeconds = timeSpentSeconds
      }
      return api.post(`/attempts/${attemptId}/resume`, body)
    },
    onSuccess: async (data) => {
      // Preserve current timer display values before resuming to prevent flicker
      const currentSectionTimeRemaining = sectionTimeRemaining
      const currentTimeRemaining = timeRemaining
      
      // Keep skipTimerRecalculationRef flag true to prevent recalculation
      // Timers are already correct from pause calculation, no need to recalculate
      // This prevents flicker when isPaused changes to false
      skipTimerRecalculationRef.current = true
      
      // Update timestamp FIRST before setting isPaused to false
      // This ensures countdown calculates correctly when it resumes
      const now = Date.now()
      if (sectionTimerBaseTime !== null && currentSectionTimeRemaining > 0) {
        // Update section timer timestamp to continue countdown smoothly
        // Base time is already correct from pause calculation
        setSectionTimerBaseTimestamp(now)
      }
      if (timerBaseTime !== null && currentTimeRemaining > 0) {
        // Update whole test timer timestamp to continue countdown smoothly
        // Base time is already correct from pause calculation
        setTimerBaseTimestamp(now)
      }
      
      // Now set isPaused to false - countdown will use the updated timestamp
      setIsPaused(false)
      setPauseStartTime(null)
      setShowPauseDialog(false)
      autoPausedRef.current = false
      // Update totalPausedTime from backend response
      if (data.data?.totalPausedSeconds !== undefined) {
        setTotalPausedTime(data.data.totalPausedSeconds)
      }
      
      // Reset the flag after a delay to allow normal recalculation on refresh
      setTimeout(() => {
        skipTimerRecalculationRef.current = false
      }, 2000) // Reset after 2 seconds to allow normal behavior on refresh
      
      // Don't reset calculation flags or invalidate queries - timers are already correct
      // Just continue countdown from preserved values
      // NOTE: Avoid refetching attempt/section timer here to prevent flicker on resume.
      // If needed elsewhere, re-enable with care.
      if (attemptId) {
        queryClient.invalidateQueries({ queryKey: ['attempt', attemptId] })
        queryClient.invalidateQueries({ queryKey: ['section-timer', attemptId] })
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
    // Update state immediately for instant UI feedback (local only, no API call)
    setSelectedOptions((prev) => ({ ...prev, [questionId]: optionId }))
    // API call will be made on Save & Next or Mark for Review
  }

  const handleClearAnswer = (questionId: string) => {
    // Store previous answer for potential rollback
    const previousAnswer = savedAnswers[questionId]
    
    // Update state immediately for instant UI feedback
    setSelectedOptions((prev) => {
      const newOptions = { ...prev }
      delete newOptions[questionId]
      return newOptions
    })
    // Optimistically update savedAnswers immediately for instant palette update
    setSavedAnswers((prev) => {
      const newAnswers = { ...prev }
      delete newAnswers[questionId]
      return newAnswers
    })
    // Get the actual markedForReview status for this question
    const isMarkedForReview = markedForReview.has(questionId)
    // Calculate time spent increment for this question
    const timeSpentIncrement = getTimeSpentIncrement(questionId)
    // Save to backend with time spent
    updateAnswerMutation.mutate({ 
      questionId, 
      optionId: '', 
      timeSpent: timeSpentIncrement, 
      markedForReview: isMarkedForReview 
    }, {
      onError: (error) => {
        // If backend fails, revert the optimistic update
        console.error('Failed to clear answer:', error)
        // Restore the previous saved answer if it existed
        if (previousAnswer) {
          setSavedAnswers((prev) => ({
            ...prev,
            [questionId]: previousAnswer,
          }))
        }
      }
    })
    // Update last saved time if we sent time
    if (timeSpentIncrement > 0) {
      const lastSaved = lastSavedTimesRef.current[questionId] || 0
      lastSavedTimesRef.current[questionId] = lastSaved + timeSpentIncrement
      // Also update questionTimes to reflect saved time
      setQuestionTimes((prev) => ({
        ...prev,
        [questionId]: lastSaved + timeSpentIncrement,
      }))
    }
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
    // BUT: If section-wise timing is enabled AND it's the last question of current section, don't navigate - just save
    // If sections exist but section-wise timing is disabled, find next in same section
    if (willMark) {
      const currentQ = questions[currentQuestionIndex]
      const testSet = attemptData?.testSet
      const hasSections = testSet?.sections && testSet.sections.length > 0
      const hasSectionWiseTiming = testSet?.hasSectionWiseTiming === true
      const currentSectionId = attemptData?.currentSectionId
      
      // Check if it's the last question of the current section when section-wise timing is enabled
      let isLastQuestionOfSection = false
      if (hasSectionWiseTiming && currentQ?.sectionId && currentSectionId && currentQ.sectionId === currentSectionId) {
        const currentSectionQuestions = questions.filter((q: Question) => q.sectionId === currentSectionId)
        const currentSectionIndex = currentSectionQuestions.findIndex((q: Question) => q._id === currentQ._id)
        isLastQuestionOfSection = currentSectionIndex === currentSectionQuestions.length - 1
      }
      
      // If section-wise timing is enabled AND it's the last question of the section, don't navigate - just save
      if (hasSectionWiseTiming && isLastQuestionOfSection) {
        // Don't navigate, just save the preference (mutation will be called below)
        // Exit early from navigation logic
      } else if (currentQ) {
        // Find next question by order within the same section
        let nextIndex = -1
        if (hasSections && !hasSectionWiseTiming && currentQ.sectionId) {
          // Find next question in the same section by order
          const currentSectionQuestions = questions.filter((q: Question) => q.sectionId === currentQ.sectionId)
          const currentOrder = currentQ.questionOrder
          const nextQuestionInSection = currentSectionQuestions
            .filter((q: Question) => q.questionOrder > currentOrder)
            .sort((a: Question, b: Question) => a.questionOrder - b.questionOrder)[0]
          
          if (nextQuestionInSection) {
            nextIndex = questions.findIndex((q: Question) => q._id === nextQuestionInSection._id)
          } else {
            // No more questions in this section, don't move
            // Don't return here - we still need to save the preference
          }
        } else {
          // No sections or section-wise timing, find next by order globally
          const currentOrder = currentQ.questionOrder
          const nextQuestion = questions
            .filter((q: Question) => q.questionOrder > currentOrder)
            .sort((a: Question, b: Question) => a.questionOrder - b.questionOrder)[0]
          
          if (nextQuestion) {
            nextIndex = questions.findIndex((q: Question) => q._id === nextQuestion._id)
          }
        }
        
        if (nextIndex >= 0 && nextIndex < questions.length && nextIndex > currentQuestionIndex) {
          setCurrentQuestionIndex(nextIndex)
        }
      }
    }
    
    // Calculate time spent increment for this question
    const timeSpentIncrement = getTimeSpentIncrement(questionId)
    
    // Get the selected option for this question (if any)
    const selectedOptionId = selectedOptions[questionId] || ''
    
    // Save answer to backend (with option and review status) in background AFTER UI update
    updateAnswerMutation.mutate({
      questionId,
      optionId: selectedOptionId,
      timeSpent: timeSpentIncrement,
      markedForReview: willMark,
    }, {
      onError: (error) => {
        // If backend fails, revert the state change
        console.error('Failed to update answer/review status:', error)
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
    
    // Update last saved time if we sent time
    if (timeSpentIncrement > 0) {
      const lastSaved = lastSavedTimesRef.current[questionId] || 0
      lastSavedTimesRef.current[questionId] = lastSaved + timeSpentIncrement
      // Also update questionTimes to reflect saved time
      setQuestionTimes((prev) => ({
        ...prev,
        [questionId]: lastSaved + timeSpentIncrement,
      }))
    }
    
    // Update last saved time if we sent time
    if (timeSpentIncrement > 0) {
      const lastSaved = lastSavedTimesRef.current[questionId] || 0
      lastSavedTimesRef.current[questionId] = lastSaved + timeSpentIncrement
      // Also update questionTimes to reflect saved time
      setQuestionTimes((prev) => ({
        ...prev,
        [questionId]: lastSaved + timeSpentIncrement,
      }))
    }
  }

  const handleSaveAndNext = () => {
    const currentQ = questions[currentQuestionIndex]
    if (currentQ) {
      // Get the actual markedForReview status for this question
      const isMarkedForReview = markedForReview.has(currentQ._id)
      
      // Calculate time spent increment for this question
      const timeSpentIncrement = getTimeSpentIncrement(currentQ._id)
      
      // Always save answer to backend (even if no option selected, to save time spent)
      const selectedOptionId = selectedOptions[currentQ._id] || ''
      
      // Store previous answer for potential rollback (before optimistic update)
      const previousAnswer = savedAnswers[currentQ._id]
      
      // Optimistically update savedAnswers immediately for instant palette update
      setSavedAnswers((prev) => {
        if (selectedOptionId) {
          // Save the answer
          return {
            ...prev,
            [currentQ._id]: selectedOptionId,
          }
        } else {
          // Clear the answer
          const newAnswers = { ...prev }
          delete newAnswers[currentQ._id]
          return newAnswers
        }
      })
      
      updateAnswerMutation.mutate({
        questionId: currentQ._id,
        optionId: selectedOptionId,
        timeSpent: timeSpentIncrement,
        markedForReview: isMarkedForReview,
      }, {
        onError: (error) => {
          // If backend fails, revert the optimistic update
          console.error('Failed to save answer:', error)
          setSavedAnswers((prev) => {
            if (previousAnswer) {
              // Restore previous answer
              return {
                ...prev,
                [currentQ._id]: previousAnswer,
              }
            } else {
              // Remove the answer we optimistically added
              const newAnswers = { ...prev }
              delete newAnswers[currentQ._id]
              return newAnswers
            }
          })
        }
      })
      
      // Update last saved time if we sent time
      if (timeSpentIncrement > 0) {
        const lastSaved = lastSavedTimesRef.current[currentQ._id] || 0
        lastSavedTimesRef.current[currentQ._id] = lastSaved + timeSpentIncrement
        // Also update questionTimes to reflect saved time
        setQuestionTimes((prev) => ({
          ...prev,
          [currentQ._id]: lastSaved + timeSpentIncrement,
        }))
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
      
      // Find next question by order - if sections exist but section-wise timing is disabled, find next in same section
      let nextIndex = -1
      if (hasSections && !hasSectionWiseTiming && currentQ.sectionId) {
        // Find next question in the same section by order
        const currentSectionQuestions = questions.filter((q: Question) => q.sectionId === currentQ.sectionId)
        const currentOrder = currentQ.questionOrder
        const nextQuestionInSection = currentSectionQuestions
          .filter((q: Question) => q.questionOrder > currentOrder)
          .sort((a: Question, b: Question) => a.questionOrder - b.questionOrder)[0]
        
        if (nextQuestionInSection) {
          nextIndex = questions.findIndex((q: Question) => q._id === nextQuestionInSection._id)
        } else {
          // No more questions in this section, stay on current question
          return
        }
      } else {
        // No sections or section-wise timing, find next by order globally
        const currentOrder = currentQ.questionOrder
        const nextQuestion = questions
          .filter((q: Question) => q.questionOrder > currentOrder)
          .sort((a: Question, b: Question) => a.questionOrder - b.questionOrder)[0]
        
        if (nextQuestion) {
          nextIndex = questions.findIndex((q: Question) => q._id === nextQuestion._id)
        }
      }
      
      // Move to next question immediately
      if (nextIndex >= 0 && nextIndex < questions.length && nextIndex > currentQuestionIndex) {
        setCurrentQuestionIndex(nextIndex)
      }
    }
  }

  const handlePause = () => {
    // Show confirmation dialog first
    setShowPauseConfirmation(true)
  }

  const handleConfirmPause = () => {
    // Calculate time spent increment for current question before pausing
    const currentQ = questions[currentQuestionIndex]
    if (!currentQ) return
    
    // Set isPaused to true IMMEDIATELY to prevent timer recalculation
    // This ensures timers stay at current values when we update questionTimes
    setIsPaused(true)
    
    // Use the current display time (this is what user sees and what we want to save)
    // currentQuestionTime is the actual current time being displayed
    const currentDisplayTime = currentQuestionTime
    const lastSaved = lastSavedTimesRef.current[currentQ._id] || 0
    const timeSpentIncrement = currentDisplayTime - lastSaved
    
    // Only proceed if there's time to save
    if (timeSpentIncrement > 0) {
      // Update last saved time to current display time
      lastSavedTimesRef.current[currentQ._id] = currentDisplayTime
      
      // Update questionTimes to current display time (this is what we're pausing at)
      // This ensures the time is persisted correctly
      // Since isPaused is now true, timer recalculation will be prevented
      const updatedQuestionTimes: Record<string, number> = {
        ...questionTimes,
        [currentQ._id]: currentDisplayTime,
      }
      setQuestionTimes(updatedQuestionTimes)
      
      // Ensure currentQuestionTime is set to the same value
      // This prevents the useEffect from resetting it when questionTimes updates
      setCurrentQuestionTime(currentDisplayTime)
      
      // Calculate and update timer display immediately from question times
      // This ensures the timer shows the correct remaining time when paused
      const testSet = attemptData?.testSet
      const hasSectionWiseTiming = testSet?.hasSectionWiseTiming === true
      const currentSectionId = attemptData?.currentSectionId
      const now = Date.now()
      
      if (hasSectionWiseTiming && currentSectionId && testSet?.sections) {
        // Section-wise timing: Calculate from current section's questions
        const currentSection = testSet.sections.find(
          (s: any) => s.sectionId === currentSectionId
        )
        
        if (currentSection && currentSection.durationMinutes) {
          const sectionDurationSeconds = currentSection.durationMinutes * 60
          
          // Sum time spent in current section's questions
          const currentSectionQuestions = questions.filter((q: Question) => 
            q.sectionId && q.sectionId === currentSectionId
          )
          
          const totalSectionQuestionTime = currentSectionQuestions.reduce((sum: number, q: Question) => {
            const time = (updatedQuestionTimes[q._id] as number) || 0
            return sum + time
          }, 0)
          
          // Remaining = section duration - sum of time spent
          const remaining = Math.max(0, sectionDurationSeconds - totalSectionQuestionTime)
          
          // Update section timer display and base time immediately
          setSectionTimeRemaining(remaining)
          setSectionTimerBaseTime(remaining)
          setSectionTimerBaseTimestamp(now)
          // Mark that we've calculated from questions to prevent recalculation on resume
          sectionTimerCalculatedFromQuestionsRef.current = true
          // Set flag to skip recalculation on resume (timers are already correct)
          skipTimerRecalculationRef.current = true
        }
      } else if (testSet?.durationMinutes) {
        // Whole test timing: Calculate from all questions
        const totalSeconds = testSet.durationMinutes * 60
        
        // Sum all question times
        const totalQuestionTime = Object.values(updatedQuestionTimes).reduce((sum: number, time: unknown) => {
          return sum + (typeof time === 'number' ? time : 0)
        }, 0)
        
        // Remaining = total duration - sum of all question times
        const remaining = Math.max(0, totalSeconds - totalQuestionTime)
        
        // Update whole test timer display and base time immediately
        setTimeRemaining(remaining)
        setTimerBaseTime(remaining)
        setTimerBaseTimestamp(now)
        // Set flag to skip recalculation on resume (timers are already correct)
        skipTimerRecalculationRef.current = true
      }
    }
    
    // Pause the test with time spent (onSuccess will confirm isPaused is true)
    pauseMutation.mutate({ 
      questionId: currentQ._id, 
      timeSpentSeconds: timeSpentIncrement > 0 ? timeSpentIncrement : undefined 
    }, {
      onError: () => {
        // If pause fails, revert isPaused to false
        setIsPaused(false)
      }
    })
  }

  const handleCancelPause = () => {
    setShowPauseConfirmation(false)
  }

  const handleResume = () => {
    // Calculate time spent increment for current question before resuming
    const currentQ = questions[currentQuestionIndex]
    const timeSpentIncrement = currentQ ? getTimeSpentIncrement(currentQ._id) : 0
    // Call backend resume endpoint with time spent
    resumeMutation.mutate({ 
      questionId: currentQ?._id, 
      timeSpentSeconds: timeSpentIncrement > 0 ? timeSpentIncrement : undefined 
    })
    // Update last saved time if we sent time
    if (currentQ && timeSpentIncrement > 0) {
      const lastSaved = lastSavedTimesRef.current[currentQ._id] || 0
      lastSavedTimesRef.current[currentQ._id] = lastSaved + timeSpentIncrement
      // Also update questionTimes to reflect saved time
      setQuestionTimes((prev) => ({
        ...prev,
        [currentQ._id]: lastSaved + timeSpentIncrement,
      }))
    }
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
        // Calculate time spent increment for current question before auto-pausing
        const currentQ = questions[currentQuestionIndex]
        const timeSpentIncrement = currentQ ? getTimeSpentIncrement(currentQ._id) : 0
        pauseMutation.mutate({ 
          questionId: currentQ?._id, 
          timeSpentSeconds: timeSpentIncrement > 0 ? timeSpentIncrement : undefined 
        })
        // Update last saved time if we sent time
        if (currentQ && timeSpentIncrement > 0) {
          const lastSaved = lastSavedTimesRef.current[currentQ._id] || 0
          lastSavedTimesRef.current[currentQ._id] = lastSaved + timeSpentIncrement
          // Also update questionTimes to reflect saved time
          setQuestionTimes((prev) => ({
            ...prev,
            [currentQ._id]: lastSaved + timeSpentIncrement,
          }))
        }
      } else if (isVisible && isPaused && autoPausedRef.current) {
        // User returned - auto resume
        // Calculate time spent increment for current question before auto-resuming
        const currentQ = questions[currentQuestionIndex]
        const timeSpentIncrement = currentQ ? getTimeSpentIncrement(currentQ._id) : 0
        resumeMutation.mutate({ 
          questionId: currentQ?._id, 
          timeSpentSeconds: timeSpentIncrement > 0 ? timeSpentIncrement : undefined 
        })
        // Update last saved time if we sent time
        if (currentQ && timeSpentIncrement > 0) {
          const lastSaved = lastSavedTimesRef.current[currentQ._id] || 0
          lastSavedTimesRef.current[currentQ._id] = lastSaved + timeSpentIncrement
          // Also update questionTimes to reflect saved time
          setQuestionTimes((prev) => ({
            ...prev,
            [currentQ._id]: lastSaved + timeSpentIncrement,
          }))
        }
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

  // Handle keyboard key press to auto-pause test
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only trigger if test is loaded, not paused, and pause dialog is not already showing
      if (!attemptId || !attemptData || isPaused || showPauseDialog) {
        return
      }

      // Check if the target is an input field, textarea, or select (to avoid pausing when user is typing)
      const target = event.target as HTMLElement
      const isInputElement = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' ||
        target.isContentEditable

      // If user is typing in an input field, don't trigger pause
      // But if they press a key anywhere else on the page, trigger pause directly
      if (!isInputElement) {
        // Prevent default behavior and stop propagation
        event.preventDefault()
        event.stopPropagation()
        
        // Directly pause the test (same as clicking pause button and confirming)
        handleConfirmPause()
      }
    }

    // Add event listener to document
    document.addEventListener('keydown', handleKeyPress, true) // Use capture phase to catch all keys

    return () => {
      document.removeEventListener('keydown', handleKeyPress, true)
    }
  }, [attemptId, attemptData, isPaused, showPauseDialog, handleConfirmPause])

  const handleSubmitTest = () => {
    setShowSubmitConfirmation(true)
  }

  const handleConfirmSubmit = () => {
    setShowSubmitConfirmation(false)
    // Calculate time spent increment for current question before submitting
    const currentQ = questions[currentQuestionIndex]
    const timeSpentIncrement = currentQ ? getTimeSpentIncrement(currentQ._id) : 0
    // Submit with time spent
    submitMutation.mutate({ 
      questionId: currentQ?._id, 
      timeSpentSeconds: timeSpentIncrement > 0 ? timeSpentIncrement : undefined 
    })
    // Update last saved time if we sent time
    if (currentQ && timeSpentIncrement > 0) {
      const lastSaved = lastSavedTimesRef.current[currentQ._id] || 0
      lastSavedTimesRef.current[currentQ._id] = lastSaved + timeSpentIncrement
      // Also update questionTimes to reflect saved time
      setQuestionTimes((prev) => ({
        ...prev,
        [currentQ._id]: lastSaved + timeSpentIncrement,
      }))
    }
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
      // Calculate time spent increment for current question before submitting section
      const currentQ = questions[currentQuestionIndex]
      const timeSpentIncrement = currentQ ? getTimeSpentIncrement(currentQ._id) : 0
      // Submit section with time spent
      submitSectionMutation.mutate({ 
        sectionId: currentSectionId, 
        questionId: currentQ?._id,
        timeSpentSeconds: timeSpentIncrement > 0 ? timeSpentIncrement : undefined 
      })
      // Update last saved time if we sent time
      if (currentQ && timeSpentIncrement > 0) {
        const lastSaved = lastSavedTimesRef.current[currentQ._id] || 0
        lastSavedTimesRef.current[currentQ._id] = lastSaved + timeSpentIncrement
        // Also update questionTimes to reflect saved time
        setQuestionTimes((prev) => ({
          ...prev,
          [currentQ._id]: lastSaved + timeSpentIncrement,
        }))
      }
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

  // New format for timer display (minutes and seconds only, no hours)
  const formatTimerMinutesSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return {
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0')
    }
  }

  const currentQuestion = questions?.[currentQuestionIndex]
  
  // Get current question content based on selected language
  const currentQuestionContent = currentQuestion ? getQuestionContent(currentQuestion, selectedLanguage) : null
  const availableLanguages = currentQuestion ? getAvailableLanguages(currentQuestion) : ['en']

  // Ensure selected language is available for current question, otherwise default to English
  useEffect(() => {
    if (currentQuestion && !availableLanguages.includes(selectedLanguage)) {
      setSelectedLanguage('en')
    }
  }, [currentQuestion, availableLanguages, selectedLanguage])
  
  // Use savedAnswers for count (only count answers that have been saved)
  const answeredCount = Object.keys(savedAnswers).filter(key => savedAnswers[key]).length
  const reviewCount = markedForReview.size
  const totalQuestions = questions.length
  const notAnsweredCount = totalQuestions - answeredCount

  // Initialize selected options and marked for review from attempt data
  // Only run on initial load or when attemptData changes significantly (not on every render)
  useEffect(() => {
    if (attemptData?.questions && attemptData.questions.length > 0 && !hasLocalUpdatesRef.current) {
      const initialSelectedOptions: Record<string, string> = {}
      const initialSavedAnswers: Record<string, string> = {}
      const initialMarkedForReview = new Set<string>()
      const initialVisited = new Set<string>()

      attemptData.questions.forEach((q: any) => {
        // Use _id (backend always returns _id)
        const questionId = q._id || q.id
        
        if (q.selectedOptionId) {
          initialSelectedOptions[questionId] = q.selectedOptionId
          initialSavedAnswers[questionId] = q.selectedOptionId // Track saved answers separately
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
      setSavedAnswers(initialSavedAnswers)
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
  if (!currentQuestionContent || !currentQuestionContent.options || !Array.isArray(currentQuestionContent.options)) {
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

  // Determine which questions to show in palette (sorted by questionOrder)
  const sectionQuestions = (hasSectionWiseTiming && currentSectionId
    ? questions.filter((q: Question) => q.sectionId === currentSectionId)
    : hasSections && !hasSectionWiseTiming && selectedSectionId
    ? questions.filter((q: Question) => q.sectionId === selectedSectionId)
    : questions).sort((a: Question, b: Question) => a.questionOrder - b.questionOrder)

  // Calculate section-specific stats when section-wise timing is enabled
  const getSectionStats = () => {
    if (!hasSectionWiseTiming || !currentSectionId) {
      return null
    }
    const currentSectionQuestions = questions.filter((q: Question) => q.sectionId === currentSectionId)
    const sectionAnsweredCount = currentSectionQuestions.filter((q: Question) => savedAnswers[q._id]).length
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

  // Get timer values for display
  const displayTimer = hasSectionWiseTiming ? sectionTimeRemaining : timeRemaining
  const timerDisplay = formatTimerMinutesSeconds(Math.max(0, displayTimer))
  const currentSectionName = hasSectionWiseTiming && currentSectionId
    ? testSet?.sections?.find((s: any) => s.sectionId === currentSectionId)?.name || currentSectionId
    : hasSections && !hasSectionWiseTiming && selectedSectionId
    ? testSet?.sections?.find((s: any) => s.sectionId === selectedSectionId)?.name || selectedSectionId
    : null

  return (
    <Layout>
      <div className="h-screen flex flex-col overflow-hidden">
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

        {/* Top Header */}
        <div className="border-b bg-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="text-xl font-bold">{attemptData?.testSet?.name}</div>
          <div className="flex items-center gap-4">
            {isPaused ? (
              <Button variant="outline" disabled size="sm">
                <FiPause className="mr-2" />
                Paused
              </Button>
            ) : (
              <Button variant="outline" onClick={handlePause} size="sm">
                <FiPause className="mr-2" />
                Pause
              </Button>
            )}
            {/* Timer Display */}
            <div className="flex items-center gap-2 border rounded-lg px-4 py-2 bg-slate-50">
              <span className="text-sm font-medium text-slate-700">Time Left</span>
              <div className="flex items-center gap-1">
                <div className="bg-white border border-slate-300 rounded px-3 py-1 font-mono font-bold text-slate-700">
                  {timerDisplay.minutes}
                </div>
                <span className="text-slate-700 font-bold">:</span>
                <div className="bg-white border border-slate-300 rounded px-3 py-1 font-mono font-bold text-slate-700">
                  {timerDisplay.seconds}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area - Left and Right Split */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Side - Scrollable Content */}
          <div className="flex-1 flex flex-col overflow-hidden border-r">
            {/* First Row: Sections and Question Timer */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {hasSections && testSet?.sections && testSet.sections
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((section: any) => {
                    const isSelected = hasSectionWiseTiming 
                      ? currentSectionId === section.sectionId
                      : selectedSectionId === section.sectionId
                    const isDisabled = hasSectionWiseTiming && currentSectionId !== section.sectionId
                    
                    return (
                      <button
                        key={section.sectionId}
                        onClick={() => {
                          if (!isDisabled && !hasSectionWiseTiming) {
                            setSelectedSectionId(section.sectionId)
                            const firstQuestionInSection = questions.find((q: Question) => q.sectionId === section.sectionId)
                            if (firstQuestionInSection) {
                              const firstIndex = questions.findIndex((q: Question) => q._id === firstQuestionInSection._id)
                              setCurrentQuestionIndex(firstIndex)
                            }
                          }
                        }}
                        disabled={isDisabled}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          isDisabled
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {section.name}
                      </button>
                    )
                  })}
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <FiClock />
                <span>Question Timer: {formatShortTime(currentQuestionTime)}</span>
              </div>
            </div>

            {/* Second Row: Question Number and Info */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 flex-shrink-0">
              <div className="text-lg font-semibold">
                Question {currentQuestion.questionOrder} of {sectionQuestions.length}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600 font-semibold">+{currentQuestion.marks || 1}</span>
                  {attemptData?.testSet?.negativeMarking > 0 && (
                    <span className="text-red-600 font-semibold">-{attemptData.testSet.negativeMarking}</span>
                  )}
                  {currentQuestion?.averageTimeSeconds && (
                    <span className="text-blue-600">
                      <FiClock className="inline w-4 h-4 mr-1" />
                      {currentQuestion.averageTimeSeconds}s
                    </span>
                  )}
                </div>
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
              </div>
            </div>

            {/* Content Box - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                {currentQuestionContent.direction || currentQuestionContent.directionImageUrl ? (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Left Box: Direction */}
                    <div className="bg-blue-50 p-4 rounded-lg overflow-y-auto max-h-full">
                      <p className="text-sm font-medium text-blue-900 mb-2">Direction:</p>
                      {currentQuestionContent.directionFormattedText ? (
                        <div className="text-gray-700 mb-2" dangerouslySetInnerHTML={{ __html: currentQuestionContent.directionFormattedText }} />
                      ) : currentQuestionContent.direction && (
                        <p className="text-gray-700 mb-2">{currentQuestionContent.direction}</p>
                      )}
                      {currentQuestionContent.directionImageUrl && (
                        <img
                          src={currentQuestionContent.directionImageUrl}
                          alt="Direction"
                          className="mt-2 max-w-full rounded"
                        />
                      )}
                    </div>
                    {/* Right Box: Question, Conclusion, Options */}
                    <div className="overflow-y-auto max-h-full">
                      {/* Question */}
                      <div className="mb-4">
                        <div className="text-lg font-medium mb-2">
                          {currentQuestion.questionOrder}.{' '}
                          {currentQuestionContent.questionFormattedText ? (
                            <span dangerouslySetInnerHTML={{ __html: currentQuestionContent.questionFormattedText }} />
                          ) : (
                            <span>{currentQuestionContent.questionText}</span>
                          )}
                        </div>
                        {currentQuestionContent.questionImageUrl && (
                          <img
                            src={currentQuestionContent.questionImageUrl}
                            alt="Question"
                            className="mt-2 max-w-full rounded"
                          />
                        )}
                      </div>

                      {/* Conclusion */}
                      {currentQuestionContent.conclusion && (
                        <div className="bg-green-50 p-4 rounded-lg mb-4">
                          <p className="text-sm font-medium text-green-900 mb-2">Conclusion:</p>
                          {currentQuestionContent.conclusionFormattedText ? (
                            <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: currentQuestionContent.conclusionFormattedText }} />
                          ) : (
                            <p className="text-gray-700">{currentQuestionContent.conclusion}</p>
                          )}
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
                      <div className="space-y-3">
                        {currentQuestionContent.options.map((option: { optionId: string; text: string; imageUrl?: string }) => (
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
                    </div>
                  </div>
                ) : (
                  /* Single Box: Question, Conclusion, Options */
                  <div className="overflow-y-auto">
                    {/* Question */}
                    <div className="mb-4">
                      <div className="text-lg font-medium mb-2">
                        {currentQuestion.questionOrder}.{' '}
                        {currentQuestionContent.questionFormattedText ? (
                          <span dangerouslySetInnerHTML={{ __html: currentQuestionContent.questionFormattedText }} />
                        ) : (
                          <span>{currentQuestionContent.questionText}</span>
                        )}
                      </div>
                      {currentQuestionContent.questionImageUrl && (
                        <img
                          src={currentQuestionContent.questionImageUrl}
                          alt="Question"
                          className="mt-2 max-w-full rounded"
                        />
                      )}
                    </div>

                    {/* Conclusion */}
                    {currentQuestion.conclusion && (
                      <div className="bg-green-50 p-4 rounded-lg mb-4">
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
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="border-t bg-white px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleToggleReview(currentQuestion._id)}
                  className={markedForReview.has(currentQuestion._id) ? 'bg-yellow-50' : ''}
                  size="sm"
                >
                  <FiFlag className="mr-2" />
                  Mark for Review & Next
                </Button>
                {selectedOptions[currentQuestion._id] && (
                  <Button
                    variant="outline"
                    onClick={() => handleClearAnswer(currentQuestion._id)}
                    className="text-red-600 hover:text-red-700"
                    size="sm"
                  >
                    <FiX className="mr-2" />
                    Clear
                  </Button>
                )}
              </div>
              <Button
                onClick={handleSaveAndNext}
                size="sm"
              >
                Save & Next
              </Button>
            </div>
          </div>

          {/* Right Side - Fixed Sidebar */}
          <div className={`relative flex flex-col border-l bg-white flex-shrink-0 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
          }`}>
            {/* Collapse Button - Left Arrow (when open) */}
            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white border border-r-0 border-gray-300 rounded-l-lg p-2 hover:bg-gray-50 transition-colors z-20 shadow-sm"
                aria-label="Collapse sidebar"
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

            {/* Guidelines */}
            {isSidebarOpen && (
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold mb-3 text-sm">Guidelines</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-t-lg mr-2 flex-shrink-0" />
                    <span>Answered ({answeredCount})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-500 rounded-full mr-2 flex-shrink-0" />
                    <span>Marked for Review ({reviewCount})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-500 rounded-full mr-2 relative flex-shrink-0">
                      <FiCheck className="absolute top-0 right-0 w-2.5 h-2.5 text-green-600" />
                    </div>
                    <span>Answered & Marked</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded-b-lg mr-2 flex-shrink-0" />
                    <span>Visited</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded mr-2 flex-shrink-0" />
                    <span>Not Visited</span>
                  </div>
                </div>
              </div>
            )}

            {/* Section Name Row */}
            {isSidebarOpen && currentSectionName && (
              <div className="px-4 py-2 bg-gray-100 border-b">
                <p className="text-sm font-medium">Section: {currentSectionName}</p>
              </div>
            )}

            {/* Question Palette - Scrollable */}
            {isSidebarOpen && (
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="grid grid-cols-5 gap-3">
                  {sectionQuestions.map((q: Question) => {
                  const globalIndex = questions.findIndex((q2: Question) => q2._id === q._id)
                  const isCurrent = globalIndex === currentQuestionIndex
                  const isAnswered = !!savedAnswers[q._id]
                  const isMarked = markedForReview.has(q._id)
                  const hasTimeSpent = (questionTimes[q._id] || 0) > 0
                  const isVisited = isCurrent || visitedQuestions.has(q._id) || hasTimeSpent
                  const isAnsweredAndMarked = isAnswered && isMarked

                  let boxClasses = 'w-8 h-8 flex items-center justify-center text-xs font-medium relative'
                  
                  if (isCurrent) {
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
                  } else if (isAnsweredAndMarked) {
                    boxClasses += ' bg-purple-500 rounded-full text-white'
                  } else if (isMarked) {
                    boxClasses += ' bg-purple-500 rounded-full text-white'
                  } else if (isAnswered) {
                    boxClasses += ' bg-green-500 rounded-t-full text-white'
                  } else if (isVisited) {
                    boxClasses += ' bg-red-500 rounded-b-full text-white'
                  } else {
                    boxClasses += ' border-2 border-gray-300 bg-white text-black'
                  }

                  return (
                    <button
                      key={q._id}
                      onClick={() => {
                        setVisitedQuestions((prev) => {
                          if (prev.has(q._id)) return prev
                          const newSet = new Set(prev)
                          newSet.add(q._id)
                          return newSet
                        })
                        
                        setQuestionTimes((prev) => {
                          if (prev[q._id] !== undefined) return prev
                          return { ...prev, [q._id]: 0 }
                        })
                        
                        const currentTime = questionTimes[q._id] || 0
                        const lastSaved = lastSavedTimesRef.current[q._id] || 0
                        if (currentTime === 0 && lastSaved === 0) {
                          const isMarkedForReview = markedForReview.has(q._id)
                          const optionIdToSave = savedAnswers[q._id] || ''
                          updateAnswerMutation.mutate({
                            questionId: q._id,
                            optionId: optionIdToSave,
                            timeSpent: 1,
                            markedForReview: isMarkedForReview,
                          })
                          setQuestionTimes((prev) => ({ ...prev, [q._id]: 1 }))
                          lastSavedTimesRef.current[q._id] = 1
                        }
                        
                        const savedAnswer = savedAnswers[q._id]
                        if (savedAnswer && selectedOptions[q._id] !== savedAnswer) {
                          setSelectedOptions((prev) => ({ ...prev, [q._id]: savedAnswer }))
                        }
                        
                        if (hasSections && !hasSectionWiseTiming && q.sectionId && selectedSectionId !== q.sectionId) {
                          setSelectedSectionId(q.sectionId)
                        }
                        
                        setCurrentQuestionIndex(globalIndex)
                      }}
                      className={boxClasses}
                    >
                      {q.questionOrder}
                      {isAnsweredAndMarked && (
                        <FiCheck className="absolute top-0 right-0 w-3 h-3 text-green-300" strokeWidth={3} />
                      )}
                    </button>
                  )
                  })}
                </div>
              </div>
            )}

            {/* Submit Button at Bottom */}
            {isSidebarOpen && (
              <div className="border-t px-4 py-3 flex-shrink-0">
                {hasSectionWiseTiming && currentSectionId && !isLastSection ? (
                  <Button
                    variant="destructive"
                    onClick={handleSubmitSection}
                    className="w-full"
                    disabled={submitSectionMutation.isPending}
                  >
                    {submitSectionMutation.isPending ? 'Submitting...' : 'Submit Section'}
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleSubmitTest}
                    className="w-full"
                  >
                    Submit Test
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Expand Button - Right Arrow (when closed) */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-r-0 border-gray-300 rounded-l-lg p-2 hover:bg-gray-50 transition-colors z-20 shadow-sm"
              style={{ transform: 'translateY(-50%)' }}
              aria-label="Expand sidebar"
            >
              <FiChevronsLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
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
