"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createMaterial } from "@/app/actions/materials"
import { createLesson, type LessonFieldErrors } from "@/app/actions/materials"
import { Upload, Loader2, FileText, AlertCircle, CheckCircle2 } from "lucide-react"

interface Course {
  id: number
  code: string
  name: string
}

interface Department {
  id: number
  name: string
  description: string | null
  courses: Course[]
}

interface UploadMaterialFormProps {
  departments: Department[]
}

// ─── Course selector sub-component ──────────────────────────
function CourseSelector({
  departments,
  departmentId,
  courseId,
  onDepartmentChange,
  onCourseChange,
}: {
  departments: Department[]
  departmentId: string
  courseId: string
  onDepartmentChange: (v: string) => void
  onCourseChange: (v: string) => void
}) {
  const courses = useMemo(
    () => departments.find((d) => d.id.toString() === departmentId)?.courses ?? [],
    [departments, departmentId]
  )
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="department">Department</Label>
        <Select value={departmentId} onValueChange={onDepartmentChange}>
          <SelectTrigger id="department"><SelectValue placeholder="Select department" /></SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="course">Course</Label>
        <Select value={courseId} onValueChange={onCourseChange}>
          <SelectTrigger id="course"><SelectValue placeholder="Select course" /></SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.code} — {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

// ─── File Upload tab ─────────────────────────────────────────
function FileUploadTab({ departments }: { departments: Department[] }) {
  const router = useRouter()
  const [departmentId, setDepartmentId] = useState(departments[0]?.id?.toString() ?? "")
  const [courseId, setCourseId] = useState(departments[0]?.courses?.[0]?.id?.toString() ?? "")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDepartmentChange = (val: string) => {
    setDepartmentId(val)
    const first = departments.find((d) => d.id.toString() === val)?.courses?.[0]
    if (first) setCourseId(first.id.toString())
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""))
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !courseId) {
      setMessage({ type: "error", text: "Please select a file and a course." })
      return
    }

    // Req 10.2 — video must be MP4 or WebM, max 2 GB
    if (selectedFile.type.startsWith("video/")) {
      if (!["video/mp4", "video/webm"].includes(selectedFile.type)) {
        setMessage({ type: "error", text: "Video files must be MP4 or WebM format." })
        return
      }
      if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
        setMessage({ type: "error", text: "Video files must not exceed 2 GB." })
        return
      }
    }

    setLoading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      const uploadResult = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadResult?.error ?? "Upload failed")

      await createMaterial({
        courseId: Number(courseId),
        title: title.trim(),
        description: description.trim() || undefined,
        fileType: uploadResult.type,
        fileName: selectedFile.name,
        fileUrl: uploadResult.pathname,
        fileSize: uploadResult.size,
      })

      setMessage({ type: "success", text: `"${title}" uploaded successfully.` })
      setTitle("")
      setDescription("")
      setSelectedFile(null)
      router.refresh()
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Upload failed" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleUpload} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <CourseSelector
          departments={departments}
          departmentId={departmentId}
          courseId={courseId}
          onDepartmentChange={handleDepartmentChange}
          onCourseChange={setCourseId}
        />
        <div className="space-y-1">
          <Label htmlFor="file-title">Material Title</Label>
          <Input
            id="file-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Week 3 Lecture Notes"
            required
            maxLength={200}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="file-desc">Description (optional)</Label>
          <Textarea
            id="file-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief summary of the material"
            rows={3}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="file-input">File</Label>
          <div
            className="rounded-xl border-2 border-dashed border-border p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.mp3,.wav,.mp4,.webm"
              onChange={handleFileSelect}
            />
            <Upload className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {selectedFile ? selectedFile.name : "Click to select — PDF, Word, MP3, WAV, MP4, WebM"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <h3 className="font-semibold text-foreground">File Requirements</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• PDF and Word documents</li>
          <li>• MP3 and WAV audio files</li>
          <li>• MP4 and WebM videos (max 2 GB)</li>
        </ul>
        {message && (
          <div className={`rounded-xl border p-3 flex items-start gap-2 text-sm ${
            message.type === "success"
              ? "border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}>
            {message.type === "success"
              ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
            {message.text}
          </div>
        )}
        <Button type="submit" disabled={loading || !selectedFile} className="w-full">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading…</> : "Upload Material"}
        </Button>
      </div>
    </form>
  )
}

// ─── Lesson Creation tab (Req 10.1) ─────────────────────────
function CreateLessonTab({ departments }: { departments: Department[] }) {
  const router = useRouter()
  const [departmentId, setDepartmentId] = useState(departments[0]?.id?.toString() ?? "")
  const [courseId, setCourseId] = useState(departments[0]?.courses?.[0]?.id?.toString() ?? "")
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")
  const [contentBody, setContentBody] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<LessonFieldErrors>({})
  const [success, setSuccess] = useState<string | null>(null)

  const handleDepartmentChange = (val: string) => {
    setDepartmentId(val)
    const first = departments.find((d) => d.id.toString() === val)?.courses?.[0]
    if (first) setCourseId(first.id.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setSuccess(null)
    setLoading(true)

    try {
      const result = await createLesson({
        courseId: Number(courseId),
        title,
        subject,
        contentBody,
        videoUrl: videoUrl.trim() || undefined,
      })

      if ("fieldErrors" in result) {
        setFieldErrors(result.fieldErrors)
      } else {
        setSuccess(`Lesson "${result.material.title}" published successfully.`)
        setTitle("")
        setSubject("")
        setContentBody("")
        setVideoUrl("")
        router.refresh()
      }
    } catch (err) {
      setFieldErrors({ title: err instanceof Error ? err.message : "Failed to create lesson" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <CourseSelector
          departments={departments}
          departmentId={departmentId}
          courseId={courseId}
          onDepartmentChange={handleDepartmentChange}
          onCourseChange={setCourseId}
        />

        {/* Title — 1–200 chars */}
        <div className="space-y-1">
          <Label htmlFor="lesson-title">
            Lesson Title <span className="text-muted-foreground text-xs">(1–200 characters)</span>
          </Label>
          <Input
            id="lesson-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Data Structures"
            maxLength={200}
            aria-invalid={!!fieldErrors.title}
          />
          {fieldErrors.title && <p className="text-sm text-destructive" role="alert">{fieldErrors.title}</p>}
        </div>

        {/* Subject */}
        <div className="space-y-1">
          <Label htmlFor="lesson-subject">Subject</Label>
          <Input
            id="lesson-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Computer Science"
            aria-invalid={!!fieldErrors.subject}
          />
          {fieldErrors.subject && <p className="text-sm text-destructive" role="alert">{fieldErrors.subject}</p>}
        </div>

        {/* Content body — 1–50,000 chars */}
        <div className="space-y-1">
          <Label htmlFor="lesson-body">
            Content Body{" "}
            <span className="text-muted-foreground text-xs">
              (1–50,000 characters · {contentBody.length.toLocaleString()}/50,000)
            </span>
          </Label>
          <Textarea
            id="lesson-body"
            value={contentBody}
            onChange={(e) => setContentBody(e.target.value)}
            placeholder="Write your lesson content here…"
            rows={10}
            maxLength={50000}
            aria-invalid={!!fieldErrors.contentBody}
          />
          {fieldErrors.contentBody && (
            <p className="text-sm text-destructive" role="alert">{fieldErrors.contentBody}</p>
          )}
        </div>

        {/* Optional video URL */}
        <div className="space-y-1">
          <Label htmlFor="lesson-video">Video URL (optional)</Label>
          <Input
            id="lesson-video"
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://example.com/lecture.mp4"
            aria-invalid={!!fieldErrors.videoUrl}
          />
          {fieldErrors.videoUrl && (
            <p className="text-sm text-destructive" role="alert">{fieldErrors.videoUrl}</p>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-start gap-2">
          <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground">Lesson Guidelines</h3>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Title: 1–200 characters</li>
              <li>• Subject is required for AI exercise matching</li>
              <li>• Content body: up to 50,000 characters</li>
              <li>• Video URL must be a valid URL if provided</li>
            </ul>
          </div>
        </div>

        {success && (
          <div className="rounded-xl border border-green-300 bg-green-50 dark:bg-green-900/20 p-3 flex items-start gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            {success}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing…</> : "Publish Lesson"}
        </Button>
      </div>
    </form>
  )
}

// ─── Main export ─────────────────────────────────────────────
export function UploadMaterialForm({ departments }: UploadMaterialFormProps) {
  return (
    <Tabs defaultValue="file" className="space-y-6">
      <TabsList>
        <TabsTrigger value="file">Upload File</TabsTrigger>
        <TabsTrigger value="lesson">Create Lesson</TabsTrigger>
      </TabsList>
      <TabsContent value="file">
        <FileUploadTab departments={departments} />
      </TabsContent>
      <TabsContent value="lesson">
        <CreateLessonTab departments={departments} />
      </TabsContent>
    </Tabs>
  )
}
