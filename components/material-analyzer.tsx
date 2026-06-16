"use client"

import { useState, useRef, useCallback, useTransition } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Headphones,
  Video,
  X,
  Loader2,
  AlertTriangle,
  Sparkles,
  Send,
  RefreshCw,
  CheckCircle2,
  File,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────
interface AnalysisResult {
  explanation: string
  fileName: string
  fileSize: number
  fileType: string
  category: string
  model: string
}

interface FollowUp {
  question: string
  answer: string
}

// ─── Helpers ───────────────────────────────────────────────
const ACCEPTED = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.m4a,.mp4,.mov,.webm"

const MAX_SIZES: Record<string, number> = {
  video: 100 * 1024 * 1024,
  default: 20 * 1024 * 1024,
}

const MIME_CATEGORY: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "image", "image/jpg": "image", "image/png": "image",
  "image/gif": "image", "image/webp": "image",
  "audio/mpeg": "audio", "audio/mp3": "audio", "audio/wav": "audio",
  "audio/x-wav": "audio", "audio/mp4": "audio", "audio/m4a": "audio",
  "audio/ogg": "audio", "audio/aac": "audio",
  "video/mp4": "video", "video/quicktime": "video", "video/webm": "video",
  "video/x-msvideo": "video", "video/avi": "video",
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function FileIcon({ category, className }: { category: string; className?: string }) {
  const cls = className ?? "h-5 w-5"
  if (category === "image") return <ImageIcon className={cls} />
  if (category === "audio") return <Headphones className={cls} />
  if (category === "video") return <Video className={cls} />
  return <FileText className={cls} />
}

function categoryColor(cat: string) {
  if (cat === "image") return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
  if (cat === "audio") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  if (cat === "video") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
}

