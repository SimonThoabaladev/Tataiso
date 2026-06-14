import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Upload,
  FileText,
  Video,
  Headphones,
  Bell,
  MessageSquare,
  BookOpen,
  Users,
  Download,
  ChevronRight,
  Plus,
  Lightbulb,
} from "lucide-react"
import { getCommentsOnMyMaterials, getMyUploadStats } from "@/app/actions/materials"

interface Material {
  material: {
    id: number
    title: string
    fileType: string
    downloadCount: number
    createdAt: Date
  }
  course: { id: number; code: string; name: string }
  department: { name: string }
}

interface Notification {
  id: number
  title: string
  message: string
  read: boolean
  createdAt: Date
}

interface InstructorDashboardProps {
  role: "lecturer" | "tutor"
  notifications: Notification[]
  myMaterials: Material[]
  stats: { departments: number; courses: number; materials: number; users?: number }
}

function fileIcon(fileType: string) {
  if (fileType.includes("video")) return <Video className="h-4 w-4 text-blue-500" />
  if (fileType.includes("audio")) return <Headphones className="h-4 w-4 text-purple-500" />
  return <FileText className="h-4 w-4 text-primary" />
}

function fileLabel(fileType: string) {
  if (fileType.includes("pdf")) return "PDF"
  if (fileType.includes("word") || fileType.includes("document")) return "Word"
  if (fileType.includes("audio")) return "Audio"
  if (fileType.includes("video")) return "Video"
  if (fileType === "lesson/text") return "Lesson"
  return "File"
}

export async function InstructorDashboard({
  role,
  notifications,
  myMaterials,
  stats,
}: InstructorDashboardProps) {
  const isLecturer = role === "lecturer"

  // Fetch student comments on this instructor's materials
  let studentComments: Awaited<ReturnType<typeof getCommentsOnMyMaterials>> = []
  let uploadStats = { totalUploads: 0, totalDownloads: 0 }
  try {
    ;[studentComments, uploadStats] = await Promise.all([
      getCommentsOnMyMaterials(10),
      getMyUploadStats(),
    ])
  } catch { /* non-critical */ }

  const unreadNotifs = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl border border-border bg-card p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              {isLecturer ? "Lecturer" : "Tutor"} Dashboard
            </p>
            <h1 className="text-4xl font-bold text-foreground mt-2">
              {isLecturer ? "Lecture Management" : "Tutoring Hub"}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              {isLecturer
                ? "Upload lecture materials, create lessons, manage course content, and monitor student engagement."
                : "Upload tutoring materials, support students with supplementary resources, and track engagement."}
            </p>
          </div>
          <Badge
            className={
              isLecturer
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            }
          >
            {isLecturer ? "Lecturer" : "Tutor"}
          </Badge>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <StatCard label="My Uploads" value={uploadStats.totalUploads} icon={<Upload className="h-4 w-4 text-primary" />} />
          <StatCard label="Total Downloads" value={uploadStats.totalDownloads} icon={<Download className="h-4 w-4 text-blue-500" />} />
          <StatCard label="Student Comments" value={studentComments.length} icon={<MessageSquare className="h-4 w-4 text-green-500" />} />
          <StatCard label="Alerts" value={unreadNotifs} icon={<Bell className="h-4 w-4 text-orange-500" />} badge={unreadNotifs > 0} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/dashboard/upload" className={buttonVariants({ size: "lg", className: "flex items-center gap-3 h-auto py-4 justify-start" })}>
          <div className="p-2 bg-white/20 rounded-lg">
            <Upload className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="font-semibold">Upload Material</p>
            <p className="text-xs opacity-80">PDF, Word, Audio, Video</p>
          </div>
        </Link>
        <Link href="/dashboard/assistant" className={buttonVariants({ variant: "outline", size: "lg", className: "flex items-center gap-3 h-auto py-4 justify-start" })}>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold">AI Assistant</p>
            <p className="text-xs text-muted-foreground">Generate exercises &amp; content</p>
          </div>
        </Link>
        <Link href="/dashboard/notifications" className={buttonVariants({ variant: "outline", size: "lg", className: "flex items-center gap-3 h-auto py-4 justify-start" })}>
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Bell className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-left">
            <p className="font-semibold">All Notifications</p>
            <p className="text-xs text-muted-foreground">{unreadNotifs} unread</p>
          </div>
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* My uploaded materials */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">My Materials</h2>
            <Link href="/dashboard/upload" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Plus className="h-4 w-4 mr-1" />
              Upload New
            </Link>
          </div>

          {myMaterials.length === 0 ? (
            <Card className="border-dashed border-border">
              <CardContent className="py-12 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Materials Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start uploading PDFs, Word documents, audio recordings, or video lectures.
                </p>
                <Link href="/dashboard/upload" className={buttonVariants()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Material
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {myMaterials.slice(0, 10).map(({ material, course, department }) => (
                <Link
                  key={material.id}
                  href={`/dashboard/material/${material.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-muted rounded-lg shrink-0">
                      {fileIcon(material.fileType)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{material.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {department.name} · {course.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <Badge variant="outline" className="text-xs hidden sm:flex">
                      {fileLabel(material.fileType)}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Download className="h-3 w-3" />
                      {material.downloadCount}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
              {myMaterials.length > 10 && (
                <Link href="/dashboard/my-materials" className={buttonVariants({ variant: "ghost", className: "w-full" })}>
                  View all {myMaterials.length} materials
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Right column: student comments + alerts */}
        <aside className="space-y-6">
          {/* Student comments feed */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-500" />
                <CardTitle className="text-base">Student Activity</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Recent comments from students on your materials
              </p>
            </CardHeader>
            <CardContent>
              {studentComments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No student comments yet. Students can comment on your uploaded materials.
                </p>
              ) : (
                <div className="space-y-3">
                  {studentComments.slice(0, 6).map((c) => (
                    <Link
                      key={c.commentId}
                      href={`/dashboard/material/${c.materialId}`}
                      className="block rounded-xl border border-border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Users className="h-3 w-3 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground">{c.studentName}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            on <span className="text-foreground">{c.materialTitle}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            &ldquo;{c.content}&rdquo;
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent notifications */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Recent Alerts</CardTitle>
                </div>
                <Link href="/dashboard/notifications" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No alerts yet.</p>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 4).map((n) => (
                    <div key={n.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-foreground text-sm truncate">{n.title}</p>
                        {!n.read && <Badge variant="default" className="text-xs shrink-0">New</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Supported formats info */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-3">Supported Upload Formats</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <FileText className="h-5 w-5 text-red-500" />, label: "PDF Documents", ext: ".pdf" },
              { icon: <FileText className="h-5 w-5 text-blue-500" />, label: "Word Documents", ext: ".doc, .docx" },
              { icon: <Headphones className="h-5 w-5 text-purple-500" />, label: "Audio Recordings", ext: ".mp3, .wav" },
              { icon: <Video className="h-5 w-5 text-green-500" />, label: "Video Lectures", ext: ".mp4, .webm (max 2 GB)" },
            ].map(({ icon, label, ext }) => (
              <div key={label} className="flex items-start gap-2 p-3 rounded-xl bg-card border border-border">
                <div className="shrink-0 mt-0.5">{icon}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{ext}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  badge,
}: {
  label: string
  value: number
  icon: React.ReactNode
  badge?: boolean
}) {
  return (
    <Card className="border-border">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${badge && value > 0 ? "text-orange-500" : "text-foreground"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
