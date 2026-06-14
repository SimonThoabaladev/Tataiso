import { redirect } from "next/navigation"
import { getCoursesByDepartment, getDepartments, getUserRole } from "@/app/actions/materials"
import { UploadMaterialForm } from "@/components/upload-material-form"

export default async function UploadMaterialPage() {
  const role = await getUserRole()
  if (!["admin", "lecturer", "tutor"].includes(role)) {
    redirect("/dashboard")
  }

  const departments = await getDepartments()
  const departmentsWithCourses = await Promise.all(
    departments.map(async (department) => ({
      ...department,
      courses: await getCoursesByDepartment(department.id),
    }))
  )

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Upload Materials</h1>
        <p className="text-muted-foreground mt-1">
          Upload lecture notes, audio recordings, or video files for your courses.
        </p>
      </div>
      <UploadMaterialForm departments={departmentsWithCourses} />
    </div>
  )
}
