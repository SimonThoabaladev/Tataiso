"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Star, BookOpen, Loader2 } from "lucide-react"
import { toggleCoursePopular } from "@/app/actions/onboarding"

interface Course {
  id: number
  code: string
  name: string
  popular: boolean
  departmentName: string
}

interface AdminCoursesPanelProps {
  courses: Course[]
}

export function AdminCoursesPanel({ courses }: AdminCoursesPanelProps) {
  const [courseList, setCourseList] = useState(courses)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (courseId: number, currentPopular: boolean) => {
    setTogglingId(courseId)
    startTransition(async () => {
      try {
        await toggleCoursePopular(courseId, !currentPopular)
        setCourseList((prev) =>
          prev.map((c) => (c.id === courseId ? { ...c, popular: !currentPopular } : c))
        )
      } catch (err) {
        console.error("Failed to toggle popular:", err)
      }
      setTogglingId(null)
    })
  }

  const popularCount = courseList.filter((c) => c.popular).length

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Popular Courses Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Courses marked as popular appear at the top of the student onboarding course picker.
              Currently <strong>{popularCount}</strong> popular course{popularCount !== 1 ? "s" : ""}.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <div className="flex items-center gap-3 py-6 text-muted-foreground justify-center">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm">No courses found. Create courses first.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {courseList
              .sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || a.name.localeCompare(b.name))
              .map((course) => (
                <div
                  key={course.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    course.popular
                      ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${course.popular ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-muted"}`}>
                      {course.popular ? (
                        <Star className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{course.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {course.code} · {course.departmentName}
                      </p>
                    </div>
                    {course.popular && (
                      <Badge variant="secondary" className="text-xs shrink-0 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Popular
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {togglingId === course.id && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      checked={course.popular}
                      onCheckedChange={() => handleToggle(course.id, course.popular)}
                      disabled={togglingId === course.id || isPending}
                      aria-label={`Mark ${course.name} as popular`}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
