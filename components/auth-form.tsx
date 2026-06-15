"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Loader2,
  GraduationCap,
  School,
  UserCheck,
  Users,
  Star,
  BookOpen,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react"
import { saveOnboardingProfile, getModulesForCourse } from "@/app/actions/onboarding"

// ── Hardcoded popular courses (shown even before DB is seeded) ──
const POPULAR_COURSES = [
  { id: null, name: "Engineering Mathematics", code: "ENGM101" },
  { id: null, name: "Communication Skills", code: "COMM101" },
  { id: null, name: "Introduction to Computing", code: "COMP101" },
  { id: null, name: "Business Management", code: "BUSM101" },
  { id: null, name: "Accounting 1", code: "ACC101" },
]

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

const roles = [
  { value: "student", label: "Student", icon: Users, description: "Access self-study materials and research guidance" },
  { value: "tutor", label: "Tutor", icon: UserCheck, description: "Provide verified tutoring support to students" },
  { value: "lecturer", label: "Lecturer", icon: School, description: "Create and manage course content and research materials" },
]

type FieldErrors = {
  name?: string
  email?: string
  password?: string
  role?: string
  studentNumber?: string
  course?: string
  general?: string
}

function validateStudentNumber(v: string) {
  if (!v.trim()) return "Student number is required."
  if (!/^[A-Za-z0-9/\-]{4,20}$/.test(v.trim()))
    return "Enter a valid student number (e.g. 2021/12345 or ST2021001)."
  return null
}

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()

  // Core fields
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("student")

  // Student-only fields
  const [studentNumber, setStudentNumber] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [selectedCourseName, setSelectedCourseName] = useState("")
  const [dbCourses, setDbCourses] = useState<{ id: number; name: string; code: string; popular: boolean }[]>([])
  const [modules, setModules] = useState<{ id: number; title: string; subject: string | null; lessonNumber: number | null }[]>([])
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([])
  const [loadingModules, setLoadingModules] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(false)

  // UI state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const [resendEmail, setResendEmail] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const isStudent = role === "student" && mode === "sign-up"

  // Load courses from DB when student role is selected
  useEffect(() => {
    if (!isStudent) return
    setLoadingCourses(true)
    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setDbCourses(data) })
      .catch(() => {})
      .finally(() => setLoadingCourses(false))
  }, [isStudent])

  // Load modules when course is selected (only if it's a DB course with an ID)
  useEffect(() => {
    setModules([])
    setSelectedModuleIds([])
    const numId = Number(selectedCourseId)
    if (!numId) return
    setLoadingModules(true)
    getModulesForCourse(numId)
      .then(setModules)
      .catch(() => setModules([]))
      .finally(() => setLoadingModules(false))
  }, [selectedCourseId])

  const toggleModule = (id: number) =>
    setSelectedModuleIds((p) => p.includes(id) ? p.filter((m) => m !== id) : [...p, id])

  // Merge DB courses with popular fallbacks, popular first
  const popularFromDb = dbCourses.filter((c) => c.popular)
  const otherFromDb = dbCourses.filter((c) => !c.popular)
  const showPopularFallback = popularFromDb.length === 0
  const popularList = showPopularFallback ? POPULAR_COURSES : popularFromDb
  const otherList = showPopularFallback ? [] : otherFromDb

  const handleCourseSelect = (value: string, name?: string) => {
    setSelectedCourseId(value)
    setSelectedCourseName(name ?? value)
    setFieldErrors((p) => ({ ...p, course: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setShowResend(false)

    if (mode === "sign-up") {
      const errors: FieldErrors = {}
      if (!name.trim() || name.trim().length < 2) errors.name = "Full name must be at least 2 characters."
      else if (name.trim().length > 50) errors.name = "Full name must not exceed 50 characters."
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email address."
      if (password.length < 8) errors.password = "Password must be at least 8 characters."
      else if (password.length > 128) errors.password = "Password must not exceed 128 characters."
      if (!["student", "tutor", "lecturer"].includes(role)) errors.role = "Please select a role."

      // Student-specific validation
      if (isStudent) {
        const snErr = validateStudentNumber(studentNumber)
        if (snErr) errors.studentNumber = snErr
        if (!selectedCourseId && !selectedCourseName) errors.course = "Please select your course."
      }

      if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    }

    setLoading(true)

    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({ email, password, name, role } as any)
        if (result.error) {
          const msg = result.error.message ?? "Sign up failed"
          if (msg.toLowerCase().includes("email") && (msg.toLowerCase().includes("use") || msg.toLowerCase().includes("exist"))) {
            setFieldErrors({ email: "This email address is already in use." })
          } else {
            setFieldErrors({ general: msg })
          }
          setLoading(false)
          return
        }

        // Save student profile immediately after account creation
        if (isStudent) {
          try {
            const courseIdNum = Number(selectedCourseId) || 0
            await saveOnboardingProfile({
              studentNumber: studentNumber.trim(),
              courseId: courseIdNum,
              selectedModuleIds,
            })
          } catch { /* non-critical — can complete via onboarding later */ }
        }

        router.push(role === "student" ? "/pricing" : "/dashboard")
        router.refresh()
      } else {
        const result = await authClient.signIn.email({ email, password })
        if (result.error) {
          const msg = result.error.message ?? "Sign in failed"
          if (msg.toLowerCase().includes("verify") || msg.toLowerCase().includes("verified")) {
            setFieldErrors({ general: "Please verify your email before signing in." })
            setShowResend(true)
            setResendEmail(email)
          } else {
            setFieldErrors({ general: msg })
          }
          setLoading(false)
          return
        }
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setFieldErrors({ general: "An unexpected error occurred. Please try again." })
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    setResendMessage(null)
    try {
      await (authClient as any).sendVerificationEmail?.({ email: resendEmail, callbackURL: "/pricing" })
      setResendMessage("Verification email sent. Check your inbox.")
    } catch {
      setResendMessage("Failed to send. Please try again later.")
    }
    setResendLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setFieldErrors({})
    setGoogleLoading(true)
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })
    } catch {
      setFieldErrors({ general: "Google sign-in failed. Please try again." })
      setGoogleLoading(false)
    }
  }

  const selectedRole = roles.find((r) => r.value === role)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {mode === "sign-in" ? "Welcome back to TATAISO" : "Join TATAISO"}
          </CardTitle>
          <CardDescription>
            {mode === "sign-in" ? "Sign in to access your learning materials" : "Create an account to start learning"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === "sign-up" && (
              <>
                {/* Full Name */}
                <div className="space-y-1">
                  <Label htmlFor="name">Full Name <span className="text-muted-foreground text-xs">(2–50 chars)</span></Label>
                  <Input id="name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required aria-invalid={!!fieldErrors.name} />
                  {fieldErrors.name && <p className="text-sm text-destructive" role="alert">{fieldErrors.name}</p>}
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <Label htmlFor="role">I am a</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          <div className="flex items-center gap-2"><r.icon className="h-4 w-4" />{r.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRole && <p className="text-xs text-muted-foreground">{selectedRole.description}</p>}
                </div>

                {/* ── Student-only section ─────────────────── */}
                {isStudent && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      Your Academic Details
                    </p>

                    {/* Student Number */}
                    <div className="space-y-1">
                      <Label htmlFor="student-number">Student Number <span className="text-destructive">*</span></Label>
                      <Input
                        id="student-number"
                        placeholder="e.g. 2021/12345 or ST2021001"
                        value={studentNumber}
                        onChange={(e) => { setStudentNumber(e.target.value); setFieldErrors((p) => ({ ...p, studentNumber: undefined })) }}
                        aria-invalid={!!fieldErrors.studentNumber}
                      />
                      {fieldErrors.studentNumber
                        ? <p className="text-sm text-destructive flex items-center gap-1" role="alert"><AlertCircle className="h-3.5 w-3.5" />{fieldErrors.studentNumber}</p>
                        : <p className="text-xs text-muted-foreground">Your institutional student number</p>
                      }
                    </div>

                    {/* Course Selection */}
                    <div className="space-y-2">
                      <Label>Your Course <span className="text-destructive">*</span></Label>

                      {/* Popular courses — tap to select cards */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          Popular courses
                        </p>
                        <div className="grid gap-2">
                          {(loadingCourses ? POPULAR_COURSES : popularList).map((c) => {
                            const val = (c as any).id ? String((c as any).id) : c.name
                            const isSelected = selectedCourseId === val || selectedCourseName === c.name
                            return (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => handleCourseSelect(val, c.name)}
                                className={`text-left rounded-xl border p-3 transition-all ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40 bg-background"}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                                    <p className="text-xs text-muted-foreground">{c.code}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="secondary" className="text-xs"><Star className="h-2.5 w-2.5 mr-1 text-yellow-500" />Popular</Badge>
                                    {isSelected && <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center"><span className="text-white text-xs">✓</span></span>}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Other courses dropdown */}
                      {(otherList.length > 0 || dbCourses.length > 0) && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1 mt-2">
                            <BookOpen className="h-3 w-3" />Other courses
                          </p>
                          <Select value={selectedCourseId} onValueChange={(v: string | null) => {
                            if (!v) return
                            const c = dbCourses.find((c) => String(c.id) === v)
                            handleCourseSelect(v, c?.name)
                          }}>
                            <SelectTrigger><SelectValue placeholder="Browse all courses…" /></SelectTrigger>
                            <SelectContent>
                              {otherList.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {fieldErrors.course && (
                        <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                          <AlertCircle className="h-3.5 w-3.5" />{fieldErrors.course}
                        </p>
                      )}
                      {selectedCourseName && !fieldErrors.course && (
                        <p className="text-xs text-primary font-medium">✓ Selected: {selectedCourseName}</p>
                      )}
                    </div>

                    {/* Module Selection */}
                    {(selectedCourseId || selectedCourseName) && (
                      <div className="space-y-2">
                        <Label>Modules of Interest <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        {loadingModules ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading modules…
                          </div>
                        ) : modules.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No modules listed yet for this course.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {modules.map((mod) => {
                              const on = selectedModuleIds.includes(mod.id)
                              return (
                                <button
                                  key={mod.id}
                                  type="button"
                                  onClick={() => toggleModule(mod.id)}
                                  className={`w-full text-left flex items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-all ${on ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                                >
                                  {on ? <CheckSquare className="h-4 w-4 text-primary shrink-0" /> : <Square className="h-4 w-4 text-muted-foreground shrink-0" />}
                                  <span className="truncate text-foreground">{mod.title}</span>
                                  {mod.lessonNumber && <Badge variant="outline" className="text-xs ml-auto shrink-0">L{mod.lessonNumber}</Badge>}
                                </button>
                              )
                            })}
                          </div>
                        )}
                        {selectedModuleIds.length > 0 && (
                          <p className="text-xs text-primary">{selectedModuleIds.length} module{selectedModuleIds.length > 1 ? "s" : ""} selected</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required aria-invalid={!!fieldErrors.email} />
              {fieldErrors.email && <p className="text-sm text-destructive" role="alert">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label htmlFor="password">
                Password {mode === "sign-up" && <span className="text-muted-foreground text-xs">(8–128 chars)</span>}
              </Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={128} aria-invalid={!!fieldErrors.password} />
              {fieldErrors.password && <p className="text-sm text-destructive" role="alert">{fieldErrors.password}</p>}
            </div>

            {fieldErrors.general && <p className="text-sm text-destructive text-center" role="alert">{fieldErrors.general}</p>}

            {showResend && (
              <div className="rounded-lg border border-border bg-muted p-3 space-y-2">
                <p className="text-sm text-muted-foreground">Haven&apos;t received the verification email?</p>
                <Button type="button" variant="outline" size="sm" onClick={handleResend} disabled={resendLoading}>
                  {resendLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Resend verification email
                </Button>
                {resendMessage && <p className="text-xs text-muted-foreground">{resendMessage}</p>}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "sign-in" ? "Sign In" : "Create Account"}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-muted-foreground/20" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={googleLoading || loading}>
              {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
              <span className="ml-2">Google</span>
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "sign-in" ? (
              <>Don&apos;t have an account? <Link href="/sign-up" className="text-primary hover:underline">Sign up</Link></>
            ) : (
              <>Already have an account? <Link href="/sign-in" className="text-primary hover:underline">Sign in</Link></>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