// ─── Markdown renderer ─────────────────────────────────────
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => (
          <h2 className="text-lg font-bold text-foreground mt-6 mb-3 flex items-center gap-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-foreground leading-relaxed mb-3">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1.5 mb-3 text-sm text-foreground">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1.5 mb-3 text-sm text-foreground">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        code: ({ children }) => (
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">{children}</code>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary pl-4 my-3 text-muted-foreground text-sm italic">{children}</blockquote>
        ),
        hr: () => <hr className="border-border my-4" />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

// ─── Main component ─────────────────────────────────────────
export function MaterialAnalyzer() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [followUpQ, setFollowUpQ] = useState("")
  const [followUpLoading, setFollowUpLoading] = useState(false)

  const validateFile = (file: File): string | null => {
    const cat = MIME_CATEGORY[file.type]
    if (!cat) return `Unsupported format: ${file.type || "unknown"}. Use PDF, Word, image, audio, or video.`
    const max = cat === "video" ? MAX_SIZES.video : MAX_SIZES.default
    if (file.size > max) return `File too large. Max ${formatBytes(max)} for ${cat} files.`
    return null
  }

  const handleFileSelect = (file: File) => {
    const err = validateFile(file)
    if (err) { setFileError(err); setSelectedFile(null); return }
    setFileError(null)
    setSelectedFile(file)
    setResult(null)
    setAnalysisError(null)
    setFollowUps([])
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFileSelect(f)
    e.target.value = ""
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileSelect(f)
  }, [])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)

  const handleAnalyze = async () => {
    if (!selectedFile) return
    setAnalyzing(true)
    setAnalysisError(null)
    setResult(null)
    setUploadProgress(0)

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 10, 85))
    }, 200)

    try {
      const form = new FormData()
      form.append("file", selectedFile)

      const res = await fetch("/api/assistant/analyze", {
        method: "POST",
        body: form,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Analysis failed")

      setResult(data)
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      clearInterval(progressInterval)
      setAnalyzing(false)
    }
  }

  const handleFollowUp = async () => {
    if (!followUpQ.trim() || !result) return
    setFollowUpLoading(true)
    const question = followUpQ.trim()
    setFollowUpQ("")

    try {
      const contextPrompt = `The student is asking a follow-up question about this material they just had explained:

File: ${result.fileName}
---
${result.explanation}
---

Student follow-up question: ${question}

Answer clearly and helpfully in 2-4 paragraphs.`

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: contextPrompt }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to get answer")

      setFollowUps((prev) => [...prev, { question, answer: data.answer ?? "No response." }])
    } catch (err) {
      setFollowUps((prev) => [...prev, {
        question,
        answer: `Error: ${err instanceof Error ? err.message : "Failed to answer"}`,
      }])
    } finally {
      setFollowUpLoading(false)
    }
  }

  const category = selectedFile ? (MIME_CATEGORY[selectedFile.type] ?? "file") : null

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Analyze Study Material
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload any study material and get an AI-generated explanation, key concepts, and exam questions.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/10 scale-[1.01]"
                : selectedFile
                ? "border-green-400 bg-green-50 dark:bg-green-900/10 cursor-default"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            } p-6`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={ACCEPTED}
              onChange={onInputChange}
            />

            {selectedFile ? (
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${categoryColor(category ?? "file")}`}>
                  <FileIcon category={category ?? "file"} className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatBytes(selectedFile.size)} · {category?.toUpperCase()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFile(null)
                    setResult(null)
                    setAnalysisError(null)
                    setUploadProgress(0)
                  }}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">Drop your file here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, Word, JPG, PNG · MP3, WAV · MP4, MOV
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 20 MB (100 MB for video)
                </p>
              </div>
            )}
          </div>

          {/* File error */}
          {fileError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {fileError}
            </div>
          )}

          {/* Progress bar */}
          {analyzing && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {uploadProgress < 90 ? "Uploading and processing…" : "Generating explanation…"}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Analyse button */}
          <Button
            onClick={handleAnalyze}
            disabled={!selectedFile || analyzing}
            className="w-full"
            size="lg"
          >
            {analyzing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing…</>
            ) : result ? (
              <><RefreshCw className="mr-2 h-4 w-4" />Re-analyze</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Analyze with AI</>
            )}
          </Button>

          {/* Supported formats */}
          <div className="flex flex-wrap gap-2">
            {[
              { icon: FileText, label: "PDF / Word", color: "text-orange-500" },
              { icon: ImageIcon, label: "Images", color: "text-purple-500" },
              { icon: Headphones, label: "Audio", color: "text-green-500" },
              { icon: Video, label: "Video", color: "text-blue-500" },
            ].map(({ icon: Icon, label, color }) => (
              <span key={label} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-3 py-1">
                <Icon className={`h-3 w-3 ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {analysisError && !analyzing && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive text-sm">Analysis failed</p>
              <p className="text-sm text-muted-foreground mt-1">{analysisError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${categoryColor(result.category)}`}>
                  <FileIcon category={result.category} className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{result.fileName}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(result.fileSize)} · {result.category.toUpperCase()} · via {result.model}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Analysis complete
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <MarkdownContent content={result.explanation} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Follow-up questions */}
      {result && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Ask a follow-up question
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Ask anything about this material — the AI has context from the analysis.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Previous follow-ups */}
            {followUps.map((fup, i) => (
              <div key={i} className="space-y-2">
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-sm">
                  <p className="font-medium text-primary text-xs mb-1">You</p>
                  <p className="text-foreground">{fup.question}</p>
                </div>
                <div className="rounded-xl bg-muted border border-border p-3">
                  <p className="font-medium text-xs text-muted-foreground mb-2">AI Assistant</p>
                  <MarkdownContent content={fup.answer} />
                </div>
              </div>
            ))}

            {/* Input */}
            <div className="flex gap-2">
              <Textarea
                value={followUpQ}
                onChange={(e) => setFollowUpQ(e.target.value)}
                placeholder="e.g. Can you explain the second key concept in more detail?"
                rows={2}
                className="flex-1"
                disabled={followUpLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleFollowUp()
                  }
                }}
              />
              <Button
                onClick={handleFollowUp}
                disabled={!followUpQ.trim() || followUpLoading}
                className="shrink-0"
              >
                {followUpLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Press Enter to send, Shift+Enter for new line.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
