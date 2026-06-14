export const dynamic = "force-dynamic"
import { redirect } from "next/navigation"
import { getUserRole, getMyMaterials } from "@/app/actions/materials"
import { MyMaterialsList } from "@/components/my-materials-list"

export default async function MyMaterialsPage() {
  const role = await getUserRole()

  if (!["admin", "lecturer", "tutor"].includes(role)) {
    redirect("/dashboard")
  }

  const materials = await getMyMaterials()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Materials</h1>
        <p className="text-muted-foreground mt-1">
          All materials you have uploaded — PDFs, Word documents, audio recordings, and video lectures.
        </p>
      </div>
      <MyMaterialsList materials={materials} userRole={role} />
    </div>
  )
}
