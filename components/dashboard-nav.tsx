"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  GraduationCap,
  LogOut,
  Bookmark,
  Search,
  Shield,
  Upload,
  LayoutDashboard,
  Users,
  CreditCard,
  Lightbulb,
  Bell,
  Trophy,
  TrendingUp,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

type UserRole = "admin" | "lecturer" | "tutor" | "student"

interface DashboardNavProps {
  user: {
    id: string
    name: string
    email: string
    image?: string | null
    role?: string
  }
}

const roleConfig: Record<UserRole, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  lecturer: { label: "Lecturer", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  tutor: { label: "Tutor", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  student: { label: "Student", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
}

export function DashboardNav({ user }: DashboardNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const role = (user.role as UserRole) || "student"
  const config = roleConfig[role] || roleConfig.student

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  const go = (href: string) => () => router.push(href)

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const navLink = (href: string) =>
    cn(
      "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
      pathname === href
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    )

  const isInstructor = role === "lecturer" || role === "tutor"
  const isStudent = role === "student"
  const isAdminUser = role === "admin"

  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">

        {/* Logo + Desktop nav */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">TATAISO</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="/dashboard" className={navLink("/dashboard")}>
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link href="/dashboard/search" className={navLink("/dashboard/search")}>
              <Search className="h-4 w-4" />
              Search
            </Link>

            {isInstructor && (
              <>
                <Link href="/dashboard/upload" className={navLink("/dashboard/upload")}>
                  <Upload className="h-4 w-4" />
                  Upload
                </Link>
                <Link href="/dashboard/my-materials" className={navLink("/dashboard/my-materials")}>
                  <FileText className="h-4 w-4" />
                  My Materials
                </Link>
                <Link href="/dashboard/assistant" className={navLink("/dashboard/assistant")}>
                  <Lightbulb className="h-4 w-4" />
                  Assistant
                </Link>
                <Link href="/dashboard/notifications" className={navLink("/dashboard/notifications")}>
                  <Bell className="h-4 w-4" />
                  Alerts
                </Link>
              </>
            )}

            {isStudent && (
              <>
                <Link href="/dashboard/bookmarks" className={navLink("/dashboard/bookmarks")}>
                  <Bookmark className="h-4 w-4" />
                  Bookmarks
                </Link>
                <Link href="/dashboard/assistant" className={navLink("/dashboard/assistant")}>
                  <Lightbulb className="h-4 w-4" />
                  Assistant
                </Link>
                <Link href="/dashboard/notifications" className={navLink("/dashboard/notifications")}>
                  <Bell className="h-4 w-4" />
                  Alerts
                </Link>
                <Link href="/dashboard/progress" className={navLink("/dashboard/progress")}>
                  <TrendingUp className="h-4 w-4" />
                  Progress
                </Link>
                <Link href="/dashboard/achievements" className={navLink("/dashboard/achievements")}>
                  <Trophy className="h-4 w-4" />
                  Achievements
                </Link>
                <Link href="/pricing" className={navLink("/pricing")}>
                  <CreditCard className="h-4 w-4" />
                  Pricing
                </Link>
              </>
            )}

            {isAdminUser && (
              <>
                <Link href="/dashboard/bookmarks" className={navLink("/dashboard/bookmarks")}>
                  <Bookmark className="h-4 w-4" />
                  Bookmarks
                </Link>
                <Link href="/dashboard/assistant" className={navLink("/dashboard/assistant")}>
                  <Lightbulb className="h-4 w-4" />
                  Assistant
                </Link>
                <Link href="/dashboard/notifications" className={navLink("/dashboard/notifications")}>
                  <Bell className="h-4 w-4" />
                  Alerts
                </Link>
                <Link href="/dashboard/admin" className={navLink("/dashboard/admin")}>
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
                <Link href="/dashboard/admin/users" className={navLink("/dashboard/admin/users")}>
                  <Users className="h-4 w-4" />
                  Users
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* User dropdown — no asChild or forceMount (not supported by @base-ui/react) */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer hover:bg-muted transition-colors">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.image || undefined} alt={user.name} />
              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <span className={cn("text-sm font-medium px-2 py-0.5 rounded-md", config.color)}>
              {config.label}
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <Badge variant="outline" className={cn(config.color, "w-fit mt-1")}>
                    {config.label}
                  </Badge>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            {/* Mobile-only common links */}
            <DropdownMenuItem className="md:hidden cursor-pointer" onClick={go("/dashboard")}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem className="md:hidden cursor-pointer" onClick={go("/dashboard/search")}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </DropdownMenuItem>
            <DropdownMenuItem className="md:hidden cursor-pointer" onClick={go("/dashboard/assistant")}>
              <Lightbulb className="mr-2 h-4 w-4" />
              AI Assistant
            </DropdownMenuItem>
            <DropdownMenuItem className="md:hidden cursor-pointer" onClick={go("/dashboard/notifications")}>
              <Bell className="mr-2 h-4 w-4" />
              Alerts
            </DropdownMenuItem>

            {/* Instructor mobile links */}
            {isInstructor && (
              <>
                <DropdownMenuItem className="md:hidden cursor-pointer" onClick={go("/dashboard/upload")}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Material
                </DropdownMenuItem>
                <DropdownMenuItem className="md:hidden cursor-pointer" onClick={go("/dashboard/my-materials")}>
                  <FileText className="mr-2 h-4 w-4" />
                  My Materials
                </DropdownMenuItem>
              </>
            )}

            {/* Student mobile links */}
            {isStudent && (
              <>
                <DropdownMenuItem className="md:hidden cursor-pointer" onClick={go("/dashboard/bookmarks")}>
                  <Bookmark className="mr-2 h-4 w-4" />
                  Bookmarks
                </DropdownMenuItem>
                <DropdownMenuItem className="md:hidden cursor-pointer" onClick={go("/dashboard/progress")}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Progress
                </DropdownMenuItem>
                <DropdownMenuItem className="md:hidden cursor-pointer" onClick={go("/dashboard/achievements")}>
                  <Trophy className="mr-2 h-4 w-4" />
                  Achievements
                </DropdownMenuItem>
                <DropdownMenuItem className="md:hidden cursor-pointer" onClick={go("/pricing")}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pricing
                </DropdownMenuItem>
              </>
            )}

            {/* Admin links — visible on all screen sizes */}
            {isAdminUser && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={go("/dashboard/admin")}>
                  <Shield className="mr-2 h-4 w-4" />
                  Admin Panel
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={go("/dashboard/admin/users")}>
                  <Users className="mr-2 h-4 w-4" />
                  User Management
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  )
}
