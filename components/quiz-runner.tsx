"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { submitQuizAttempt } from "@/app/actions/subscriptions"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Trophy,
  Timer,
  WifiOff,
  AlertTriangle,
} from "lucide-react"

interface Question {
  id: number
  question: string
  options: string[]
  explanation?: string | null
}

interface Quiz {
  id: number
  title: string
  description: string | null
  moduleNumber: number
  passingScore: number
  /** Time limit in minutes; null = no limit */
  timeLimitMinutes?: number | null
}

interface QuizRunnerProps {
  quiz: Quiz
  questions: Question[]
  courseName: string
  courseId: number
  departmentName: string
  /** Whether this student has exceeded their attempt quota for the 7-day period */
  attemptBlocked?: boolean
  attemptBlockReason?: string
}

const OFFLINE_STORAGE_KEY = (quizId: number) => `tataiso_quiz_${quizId}`
const OFFLINE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function QuizRunner({
  quiz,
  questions,
  courseName,
  courseId,
  departmentName,
  attemptBlocked,
  attemptBlockReason,
}: QuizRunnerProps) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1))
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    score: number
    passed: boolean
    aiFeedback?: string
  } | null>(null)

  // Time limit state — Req 6.1
  const totalSeconds = quiz.timeLimitMinutes ? quiz.timeLimitMinutes * 60 : null
  const [secondsLeft, setSecondsLeft] = useState<number | null>(totalSeconds)
  const [timerRunning, setTimerRunning] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Offline state — Req 6.7
  const [isOnline, setIsOnline] = useState(true)
  const offlineStartRef = useRef<number | null>(null)
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Offline detection ──────────────────────────────────────
  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false)
      setTimerRunning(false) // Pause timer
      offlineStartRef.current = Date.now()

      // Persist current state (Req 6.7)
      try {
        localStorage.setItem(
          OFFLINE_STORAGE_KEY(quiz.id),
          JSON.stringify({
            answers,
            current,
            secondsLeft,
            timestamp: Date.now(),
          })
        )
      } catch {}

      // Auto-submit after 10 minutes offline (Req 6.7)
      offlineTimerRef.current = setTimeout(() => {
        handleSubmit(true)
      }, OFFLINE_TIMEOUT_MS)
    }

    const handleOnline = () => {
      setIsOnline(true)
      setTimerRunning(true) // Resume timer

      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current)
        offlineTimerRef.current = null
      }

      // Restore persisted state
      try {
        const saved = localStorage.getItem(OFFLINE_STORAGE_KEY(quiz.id))
        if (saved) {
          const { answers: savedAnswers, current: savedCurrent, secondsLeft: savedSeconds } =
            JSON.parse(saved)
          setAnswers(savedAnswers)
          setCurrent(savedCurrent)
          if (savedSeconds !== null) setSecondsLeft(savedSeconds)
          localStorage.removeItem(OFFLINE_STORAGE_KEY(quiz.id))
        }
      } catch {}
    }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [answers, current, secondsLeft, quiz.id])

  // ── Countdown timer ────────────────────────────────────────
  useEffect(() => {
    if (secondsLeft === null || !timerRunning || result) return

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          // Time expired — auto-submit (Req 6.2)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timerRunning, result])

  // Stop timer when result arrives
  useEffect(() => {
    if (result && timerRef.current) {
      clearInterval(timerRef.current)
    }
  }, [result])

  const answeredCount = answers.filter((a) => a !== -1).length
  const progressValue = (answeredCount / questions.length) * 100
  const allAnswered = answeredCount === questions.length

  function selectAnswer(value: string) {
    const next = [...answers]
    next[current] = Number.parseInt(value, 10)
    setAnswers(next)
  }

  const handleSubmit = useCallback(
    async (autoSubmit = false) => {
      if (submitting) return
      setSubmitting(true)
      if (timerRef.current) clearInterval(timerRef.current)
      try {
        const res = await submitQuizAttempt(quiz.id, answers)
        setResult({ score: res.score, passed: res.passed, aiFeedback: res.aiFeedback })
        try {
          localStorage.removeItem(OFFLINE_STORAGE_KEY(quiz.id))
        } catch {}
      } catch (err: any) {
        console.error("[quiz] submit error:", err)
      } finally {
        setSubmitting(false)
      }
    },
    [quiz.id, answers, submitting]
  )

  // ── Blocked attempt (Free Trial limit) — Req 6.5 ──────────
  if (attemptBlocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link
          href={`/dashboard/course/${courseId}`}
          className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-6" })}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to course
        </Link>
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="inline-flex p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400 mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Assessment Limit Reached</h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              {attemptBlockReason ??
                "You have reached the maximum number of assessment attempts for your current plan."}
            </p>
            <Link href="/pricing" className={buttonVariants({ className: "mt-6" })}>
              Upgrade Plan
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">This assessment has no questions yet.</p>
        <Link
          href={`/dashboard/course/${courseId}`}
          className={buttonVariants({ variant: "outline", className: "mt-4 bg-transparent" })}
        >
          Back to course
        </Link>
      </div>
    )
  }

  // ── Result screen — Req 6.3 ───────────────────────────────
  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div
              className={`inline-flex p-4 rounded-full mb-4 ${
                result.passed
                  ? "bg-accent/15 text-accent"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {result.passed ? (
                <Trophy className="h-8 w-8" />
              ) : (
                <RotateCcw className="h-8 w-8" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {result.passed ? "Assessment Passed!" : "Keep Practicing"}
            </h1>
            <p className="text-muted-foreground mt-2">
              You scored{" "}
              <span className="font-semibold text-foreground">{result.score}%</span>{" "}
              (passing score is {quiz.passingScore}%)
            </p>
            {result.aiFeedback && (
              <div className="rounded-xl border border-border bg-muted p-4 text-left text-sm text-foreground mt-4">
                <p className="font-semibold mb-2">AI Marking Summary</p>
                <p>{result.aiFeedback}</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-3 mt-6">
              <Link
                href={`/dashboard/course/${courseId}`}
                className={buttonVariants({ variant: "outline", className: "bg-transparent" })}
              >
                Back to course
              </Link>
              {!result.passed && (
                <Button
                  onClick={() => {
                    setResult(null)
                    setCurrent(0)
                    setAnswers(Array(questions.length).fill(-1))
                    if (totalSeconds !== null) setSecondsLeft(totalSeconds)
                    setTimerRunning(true)
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const q = questions[current]
  const timerWarning = secondsLeft !== null && secondsLeft <= 60

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Offline banner — Req 6.7 */}
      {!isOnline && (
        <div className="mb-4 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-900/20 p-3 flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            You are offline. Your answers are saved. Reconnect within 10 minutes to continue — the
            assessment will auto-submit otherwise.
          </span>
        </div>
      )}

      <Link
        href={`/dashboard/course/${courseId}`}
        className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-4" })}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to course
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{departmentName}</span>
          <span>/</span>
          <span>{courseName}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground text-balance">{quiz.title}</h1>
          <Badge variant="secondary">Module {quiz.moduleNumber}</Badge>
        </div>
      </div>

      {/* Timer — Req 6.1 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">
            Question {current + 1} of {questions.length}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">{answeredCount} answered</span>
            {secondsLeft !== null && (
              <span
                className={`flex items-center gap-1 font-mono font-semibold ${
                  timerWarning ? "text-destructive" : "text-foreground"
                }`}
                aria-live="polite"
                aria-label={`Time remaining: ${formatTime(secondsLeft)}`}
              >
                <Timer className="h-4 w-4" />
                {formatTime(secondsLeft)}
              </span>
            )}
          </div>
        </div>
        <Progress value={progressValue} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-pretty">{q.question}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[current] === -1 ? "" : String(answers[current])}
            onValueChange={selectAnswer}
          >
            <div className="flex flex-col gap-3">
              {q.options.map((option, i) => (
                <Label
                  key={i}
                  htmlFor={`option-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem value={String(i)} id={`option-${i}`} />
                  <span className="text-foreground">{option}</span>
                </Label>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          className="bg-transparent"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => handleSubmit()} disabled={!allAnswered || submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Assessment
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
