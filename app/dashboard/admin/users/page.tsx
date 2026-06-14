import { getAllUsers, getUserRole } from "@/app/actions/materials"
import { redirect } from "next/navigation"
import { AdminPanel } from "@/components/admin-panel"

export default async function AdminUsersPage() {
  const role = await getUserRole()
  if (role !== "admin") {
    redirect("/dashboard")
  }

  const users = await getAllUsers()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">
          Review and update user roles across the platform.
        </p>
      </div>
      <AdminPanel users={users} currentUserRole={role} />
    </div>
  )
}
