"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  GraduationCap,
  Star,
  BookOpen,
  CheckSquare,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import {
  saveOnboardingProfile,
  getModulesForCourse,
  validateStudentNumber,
} from "@/app/actions/onboarding"

interface Course {
  id: number
  code: string
  name: string
  description: string | null
  popular: boolean
  departmentName: string
}

interface Module {
  id: number
  title: string
  subject: string | null
  lessonNumber: number | null
  fileType: string
}

interface OnboardingFormProps {
  courses: Course[]
  userName: string
}

export function OnboardingForm({ courses, userName }: OnboardingFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [studentNumber, setStudentNumber] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [modules, setModules] = useState<Module[]>([])
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([])
  const [loadingModules, setLoadingModules] = useState(false)

  // Errors
  const [snError, setSnError] = useState<string | null>(null)
  const [courseError, setCourseError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const popularCourses = courses.filter((c) => c.popular)
  const otherCourses = courses.filter((c) => !c.popular)

  // Load modules when course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setModules([])
      setSelectedModuleIds([])
      return
    }
    setLoadingModules(true)
    setSelectedModuleIds([])
    getModulesForCourse(Number(selectedCourseId))
      .then(setModules)
      .catch(() => setModules([]))
      .finally(() => setLoadingModules(false))
  }, [selectedCourseId])

  const toggleModule = (id: number) => {
    setSelectedModuleIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const handleStudentNumberBlur = () => {
    setSnError(validateStudentNumber(studentNumber))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    const snErr = validateStudentNumber(studentNumber)
    if (snErr) { setSnError(snErr); return }
    if (!selectedCourseId) { setCourseError("Please select a course."); return }

    startTransition(async () => {
      const result = await saveOnboardingProfile({
        studentNumber,
        courseId: Number(selectedCourseId),
        selectedModuleIds,
      })

      if ("error" in result) {
        setSubmitError(result.error)
        if (result.fieldErrors?.studentNumber) setSnError(result.fieldErrors.studentNumber)
        if (result.fieldErrors?.courseId) setCourseError(result.fieldErrors.courseId)
        return
      }

      // Success — go to pricing to choose a plan
      router.push("/pricing")
    })
  }

  const firstName = userName.split(" ")[0]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Greeting */}
      <div className="rounded-2xl border border-border bg-primary/5 p-5 flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-full shrink-0">
          <GraduationCap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Hi {firstName}! 👋</p>
          <p className="text-sm text-muted-foreground">
            Complete your student profile to start learning.
          </p>
        </div>
      </div>

      {/* Step 1 — Student number */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">1</span>
            Student Number
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="student-number">
            Your institutional student number{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="student-number"
            placeholder="e.g. 2021/12345 or ST2021001"
            value={studentNumber}
            onChange={(e) => { setStudentNumber(e.target.value); setSnError(null) }}
            onBlur={handleStudentNumberBlur}
            aria-invalid={!!snError}
            aria-describedby={snError ? "sn-error" : undefined}
            required
          />
          {snError && (
            <p id="sn-error" className="text-sm text-destructive flex items-center gap-1.5" role="alert">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {snError}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Format: year/number (e.g. 2021/12345) or institutional ID (e.g. ST2021001)
          </p>
        </CardContent>
      </Card>

      {/* Step 2 — Course selection */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">2</span>
            Select Your Course
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Popular courses quick-pick */}
          {popularCourses.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" />
                Popular Courses
              </p>
              <div className="grid gap-2">
                {popularCourses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => { setSelectedCourseId(String(course.id)); setCourseError(null) }}
                    className={`text-left rounded-xl border p-3 transition-all ${
                      selectedCourseId === String(course.id)
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground text-sm">{course.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {course.code} · {course.departmentName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-2.5 w-2.5 mr-1 text-yellow-500" />
                          Popular
                        </Badge>
                        {selectedCourseId === String(course.id) && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All courses dropdown */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {popularCourses.length > 0 ? "Or Search All Courses" : "Select Course"}
            </p>
            <Select
              value={selectedCourseId}
              onValueChange={(v) => { setSelectedCourseId(v); setCourseError(null) }}
            >
              <SelectTrigger aria-invalid={!!courseError} className="w-full">
                <SelectValue placeholder="Browse all courses…" />
              </SelectTrigger>
              <SelectContent>
                {popularCourses.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      ★ Popular
                    </div>
                    {popularCourses.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                    {otherCourses.length > 0 && (
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-1 border-t border-border">
                        All Courses
                      </div>
                    )}
                  </>
                )}
                {otherCourses.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {courseError && (
              <p className="text-sm text-destructive mt-1 flex items-center gap-1.5" role="alert">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {courseError}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 3 — Module selection */}
      {selectedCourseId && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">3</span>
              Select Modules of Interest
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingModules ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading modules…
              </div>
            ) : modules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No modules available for this course yet. You can update this later.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose the modules you are most interested in. This helps us personalise your
                  experience.
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {modules.map((mod) => {
                    const selected = selectedModuleIds.includes(mod.id)
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleModule(mod.id)}
                        className={`w-full text-left rounded-xl border p-3 transition-all flex items-center gap-3 ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        {selected ? (
                          <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {mod.title}
                          </p>
                          {mod.subject && (
                            <p className="text-xs text-muted-foreground">{mod.subject}</p>
                          )}
                        </div>
                        {mod.lessonNumber && (
                          <Badge variant="outline" className="text-xs ml-auto shrink-0">
                            Lesson {mod.lessonNumber}
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
                {selectedModuleIds.length > 0 && (
                  <p className="text-xs text-primary mt-2">
                    {selectedModuleIds.length} module{selectedModuleIds.length > 1 ? "s" : ""} selected
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {submitError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {submitError}
        </div>
      )}

      {/* Submit */}
      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving your profile…
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Complete Setup &amp; Continue
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        You can update your course and modules at any time from your profile settings.
      </p>
    </form>
  )
}
