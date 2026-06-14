"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Users,
  Shield,
  School,
  UserCheck,
  User,
  Search,
  Ban,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import {
  updateUserRole,
  searchUsers,
  suspendUser,
  unsuspendUser,
  adminAdjustSubscription,
  type UserRole,
} from "@/app/actions/materials"
import { PLANS, type SubscriptionPlan } from "@/lib/subscriptions"

interface UserData {
  id: string
  name: string
  email: string
  role: string
  suspended?: boolean | null
  createdAt: Date
}

interface AdminPanelProps {
  users: UserData[]
  currentUserRole: string
}

const roleConfig: Record<UserRole, { label: string; color: string; icon: typeof Shield }> = {
  admin: {
    label: "Admin",
    color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    icon: Shield,
  },
  lecturer: {
    label: "Lecturer",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    icon: School,
  },
  tutor: {
    label: "Tutor",
    color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    icon: UserCheck,
  },
  student: {
    label: "Student",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: User,
  },
}

const PLAN_OPTIONS: SubscriptionPlan[] = ["free", "basic", "standard", "premium", "elite"]

export function AdminPanel({ users: initialUsers, currentUserRole }: AdminPanelProps) {
  const [allUsers, setAllUsers] = useState<UserData[]>(initialUsers)
  const [displayedUsers, setDisplayedUsers] = useState<UserData[]>(initialUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const stats = {
    total: allUsers.length,
    admins: allUsers.filter((u) => u.role === "admin").length,
    lecturers: allUsers.filter((u) => u.role === "lecturer").length,
    tutors: allUsers.filter((u) => u.role === "tutor").length,
    students: allUsers.filter((u) => u.role === "student").length,
  }

  // Req 11.1 — partial match search, up to 50 results
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      setDisplayedUsers(allUsers)
      setNoResults(false)
      return
    }
    setSearching(true)
    try {
      const results = await searchUsers(searchQuery)
      setDisplayedUsers(results as UserData[])
      setNoResults(results.length === 0)
    } catch (err) {
      console.error(err)
    }
    setSearching(false)
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setDisplayedUsers(allUsers)
    setNoResults(false)
  }

  // Req 11 — role update
  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(`role-${userId}`)
    try {
      await updateUserRole(userId, newRole as UserRole)
      setDisplayedUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      )
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      )
    } catch (error) {
      console.error("Failed to update role:", error)
    }
    setUpdating(null)
  }

  // Req 11.2 — suspend / unsuspend
  const handleToggleSuspend = async (userData: UserData) => {
    const action = userData.suspended ? "unsuspend" : "suspend"
    setUpdating(`suspend-${userData.id}`)
    try {
      if (userData.suspended) {
        await unsuspendUser(userData.id)
      } else {
        await suspendUser(userData.id)
      }
      const updated = { ...userData, suspended: !userData.suspended }
      setDisplayedUsers((prev) => prev.map((u) => (u.id === userData.id ? updated : u)))
      setAllUsers((prev) => prev.map((u) => (u.id === userData.id ? updated : u)))
    } catch (err) {
      console.error(`Failed to ${action} user:`, err)
    }
    setUpdating(null)
  }

  // Req 11.3 — adjust subscription
  const handleSubscriptionChange = async (userId: string, plan: string) => {
    setUpdating(`sub-${userId}`)
    try {
      await adminAdjustSubscription(userId, plan)
    } catch (err) {
      console.error("Failed to adjust subscription:", err)
    }
    setUpdating(null)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total", value: stats.total, Icon: Users, bg: "bg-primary/10", ic: "text-primary" },
          { label: "Admins", value: stats.admins, Icon: Shield, bg: "bg-red-100 dark:bg-red-900/30", ic: "text-red-600 dark:text-red-400" },
          { label: "Lecturers", value: stats.lecturers, Icon: School, bg: "bg-blue-100 dark:bg-blue-900/30", ic: "text-blue-600 dark:text-blue-400" },
          { label: "Tutors", value: stats.tutors, Icon: UserCheck, bg: "bg-green-100 dark:bg-green-900/30", ic: "text-green-600 dark:text-green-400" },
          { label: "Students", value: stats.students, Icon: User, bg: "bg-gray-100 dark:bg-gray-800", ic: "text-gray-600 dark:text-gray-400" },
        ].map(({ label, value, Icon, bg, ic }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${bg} rounded-lg`}>
                  <Icon className={`h-5 w-5 ${ic}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search — Req 11.1 */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">User Management</CardTitle>
          <CardDescription>
            Search by name or email. Results are limited to 50 partial matches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
            {searchQuery && (
              <Button type="button" variant="outline" onClick={handleClearSearch}>
                Clear
              </Button>
            )}
          </form>

          {/* Req 11.6 — no results message without leaking data */}
          {noResults && (
            <p className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-lg">
              No users found matching &quot;{searchQuery}&quot;.
            </p>
          )}

          <div className="space-y-3">
            {displayedUsers.map((userData) => {
              const role = (userData.role as UserRole) || "student"
              const config = roleConfig[role]
              const Icon = config.icon
              const initials = userData.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)

              return (
                <div
                  key={userData.id}
                  className={`flex items-center justify-between p-4 rounded-lg border border-border bg-background flex-wrap gap-4 ${
                    userData.suspended ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{userData.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{userData.email}</p>
                      {userData.suspended && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          Suspended
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className={`gap-1 ${config.color}`}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>

                    {currentUserRole === "admin" && (
                      <>
                        {/* Role selector */}
                        <Select
                          value={userData.role}
                          onValueChange={(value) => handleRoleChange(userData.id, value)}
                          disabled={updating === `role-${userData.id}`}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["student", "tutor", "lecturer", "admin"] as UserRole[]).map(
                              (r) => (
                                <SelectItem key={r} value={r}>
                                  <div className="flex items-center gap-2">
                                    {r === "admin" && <Shield className="h-4 w-4" />}
                                    {r === "lecturer" && <School className="h-4 w-4" />}
                                    {r === "tutor" && <UserCheck className="h-4 w-4" />}
                                    {r === "student" && <User className="h-4 w-4" />}
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                  </div>
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>

                        {/* Subscription adjustment — Req 11.3 */}
                        <Select
                          defaultValue="free"
                          onValueChange={(value) =>
                            handleSubscriptionChange(userData.id, value)
                          }
                          disabled={updating === `sub-${userData.id}`}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Set plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAN_OPTIONS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {PLANS[p].name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Suspend / unsuspend — Req 11.2 */}
                        <Button
                          variant="outline"
                          size="sm"
                          className={
                            userData.suspended
                              ? "text-green-600 border-green-300"
                              : "text-destructive border-destructive/30"
                          }
                          onClick={() => handleToggleSuspend(userData)}
                          disabled={updating === `suspend-${userData.id}`}
                        >
                          {updating === `suspend-${userData.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : userData.suspended ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Unsuspend
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4 mr-1" />
                              Suspend
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
