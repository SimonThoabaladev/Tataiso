"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2, Send, Bot, User, Paperclip, X,
  FileText, AlertTriangle, Trash2, RefreshCw,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────
interface HistoryTurn { role: "user" | "assistant"; text: string }

interface ChatMessage extends HistoryTurn {
  fileName?: string
  streaming?: boolean
  isError?: boolean
}

interface AttachedFile {
  name: string
  mimeType: string
  base64: string
  sizeBytes: number
}

// ── Constants ─────────────────────────────────────────────────
const MAX_FILE_BYTES = 15 * 1024 * 1024  // 15 MB
const ACCEPT = ".pdf,.doc,.docx"

const ALLOWED_MIME: Record<string, boolean> = {
  "application/pdf": true,
  "application/msword": true,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
}

const ERROR_MESSAGES: Record<string, string> = {
  "__RATE_LIMIT__": "I'm a bit busy right now — please try again in a moment.",
  "__MODEL_NOT_FOUND__": "The AI model is temporarily unavailable. Please try again shortly.",
  "__NO_KEY__": "AI service is not configured. Please contact your administrator.",
  "__ERROR__": "Something went wrong. Please try again.",
}

// ── Markdown renderer ─────────────────────────────────────────
function MD({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1 text-foreground">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1 text-foreground">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h3>,
        p: ({ children }) => <p className="mb-2 leading-relaxed text-sm">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5 text-sm">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5 text-sm">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        code: ({ children }) => (
          <code className="bg-muted/70 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="bg-muted rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono whitespace-pre-wrap">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/40 pl-3 my-2 text-muted-foreground italic text-sm">{children}</blockquote>
        ),
        hr: () => <hr className="border-border my-3" />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

// ── Component ─────────────────────────────────────────────────
export function AssistantChat({ tier }: { tier?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [attached, setAttached] = useState<AttachedFile | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── File handling ─────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setFileError(null)

    if (!ALLOWED_MIME[file.type]) {
      setFileError("Only PDF and Word documents (.pdf, .doc, .docx) are supported.")
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 15 MB.`)
      return
    }

    const buf = await file.arrayBuffer()
    const base64 = Buffer.from(buf).toString("base64")
    setAttached({ name: file.name, mimeType: file.type, base64, sizeBytes: file.size })
  }

  // ── Send message ──────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text && !attached) return

    const displayText = text || `[Attached: ${attached!.name}]`
    const fileToSend = attached

    // Build history from non-error messages
    const history: HistoryTurn[] = messages
      .filter((m) => !m.isError)
      .map(({ role, text }) => ({ role, text }))

    // Add user message
    setMessages((prev) => [...prev, {
      role: "user",
      text: displayText,
      fileName: fileToSend?.name,
    }])
    setInput("")
    setAttached(null)
    setLoading(true)

    // Add streaming placeholder for assistant
    setMessages((prev) => [...prev, { role: "assistant", text: "", streaming: true }])

    try {
      const body: any = { prompt: displayText, history }
      if (fileToSend) {
        body.file = { name: fileToSend.name, mimeType: fileToSend.mimeType, data: fileToSend.base64 }
      }

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.body) throw new Error("No response body")

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const raw = dec.decode(value, { stream: true })
        const lines = raw.split("\n")

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const payload = line.slice(6).trim()
          if (payload === "[DONE]") break

          try {
            const parsed = JSON.parse(payload)

            // Error sentinel
            if (typeof parsed === "object" && parsed?.error) {
              const friendlyMsg = ERROR_MESSAGES[parsed.error] ?? ERROR_MESSAGES["__ERROR__"]
              setMessages((prev) => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: "assistant", text: friendlyMsg, isError: true, streaming: false }
                return copy
              })
              setLoading(false)
              return
            }

            // Normal text chunk
            if (typeof parsed === "string") {
              accumulated += parsed
              const snap = accumulated
              setMessages((prev) => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: "assistant", text: snap, streaming: true }
                return copy
              })
            }
          } catch { /* malformed line — skip */ }
        }
      }

      // Finalise
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: "assistant", text: accumulated || "No response received.", streaming: false }
        return copy
      })

    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = {
          role: "assistant",
          text: err instanceof Error ? err.message : ERROR_MESSAGES["__ERROR__"],
          isError: true,
          streaming: false,
        }
        return copy
      })
    } finally {
      setLoading(false)
    }
  }, [input, attached, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!loading) sendMessage()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header card */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Ask the AI Assistant</CardTitle>
              {tier && tier !== "free" && (
                <Badge variant="secondary" className="capitalize">{tier}</Badge>
              )}
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost" size="sm"
                className="text-muted-foreground gap-1.5 text-xs"
                onClick={() => setMessages([])}
              >
                <Trash2 className="h-3.5 w-3.5" />Clear
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Academic questions only · Attach a PDF or Word document to have it explained
          </p>
        </CardHeader>
      </Card>

      {/* Empty state */}
      {messages.length === 0 && (
        <Card className="border-dashed border-border">
          <CardContent className="py-8 text-center">
            <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">How can I help you study today?</p>
            <div className="mt-4 grid gap-2 max-w-sm mx-auto text-left">
              {[
                "Summarise my lecture notes",
                "Explain this concept step-by-step",
                "Generate practice questions for me",
                "Help me prepare for my exam",
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted text-left transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversation */}
      {messages.length > 0 && (
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1 pb-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                  msg.isError ? "bg-orange-100 dark:bg-orange-900/30" : "bg-primary/10"
                }`}>
                  {msg.isError
                    ? <AlertTriangle className="h-4 w-4 text-orange-500" />
                    : <Bot className="h-4 w-4 text-primary" />
                  }
                </div>
              )}

              <div className={`rounded-2xl px-4 py-3 text-sm max-w-[85%] ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : msg.isError
                  ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-foreground rounded-bl-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}>
                {msg.fileName && (
                  <div className={`flex items-center gap-1.5 mb-2 text-xs font-medium pb-2 border-b ${
                    msg.role === "user" ? "border-primary-foreground/20" : "border-border"
                  }`}>
                    <FileText className="h-3 w-3" />
                    {msg.fileName}
                  </div>
                )}
                {msg.role === "user"
                  ? <p className="whitespace-pre-wrap">{msg.text}</p>
                  : msg.streaming && !msg.text
                  ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  : <MD content={msg.text} />
                }
                {msg.streaming && msg.text && (
                  <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-0.5 rounded-sm" />
                )}
              </div>

              {msg.role === "user" && (
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input area */}
      <Card className="border-border">
        <CardContent className="p-3 space-y-2">
          {/* Attached file chip */}
          {attached && (
            <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{attached.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(attached.sizeBytes / 1024).toFixed(0)} KB
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                onClick={() => setAttached(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* File error */}
          {fileError && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{fileError}</span>
              <button type="button" className="ml-auto" onClick={() => setFileError(null)}>
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Text + buttons */}
          <div className="flex gap-2 items-end">
            <input ref={fileInputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFileChange} />
            <Button
              type="button" variant="outline" size="icon"
              className="shrink-0 h-10 w-10"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="Attach PDF or Word doc (max 15 MB)"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
              rows={2}
              className="flex-1 min-h-[40px] max-h-32 resize-none"
              disabled={loading}
            />

            <Button
              type="button"
              onClick={sendMessage}
              disabled={loading || (!input.trim() && !attached)}
              className="shrink-0 h-10"
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Attach PDF or Word · Max 15 MB · Academic use only · Enter to send
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
