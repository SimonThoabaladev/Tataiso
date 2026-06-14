"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FileText, Headphones, Video, Download, Bookmark, Search, Loader2, MessageSquare } from "lucide-react"
import { searchMaterials, toggleBookmark, trackDownload } from "@/app/actions/materials"

interface SearchResult {
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

export function SearchMaterials() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)
    try {
      const data = await searchMaterials(query.trim())
      setResults(data)
    } catch (error) {
      console.error("Search error:", error)
    }
    setLoading(false)
  }

  const handleBookmark = async (materialId: number) => {
    await toggleBookmark(materialId)
  }

  const handleDownload = async (material: SearchResult["material"]) => {
    await trackDownload(material.id)
    window.open(`/api/file?pathname=${encodeURIComponent(material.fileUrl)}`, "_blank")
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, course name, department..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {searched && !loading && results.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Results Found</h3>
            <p className="text-muted-foreground">
              {`Try different keywords or check the spelling.`}
            </p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{results.length} result(s) found</p>
          <div className="grid gap-4">
            {results.map(({ material, course, department }) => (
              <Card key={material.id} className="bg-card border-border">
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
                              {department.name} / {course.code} - {course.name}
                            </Link>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {getFileTypeLabel(material.fileType)}
                            </Badge>
                            <span>{formatFileSize(material.fileSize)}</span>
                            <span>{material.downloadCount} downloads</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleBookmark(material.id)}
                          >
                            <Bookmark className="h-4 w-4" />
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
        </div>
      )}
    </div>
  )
}
