export const dynamic = "force-dynamic"
import { notFound } from "next/navigation"
import {
  getMaterialById,
  getCourseWithDepartment,
  getCommentsByMaterial,
  getUserRole,
} from "@/app/actions/materials"
import { getUserSubscription } from "@/app/actions/subscriptions"
import { MaterialDetail } from "@/components/material-detail"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

interface MaterialPageProps {
  params: Promise<{ materialId: string }>
}

export default async function MaterialPage({ params }: MaterialPageProps) {
  const { materialId } = await params
  const materialIdNum = parseInt(materialId, 10)
  if (isNaN(materialIdNum)) notFound()

  const material = await getMaterialById(materialIdNum)
  if (!material) notFound()

  const courseData = await getCourseWithDepartment(material.courseId)
  if (!courseData) notFound()

  const [comments, role, session, sub] = await Promise.all([
    getCommentsByMaterial(materialIdNum),
    getUserRole(),
    auth.api.getSession({ headers: await headers() }),
    getUserSubscription(),
  ])

  const isStaff = ["admin", "lecturer", "tutor"].includes(role)

  const subscription = {
    plan: sub.plan,
    canViewMaterials: isStaff || sub.canViewMaterials,
    canDownload: isStaff || sub.canDownload,
    canViewRecordings: isStaff || sub.canViewRecordings,
  }

  return (
    <MaterialDetail
      material={material}
      course={courseData.course}
      department={courseData.department}
      comments={comments}
      userRole={role}
      currentUserId={session?.user?.id ?? ""}
      subscription={subscription}
    />
  )
}
