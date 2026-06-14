"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  ChevronLeft,
  FileText,
  Headphones,
  Video,
  Download,
  Bookmark,
  BookmarkCheck,
  Send,
  Trash2,
  Loader2,
  Lock,
  CreditCard,
  Eye,
  CheckCircle2,
} from "lucide-react"
import { addComment, deleteComment, toggleBookmark, trackDownload, isBookmarked } from "@/app/actions/materials"
import { markLessonCompleted } from "@/app/actions/progress"

interface Material {
  id: number
  courseId: number
  uploaderId: string
  title: string
  description: string | null
  fileType: string
  fileName: string
  fileUrl: string
  fileSize: number
  downloadCount: number
  createdAt: Date
}

interface Course {
  id: number
  departmentId: number
  code: string
  name: string
  description: string | null
  createdAt: Date
}

interface Department {
  id: number
  name: string
  description: string | null
  createdAt: Date
}

interface Comment {
  comment: {
    id: number
    materialId: number
    userId: string
    content: string
    createdAt: Date
  }
  user: {
    id: string
    name: string
    image: string | null
  }
}

interface SubscriptionAccess {
  plan: string
  canViewMaterials: boolean
  canDownload: boolean
  canViewRecordings: boolean
}

interface MaterialDetailProps {
  material: Material
  course: Course
  department: Department
  comments: Comment[]
  userRole: string
  currentUserId: string
  subscription: SubscriptionAccess
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf") || fileType.includes("word") || fileType.includes("document")) {
    return <FileText className="h-6 w-6" />
  }
  if (fileType.includes("audio")) {
    return <Headphones className="h-6 w-6" />
  }
  if (fileType.includes("video")) {
    return <Video className="h-6 w-6" />
  }
  return <FileText className="h-6 w-6" />
}

function getFileTypeLabel(fileType: string) {
  if (fileType.includes("pdf")) return "PDF Document"
  if (fileType.includes("word") || fileType.includes("document")) return "Word Document"
  if (fileType.includes("audio")) return "Audio Recording"
  if (fileType.includes("video")) return "Video Recording"
  return "File"
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function MaterialDetail({
  material,
  course,
  department,
  comments,
  userRole,
  currentUserId,
  subscription,
}: MaterialDetailProps) {
  const [bookmarked, setBookmarked] = useState(false)
  const [loadingBookmark, setLoadingBookmark] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [lessonDone, setLessonDone] = useState(false)

  const isRecording = material.fileType.includes("audio") || material.fileType.includes("video")
  // Recordings require premium (canViewRecordings); other materials require basic (canViewMaterials)
  const canView = isRecording ? subscription.canViewRecordings : subscription.canViewMaterials
  const canDownload = subscription.canDownload

  useEffect(() => {
    async function checkBookmark() {
      const result = await isBookmarked(material.id)
      setBookmarked(result)
      setLoadingBookmark(false)
    }
    checkBookmark()
  }, [material.id])

  const handleToggleBookmark = async () => {
    setBookmarked(!bookmarked)
    await toggleBookmark(material.id)
  }

  const handleDownload = async () => {
    await trackDownload(material.id)
    window.open(`/api/file?pathname=${encodeURIComponent(material.fileUrl)}`, "_blank")
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      await addComment(material.id, newComment.trim())
      setNewComment("")
    } catch (error) {
      console.error("Failed to add comment:", error)
    }
    setSubmitting(false)
  }

  const handleDeleteComment = async (commentId: number) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      await deleteComment(commentId)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Browse
        </Link>
        <span>/</span>
        <span>{department.name}</span>
        <span>/</span>
        <Link
          href={`/dashboard/course/${course.id}`}
          className="hover:text-foreground transition-colors"
        >
          {course.code}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{material.title}</span>
      </div>

      {/* Back Link */}
      <Link
        href={`/dashboard/course/${course.id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to {course.code}
      </Link>

      {/* Material Card */}
      <Card className="bg-card border-border mb-8">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-4 bg-primary/10 rounded-xl text-primary">
              {getFileIcon(material.fileType)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{material.title}</h1>
              {material.description && (
                <p className="text-muted-foreground mt-2">{material.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge variant="secondary">{getFileTypeLabel(material.fileType)}</Badge>
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(material.fileSize)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {material.downloadCount} downloads
                </span>
                <span className="text-sm text-muted-foreground">
                  Uploaded {formatDate(material.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-6">
                {canDownload ? (
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                ) : (
                  <Button asChild variant="secondary">
                    <Link href="/pricing">
                      <Lock className="h-4 w-4 mr-2" />
                      Upgrade to Download
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleToggleBookmark}
                  disabled={loadingBookmark}
                >
                  {bookmarked ? (
                    <>
                      <BookmarkCheck className="h-4 w-4 mr-2 text-primary" />
                      Bookmarked
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-4 w-4 mr-2" />
                      Bookmark
                    </>
                  )}
                </Button>
                {/* Req 7.1 — mark lesson completed */}
                {canView && (
                  <Button
                    variant={lessonDone ? "secondary" : "outline"}
                    onClick={async () => {
                      await markLessonCompleted(material.id)
                      setLessonDone(true)
                    }}
                    disabled={lessonDone}
                  >
                    <CheckCircle2 className={`h-4 w-4 mr-2 ${lessonDone ? "text-green-500" : ""}`} />
                    {lessonDone ? "Completed" : "Mark as Complete"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paywall banner when user cannot view this material */}
      {!canView && (
        <Card className="bg-card border-border mb-8 border-dashed">
          <CardContent className="p-6 text-center">
            <div className="inline-flex p-3 bg-primary/10 rounded-full text-primary mb-3">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {isRecording ? "Recordings require a paid plan" : "This material requires a subscription"}
            </h2>
            <p className="text-muted-foreground mt-1 max-w-md mx-auto">
              {isRecording
                ? "Choose a paid plan from M20 to M100 to access recordings and downloads."
                : "Choose a paid plan from M20 to M100 to view study materials."}
            </p>
            <Button asChild className="mt-4">
              <Link href="/pricing">
                <CreditCard className="h-4 w-4 mr-2" />
                View Plans
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Comments Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">
            Discussion ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add Comment Form */}
          <form onSubmit={handleSubmitComment} className="mb-6">
            <Textarea
              placeholder="Share your thoughts or ask a question..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="mb-3"
              rows={3}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || !newComment.trim()}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Post Comment
              </Button>
            </div>
          </form>

          <Separator className="my-6" />

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No comments yet. Be the first to start a discussion!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map(({ comment, user }) => {
                const initials = user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)

                return (
                  <div key={comment.id} className="flex gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.image || undefined} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        {(comment.userId === currentUserId || userRole === "admin") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-foreground mt-1 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
