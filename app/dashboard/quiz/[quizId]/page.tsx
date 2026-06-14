export const dynamic = "force-dynamic"
import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import {
  getQuizById,
  getQuizQuestions,
  canAccessQuiz,
  canAttemptAssessment,
} from "@/app/actions/subscriptions"
import { db } from "@/lib/db"
import { courses, departments } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { QuizRunner } from "@/components/quiz-runner"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Lock, CreditCard, ChevronLeft } from "lucide-react"
import Link from "next/link"

export default async function QuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>
}) {
  const { quizId } = await params
  const id = Number.parseInt(quizId, 10)

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const quiz = await getQuizById(id)
  if (!quiz) notFound()

  const [course] = await db.select().from(courses).where(eq(courses.id, quiz.courseId))
  const [department] = course
    ? await db.select().from(departments).where(eq(departments.id, course.departmentId))
    : []

  const access = await canAccessQuiz(id)

  // Access denied (subscription / module gate)
  if (!access.canAccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link
          href={`/dashboard/course/${quiz.courseId}`}
          className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-6" })}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to course
        </Link>
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="inline-flex p-3 bg-primary/10 rounded-full text-primary mb-4">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold text-foreground text-balance">{quiz.title}</h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto text-pretty">
              {access.reason}
            </p>
            <Link href="/pricing" className={buttonVariants({ className: "mt-6" })}>
              <CreditCard className="h-4 w-4 mr-2" />
              View Plans
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check Free Trial attempt limit — Req 6.5
  const attemptCheck = await canAttemptAssessment()

  const questions = await getQuizQuestions(id)

  return (
    <QuizRunner
      quiz={quiz}
      questions={questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options) as string[],
        explanation: q.explanation,
      }))}
      courseName={course?.name ?? ""}
      courseId={quiz.courseId}
      departmentName={department?.name ?? ""}
      attemptBlocked={!attemptCheck.canAttempt}
      attemptBlockReason={!attemptCheck.canAttempt ? attemptCheck.reason : undefined}
    />
  )
}
