"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  FileText,
  Video,
  Headphones,
  Download,
  MessageSquare,
  Trash2,
  Upload,
  Search,
  ChevronRight,
} from "lucide-react"
import { deleteMaterial } from "@/app/actions/materials"
import { useRouter } from "next/navigation"

interface MaterialItem {
  material: {
    id: number
    title: string
    fileType: string
    fileName: string
    fileSize: number
    downloadCount: number
    createdAt: Date
    lastEditedAt?: Date | null
  }
  course: { id: number; code: string; name: string }
  department: { name: string }
}

interface MyMaterialsListProps {
  materials: MaterialItem[]
  userRole: string
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

function fileBadgeColor(fileType: string) {
  if (fileType.includes("video")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  if (fileType.includes("audio")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
  if (fileType.includes("pdf")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  if (fileType.includes("word") || fileType.includes("document")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  return "bg-muted text-muted-foreground"
}

function formatSize(bytes: number) {
  if (bytes === 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Group by file type category
const TYPE_GROUPS = [
  { key: "all", label: "All" },
  { key: "document", label: "Documents" },
  { key: "audio", label: "Audio" },
  { key: "video", label: "Video" },
  { key: "lesson", label: "Lessons" },
]

function matchesGroup(fileType: string, key: string) {
  if (key === "all") return true
  if (key === "document") return fileType.includes("pdf") || fileType.includes("word") || fileType.includes("document")
  if (key === "audio") return fileType.includes("audio")
  if (key === "video") return fileType.includes("video")
  if (key === "lesson") return fileType === "lesson/text"
  return false
}

export function MyMaterialsList({ materials, userRole }: MyMaterialsListProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [activeGroup, setActiveGroup] = useState("all")
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const filtered = materials.filter(({ material, course, department }) => {
    const q = query.toLowerCase()
    const matchesQuery =
      !q ||
      material.title.toLowerCase().includes(q) ||
      course.code.toLowerCase().includes(q) ||
      course.name.toLowerCase().includes(q) ||
      department.name.toLowerCase().includes(q)
    return matchesQuery && matchesGroup(material.fileType, activeGroup)
  })

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this material? This cannot be undone.")) return
    setDeletingId(id)
    try {
      await deleteMaterial(id)
      router.refresh()
    } catch (err) {
      console.error(err)
    }
    setDeletingId(null)
  }

  if (materials.length === 0) {
    return (
      <Card className="border-dashed border-border">
        <CardContent className="py-16 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Materials Yet</h3>
          <p className="text-muted-foreground mb-6">
            Upload PDFs, Word documents, audio recordings, or video lectures to get started.
          </p>
          <Link href="/dashboard/upload" className={buttonVariants()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload First Material
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, course, or department…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {TYPE_GROUPS.map((g) => {
            const count = materials.filter(({ material }) => matchesGroup(material.fileType, g.key)).length
            return (
              <button
                key={g.key}
                onClick={() => setActiveGroup(g.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeGroup === g.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {g.label}
                <span className="ml-1.5 text-xs opacity-70">({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} of {materials.length} material{materials.length !== 1 ? "s" : ""}
      </p>

      {filtered.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-10 text-center text-muted-foreground">
            No materials match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(({ material, course, department }) => (
            <Card key={material.id} className="border-border hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="p-3 bg-muted rounded-xl shrink-0">
                    {fileIcon(material.fileType)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground truncate">{material.title}</h3>
                      <Badge variant="outline" className={`text-xs shrink-0 ${fileBadgeColor(material.fileType)}`}>
                        {fileLabel(material.fileType)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {department.name} · {course.code} — {course.name}
                    </p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {material.downloadCount} downloads
                      </span>
                      <span>{formatSize(material.fileSize)}</span>
                      <span>Uploaded {new Date(material.createdAt).toLocaleDateString()}</span>
                      {material.lastEditedAt && (
                        <span>Edited {new Date(material.lastEditedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/dashboard/material/${material.id}`}
                      className={buttonVariants({ variant: "ghost", size: "icon" })}
                      title="View comments"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/dashboard/course/${course.id}`}
                      className={buttonVariants({ variant: "ghost", size: "icon" })}
                      title="Go to course"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(material.id)}
                      disabled={deletingId === material.id}
                      title="Delete material"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload more CTA at bottom */}
      <div className="pt-2 flex justify-center">
        <Link href="/dashboard/upload" className={buttonVariants({ variant: "outline" })}>
          <Upload className="h-4 w-4 mr-2" />
          Upload More Materials
        </Link>
      </div>
    </div>
  )
}
