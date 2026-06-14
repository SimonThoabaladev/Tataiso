export const dynamic = "force-dynamic"
import { notFound } from "next/navigation"
import { getCourseWithDepartment, getMaterialsByCourse, getUserRole } from "@/app/actions/materials"
import { getUserSubscription } from "@/app/actions/subscriptions"
import { CourseMaterials } from "@/components/course-materials"
import { CourseQuizzes } from "@/components/course-quizzes"

interface CoursePageProps {
  params: Promise<{ courseId: string }>
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params
  const courseIdNum = parseInt(courseId, 10)

  if (isNaN(courseIdNum)) notFound()

  const result = await getCourseWithDepartment(courseIdNum)
  if (!result) notFound()

  const materials = await getMaterialsByCourse(courseIdNum)
  const role = await getUserRole()
  const sub = await getUserSubscription()

  // Staff (admin, lecturer, tutor) get full access regardless of plan
  const isStaff = role === "admin" || role === "lecturer" || role === "tutor"

  const subscription = {
    plan: sub.plan,
    canViewMaterials: isStaff || sub.canViewMaterials,
    canDownload: isStaff || sub.canDownload,
    canViewRecordings: isStaff || sub.canViewRecordings,
    fullAccess: isStaff || (sub.fullAccess ?? false),
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <CourseMaterials
        course={result.course}
        department={result.department}
        materials={materials}
        userRole={role}
        subscription={subscription}
      />
      <CourseQuizzes courseId={courseIdNum} />
    </div>
  )
}
