"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Headphones, Video, Download, BookmarkX, Bookmark, MessageSquare } from "lucide-react"
import { toggleBookmark, trackDownload } from "@/app/actions/materials"

interface BookmarkItem {
  bookmark: {
    id: number
    userId: string
    materialId: number
    createdAt: Date
  }
  material: {
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
  course: {
    id: number
    departmentId: number
    code: string
    name: string
    description: string | null
    createdAt: Date
  }
  department: {
    id: number
    name: string
    description: string | null
    createdAt: Date
  }
}

interface BookmarksListProps {
  bookmarks: BookmarkItem[]
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

export function BookmarksList({ bookmarks }: BookmarksListProps) {
  const handleRemoveBookmark = async (materialId: number) => {
    await toggleBookmark(materialId)
  }

  const handleDownload = async (material: BookmarkItem["material"]) => {
    await trackDownload(material.id)
    window.open(`/api/file?pathname=${encodeURIComponent(material.fileUrl)}`, "_blank")
  }

  if (bookmarks.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Bookmarks Yet</h3>
          <p className="text-muted-foreground mb-4">
            Start bookmarking materials to access them quickly later.
          </p>
          <Link href="/dashboard">
            <Button>Browse Materials</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {bookmarks.map(({ bookmark, material, course, department }) => (
        <Card key={bookmark.id} className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                {getFileIcon(material.fileType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-foreground">{material.title}</h3>
                    {material.description && (
                      <p className="text-sm text-muted-foreground mt-1">{material.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Link
                        href={`/dashboard/course/${course.id}`}
                        className="hover:text-foreground transition-colors"
                      >
                        {department.name} / {course.code}
                      </Link>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {getFileTypeLabel(material.fileType)}
                      </Badge>
                      <span>{formatFileSize(material.fileSize)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveBookmark(material.id)}
                      title="Remove bookmark"
                    >
                      <BookmarkX className="h-4 w-4 text-destructive" />
                    </Button>
                    <Link href={`/dashboard/material/${material.id}`}>
                      <Button variant="ghost" size="icon">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(material)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
