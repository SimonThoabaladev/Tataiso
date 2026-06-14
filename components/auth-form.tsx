"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { Loader2, GraduationCap, School, UserCheck, Users } from "lucide-react"

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

const roles = [
  {
    value: "student",
    label: "Student",
    icon: Users,
    description: "Access self-study materials and research guidance",
  },
  {
    value: "tutor",
    label: "Tutor",
    icon: UserCheck,
    description: "Provide verified tutoring support to students",
  },
  {
    value: "lecturer",
    label: "Lecturer",
    icon: School,
    description: "Create and manage course content and research materials",
  },
]

type FieldErrors = {
  name?: string
  email?: string
  password?: string
  role?: string
  general?: string
}

// ── Req 1.1 validation ──────────────────────────────────────
function validateSignUp(fields: {
  name: string
  email: string
  password: string
  role: string
}): FieldErrors {
  const errors: FieldErrors = {}

  // Display name: 2–50 characters
  if (!fields.name || fields.name.trim().length < 2) {
    errors.name = "Display name must be at least 2 characters."
  } else if (fields.name.trim().length > 50) {
    errors.name = "Display name must not exceed 50 characters."
  }

  // Email format
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!fields.email || !emailRe.test(fields.email)) {
    errors.email = "Please enter a valid email address."
  }

  // Password: 8–128 characters
  if (!fields.password || fields.password.length < 8) {
    errors.password = "Password must be at least 8 characters."
  } else if (fields.password.length > 128) {
    errors.password = "Password must not exceed 128 characters."
  }

  // Role selection
  if (!["student", "tutor", "lecturer"].includes(fields.role)) {
    errors.role = "Please select a valid role (Student or Instructor)."
  }

  return errors
}

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("student")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  // Req 1.7 — show resend option after rejected unverified login
  const [showResend, setShowResend] = useState(false)
  const [resendEmail, setResendEmail] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setShowResend(false)

    // Client-side validation for sign-up (Req 1.1, 1.4)
    if (mode === "sign-up") {
      const errors = validateSignUp({ name, email, password, role })
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return // Preserve entered values (Req 1.4)
      }
    }

    setLoading(true)

    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
          role,
        })
        if (result.error) {
          const msg = result.error.message ?? "Sign up failed"
          // Req 1.3 — duplicate email
          if (
            msg.toLowerCase().includes("email") &&
            (msg.toLowerCase().includes("use") || msg.toLowerCase().includes("exist"))
          ) {
            setFieldErrors({ email: "This email address is already in use." })
          } else {
            setFieldErrors({ general: msg })
          }
          setLoading(false)
          return
        }
        // After successful sign-up, redirect to subscription selection (Req 1.5)
        router.push("/pricing")
        router.refresh()
      } else {
        const result = await authClient.signIn.email({ email, password })
        if (result.error) {
          const msg = result.error.message ?? "Sign in failed"
          // Req 1.7 — unverified email
          if (msg.toLowerCase().includes("verify") || msg.toLowerCase().includes("verified")) {
            setFieldErrors({
              general: "Please verify your email before signing in.",
            })
            setShowResend(true)
            setResendEmail(email)
          } else {
            setFieldErrors({ general: msg })
          }
          setLoading(false)
          return
        }
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setFieldErrors({ general: "An unexpected error occurred. Please try again." })
      setLoading(false)
    }
  }

  // Req 1.7 / 1.8 — resend verification email
  const handleResendVerification = async () => {
    if (!resendEmail) return
    setResendLoading(true)
    setResendMessage(null)
    try {
      // better-auth exposes sendVerificationEmail on the client
      await (authClient as any).sendVerificationEmail?.({
        email: resendEmail,
        callbackURL: "/pricing",
      })
      setResendMessage("Verification email sent. Please check your inbox.")
    } catch {
      setResendMessage("Failed to send verification email. Please try again later.")
    }
    setResendLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setFieldErrors({})
    setGoogleLoading(true)
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })
    } catch {
      setFieldErrors({ general: "Google sign-in failed. Please try again." })
      setGoogleLoading(false)
    }
  }

  const selectedRole = roles.find((r) => r.value === role)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {mode === "sign-in" ? "Welcome back to TATAISO" : "Join TATAISO"}
          </CardTitle>
          <CardDescription>
            {mode === "sign-in"
              ? "Sign in to access your learning materials"
              : "Create an account to start learning"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === "sign-up" && (
              <>
                {/* Display Name */}
                <div className="space-y-1">
                  <Label htmlFor="name">
                    Full Name <span className="text-muted-foreground text-xs">(2–50 characters)</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-describedby={fieldErrors.name ? "name-error" : undefined}
                    aria-invalid={!!fieldErrors.name}
                    maxLength={50}
                    required
                  />
                  {fieldErrors.name && (
                    <p id="name-error" className="text-sm text-destructive" role="alert">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <Label htmlFor="role">I am a</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger id="role" aria-invalid={!!fieldErrors.role}>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          <div className="flex items-center gap-2">
                            <r.icon className="h-4 w-4" />
                            <span>{r.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRole && !fieldErrors.role && (
                    <p className="text-xs text-muted-foreground">{selectedRole.description}</p>
                  )}
                  {fieldErrors.role && (
                    <p className="text-sm text-destructive" role="alert">
                      {fieldErrors.role}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                aria-invalid={!!fieldErrors.email}
                required
              />
              {fieldErrors.email && (
                <p id="email-error" className="text-sm text-destructive" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label htmlFor="password">
                Password{" "}
                {mode === "sign-up" && (
                  <span className="text-muted-foreground text-xs">(8–128 characters)</span>
                )}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                aria-invalid={!!fieldErrors.password}
                required
                minLength={8}
                maxLength={128}
              />
              {fieldErrors.password && (
                <p id="password-error" className="text-sm text-destructive" role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* General error */}
            {fieldErrors.general && (
              <p className="text-sm text-destructive text-center" role="alert">
                {fieldErrors.general}
              </p>
            )}

            {/* Resend verification (Req 1.7) */}
            {showResend && (
              <div className="rounded-lg border border-border bg-muted p-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Haven&apos;t received the verification email?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                >
                  {resendLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Resend verification email
                </Button>
                {resendMessage && (
                  <p className="text-xs text-muted-foreground">{resendMessage}</p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "sign-in" ? "Sign In" : "Create Account"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted-foreground/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              <span className="ml-2">Google</span>
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "sign-in" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/sign-up" className="text-primary hover:underline">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/sign-in" className="text-primary hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
