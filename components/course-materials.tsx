"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ChevronLeft,
  Plus,
  FileText,
  Headphones,
  Video,
  Download,
  Bookmark,
  BookmarkCheck,
  MessageSquare,
  Loader2,
  Upload,
  Trash2,
  Lock,
  Eye,
  CreditCard,
} from "lucide-react"
import { createMaterial, deleteMaterial, toggleBookmark, trackDownload, isBookmarked } from "@/app/actions/materials"

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

interface SubscriptionAccess {
  plan: string
  canViewMaterials: boolean
  canDownload: boolean
  canViewRecordings: boolean
  fullAccess: boolean
}

interface CourseMaterialsProps {
  course: Course
  department: Department
  materials: Material[]
  userRole: string
  subscription: SubscriptionAccess
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf") || fileType.includes("word") || fileType.includes("document")) {
    return <FileText className="h-5 w-5" />
  }
  if (fileType.includes("audio")) {
    return <Headphones className="h-5 w-5" />
  }
  if (fileType.includes("video")) {
    return <Video className="h-5 w-5" />
  }
  return <FileText className="h-5 w-5" />
}

function getFileTypeLabel(fileType: string) {
  if (fileType.includes("pdf")) return "PDF"
  if (fileType.includes("word") || fileType.includes("document")) return "Word"
  if (fileType.includes("audio")) return "Audio"
  if (fileType.includes("video")) return "Video"
  return "File"
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

function isRecording(fileType: string) {
  return fileType.includes("audio") || fileType.includes("video")
}

export function CourseMaterials({ course, department, materials, userRole, subscription }: CourseMaterialsProps) {
  const canUpload = userRole === "admin" || userRole === "lecturer" || userRole === "tutor"
  const isStaff = ["admin", "lecturer", "tutor"].includes(userRole)
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set())
  const [loadingBookmarks, setLoadingBookmarks] = useState(true)

  useEffect(() => {
    async function loadBookmarks() {
      const bookmarked = new Set<number>()
      for (const material of materials) {
        const isMarked = await isBookmarked(material.id)
        if (isMarked) bookmarked.add(material.id)
      }
      setBookmarkedIds(bookmarked)
      setLoadingBookmarks(false)
    }
    loadBookmarks()
  }, [materials])

  const canViewMaterial = (material: Material) => {
    if (isStaff) return true
    if (isRecording(material.fileType)) {
      return subscription.canViewRecordings
    }
    return subscription.canViewMaterials
  }

  const canDownloadMaterial = (material: Material) => {
    if (isStaff) return true
    return subscription.canDownload
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""))
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) {
        const error = await uploadRes.json()
        throw new Error(error.error || "Upload failed")
      }

      const { pathname, type, size } = await uploadRes.json()

      await createMaterial({
        courseId: course.id,
        title,
        description: description || undefined,
        fileType: type,
        fileName: selectedFile.name,
        fileUrl: pathname,
        fileSize: size,
      })

      setDialogOpen(false)
      setTitle("")
      setDescription("")
      setSelectedFile(null)
    } catch (error) {
      console.error("Upload error:", error)
      alert("Failed to upload file. Please try again.")
    }
    setUploading(false)
  }

  const handleToggleBookmark = async (materialId: number) => {
    const newBookmarked = new Set(bookmarkedIds)
    if (newBookmarked.has(materialId)) {
      newBookmarked.delete(materialId)
    } else {
      newBookmarked.add(materialId)
    }
    setBookmarkedIds(newBookmarked)
    await toggleBookmark(materialId)
  }

  const handleDownload = async (material: Material) => {
    if (!canDownloadMaterial(material)) {
      alert("Upgrade to Premium to download materials")
      return
    }
    await trackDownload(material.id)
    window.open(`/api/file?pathname=${encodeURIComponent(material.fileUrl)}`, "_blank")
  }

  const handleView = async (material: Material) => {
    if (!canViewMaterial(material)) {
      return
    }
    window.open(`/api/file?pathname=${encodeURIComponent(material.fileUrl)}&view=true`, "_blank")
  }

  const handleDelete = async (materialId: number) => {
    if (confirm("Are you sure you want to delete this material?")) {
      await deleteMaterial(materialId)
    }
  }

  return (
    <div>
      {/* Subscription Banner for Free/Basic Users */}
      {!isStaff && !subscription.fullAccess && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">
                    {subscription.plan === "free"
                      ? "Start your free trial or choose a paid plan for full access"
                      : "Upgrade for full AI-marked tutorials and notes"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {subscription.plan === "free"
                      ? "Free trial gives you 2 AI-marked tutorials. Upgrade for full access."
                      : "Choose any paid plan from M20 to M100 for unlimited tutorials, notes, and downloads."}
                  </p>
                </div>
              </div>
              <Link href="/pricing">
                <Button size="sm">
                  {subscription.plan === "free" ? "Choose a plan" : "Upgrade"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Browse
        </Link>
        <span>/</span>
        <span>{department.name}</span>
        <span>/</span>
        <span className="text-foreground font-medium">{course.code}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Browse
          </Link>
          <h1 className="text-3xl font-bold text-foreground">
            {course.code} - {course.name}
          </h1>
          {course.description && (
            <p className="text-muted-foreground mt-2">{course.description}</p>
          )}
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="secondary">{department.name}</Badge>
            <Badge variant="outline">{materials.length} materials</Badge>
            {!isStaff && (
              <Badge variant={subscription.fullAccess ? "default" : "secondary"}>
                {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan
              </Badge>
            )}
          </div>
        </div>
        {canUpload && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Material</DialogTitle>
                <DialogDescription>
                  Upload a PDF, Word document, audio, or video file.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">File</Label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      id="file"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.mp3,.wav,.mp4,.webm"
                      onChange={handleFileSelect}
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2">
                        {getFileIcon(selectedFile.type)}
                        <span className="text-sm font-medium text-foreground">{selectedFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Click to select a file</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, Word, MP3, WAV, MP4, WebM
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Week 1 Lecture Notes"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description (optional)</Label>
                  <Textarea
                    id="desc"
                    placeholder="Brief description of the material"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={uploading || !selectedFile}>
                  {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Upload Material
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Materials List */}
      {materials.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Materials Yet</h3>
            <p className="text-muted-foreground">
              {canUpload
                ? "Start by uploading your first material for this course."
                : "No materials have been uploaded for this course yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {materials.map((material) => {
            const canView = canViewMaterial(material)
            const canDownload = canDownloadMaterial(material)
            const isRecordingType = isRecording(material.fileType)

            return (
              <Card 
                key={material.id} 
                className={`bg-card border-border ${!canView ? "opacity-75" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${canView ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {!canView ? <Lock className="h-5 w-5" /> : getFileIcon(material.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">{material.title}</h3>
                            {!canView && (
                              <Badge variant="outline" className="text-xs">
                                {isRecordingType ? "Paid plan required" : "Subscribe"}
                              </Badge>
                            )}
                          </div>
                          {material.description && canView && (
                            <p className="text-sm text-muted-foreground mt-1">{material.description}</p>
                          )}
                          {!canView && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {isRecordingType 
                                ? "Upgrade to a paid plan to access recordings."
                                : "Choose a paid plan from M20 to M100 to view this material."}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {getFileTypeLabel(material.fileType)}
                            </Badge>
                            <span>{formatFileSize(material.fileSize)}</span>
                            <span>{material.downloadCount} downloads</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {canView ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleBookmark(material.id)}
                                disabled={loadingBookmarks}
                              >
                                {bookmarkedIds.has(material.id) ? (
                                  <BookmarkCheck className="h-4 w-4 text-primary" />
                                ) : (
                                  <Bookmark className="h-4 w-4" />
                                )}
                              </Button>
                              <Link href={`/dashboard/material/${material.id}`}>
                                <Button variant="ghost" size="icon">
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleView(material)}
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(material)}
                                disabled={!canDownload}
                                title={canDownload ? "Download" : "Premium only"}
                              >
                                <Download className={`h-4 w-4 ${!canDownload ? "opacity-50" : ""}`} />
                              </Button>
                              {canUpload && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(material.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          ) : (
                            <Link href="/pricing">
                              <Button size="sm" variant="outline">
                                <Lock className="h-4 w-4 mr-2" />
                                Unlock
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
