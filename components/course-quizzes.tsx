import { getUserQuizProgress } from "@/app/actions/subscriptions"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileQuestion, Lock, CheckCircle2, Play } from "lucide-react"
import Link from "next/link"

interface CourseQuizzesProps {
  courseId: number
}

export async function CourseQuizzes({ courseId }: CourseQuizzesProps) {
  const progress = await getUserQuizProgress(courseId)

  if (progress.length === 0) return null

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <FileQuestion className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Module Quizzes</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4 text-pretty">
        Pass each module quiz with at least 80% to unlock the next module.
      </p>

      <div className="flex flex-col gap-3">
        {progress.map((item) => {
          const { quiz, bestScore, passed, canAccess, accessReason } = item
          return (
            <Card key={quiz.id} className={canAccess ? "" : "opacity-75"}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      passed ? "bg-accent/15 text-accent" : canAccess ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {passed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : canAccess ? (
                      <Play className="h-5 w-5" />
                    ) : (
                      <Lock className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">{quiz.title}</h3>
                      <Badge variant="secondary" className="shrink-0">
                        Module {quiz.moduleNumber}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {passed
                        ? `Passed with ${bestScore}%`
                        : bestScore !== null
                          ? `Best score: ${bestScore}% — needs ${quiz.passingScore}% to pass`
                          : canAccess
                            ? `Passing score: ${quiz.passingScore}%`
                            : accessReason}
                    </p>
                  </div>
                </div>

                {canAccess ? (
                  <Link
                    href={`/dashboard/quiz/${quiz.id}`}
                    className={buttonVariants({
                      size: "sm",
                      variant: passed ? "outline" : "default",
                      className: passed ? "bg-transparent" : "",
                    })}
                  >
                    {passed ? "Retake" : bestScore !== null ? "Try Again" : "Start"}
                  </Link>
                ) : (
                  <Link href="/pricing" className={buttonVariants({ size: "sm", variant: "secondary" })}>
                    <Lock className="h-4 w-4 mr-1" />
                    Unlock
                  </Link>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
