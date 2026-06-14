import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  GraduationCap,
  BookOpen,
  FileText,
  Headphones,
  Video,
  Search,
  Bookmark,
  Users,
  School,
  Lightbulb,
  Trophy,
  TrendingUp,
  ClipboardCheck,
  Bell,
  CreditCard,
  Star,
  CheckCircle2,
  UserPlus,
  LogIn,
  ChevronRight,
  Upload,
  MessageSquare,
  BarChart3,
  Shield,
} from "lucide-react"

// ─── How-to steps per role ────────────────────────────────────
const HOW_TO_STEPS = {
  student: [
    {
      step: 1,
      icon: UserPlus,
      color: "bg-primary/10 text-primary",
      title: "Create an account",
      desc: "Sign up with your email or Google account. Choose the Student role and verify your email to activate your 7-day free trial.",
    },
    {
      step: 2,
      icon: CreditCard,
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      title: "Choose a plan",
      desc: "Start free or upgrade to Basic (M50), Standard (M80), Premium (M120), or Elite (M200) to unlock more lessons, AI features, and analytics.",
    },
    {
      step: 3,
      icon: BookOpen,
      color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      title: "Browse the Content Library",
      desc: "Navigate departments and courses from your dashboard. Open any course to find lecture notes, audio recordings, and video lessons.",
    },
    {
      step: 4,
      icon: Lightbulb,
      color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
      title: "Ask the AI Assistant",
      desc: "Go to Dashboard → AI Assistant. Ask study questions, request step-by-step explanations, or get practice exercises tailored to your subject.",
    },
    {
      step: 5,
      icon: ClipboardCheck,
      color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      title: "Take assessments",
      desc: "Open a course, scroll to Module Quizzes, and start a quiz. Answer each question and submit to get instant AI-marked feedback and a score.",
    },
    {
      step: 6,
      icon: TrendingUp,
      color: "bg-accent/20 text-accent",
      title: "Track your progress",
      desc: "Visit Dashboard → Progress to see your learning streak, completed lessons, score history, and a 30-day activity calendar.",
    },
    {
      step: 7,
      icon: Trophy,
      color: "bg-yellow-50 dark:bg-yellow-900/20",
      title: "Earn achievements",
      desc: "Complete 10 lessons, score 90%+ on an assessment, or maintain a 7-day streak to unlock gold achievement badges.",
      iconStyle: { color: "#D4AF37" },
    },
  ],
  instructor: [
    {
      step: 1,
      icon: UserPlus,
      color: "bg-primary/10 text-primary",
      title: "Register as Lecturer or Tutor",
      desc: "Sign up and select Lecturer or Tutor during registration. Your role determines whether you can create departments and courses.",
    },
    {
      step: 2,
      icon: School,
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      title: "Set up a department & course",
      desc: "Lecturers can create departments and courses from the dashboard. Tutors can upload materials to existing courses.",
    },
    {
      step: 3,
      icon: Upload,
      color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      title: "Upload materials",
      desc: "Go to Dashboard → Upload. Choose 'Upload File' for PDFs, Word docs, MP3, WAV, MP4, or WebM (videos up to 2 GB), or 'Create Lesson' to write structured lesson content.",
    },
    {
      step: 4,
      icon: ClipboardCheck,
      color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      title: "Create assessments",
      desc: "From any course page, create module quizzes with 1–50 questions, 2–6 answer options each, and an optional time limit of 1–180 minutes.",
    },
    {
      step: 5,
      icon: MessageSquare,
      color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
      title: "Monitor student activity",
      desc: "Your Instructor Dashboard shows a live feed of student comments on your materials so you can respond and engage quickly.",
    },
    {
      step: 6,
      icon: BarChart3,
      color: "bg-accent/20 text-accent",
      title: "View student performance",
      desc: "Students who consent to data sharing will appear in your monitoring panel with their average scores and lesson completion rates.",
    },
  ],
  admin: [
    {
      step: 1,
      icon: LogIn,
      color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
      title: "Admin login",
      desc: "Admin accounts are pre-assigned. Log in with your designated admin email to access the Admin Panel automatically.",
    },
    {
      step: 2,
      icon: Users,
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      title: "Search & manage users",
      desc: "Go to Dashboard → Users. Search by name or email (partial match), change roles, adjust subscription plans, or suspend accounts.",
    },
    {
      step: 3,
      icon: CreditCard,
      color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      title: "Adjust subscriptions",
      desc: "Select any user and use the Plan dropdown to assign Free, Basic, Standard, Premium, or Elite. Changes apply immediately and notify the user.",
    },
    {
      step: 4,
      icon: BarChart3,
      color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      title: "Generate activity reports",
      desc: "From the Admin Panel, pick a date range and generate a report of new registrations, login activity, and subscription changes. Download as CSV.",
    },
    {
      step: 5,
      icon: Shield,
      color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
      title: "Audit log",
      desc: "Every admin action (role changes, suspensions, plan adjustments) is automatically logged with timestamp and admin ID for accountability.",
    },
  ],
}

// ─── Component ────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">TATAISO</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#how-to-use" className="hover:text-foreground transition-colors">How to Use</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#plans" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#roles" className="hover:text-foreground transition-colors">For Who</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5">
            AI-Powered Educational Platform
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">
            Learn Smarter. Stay Organized. Achieve More.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-pretty">
            Tataiso unifies learning resources, an AI study assistant, interactive assessments,
            progress tracking, and achievements into a single mobile-first platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="text-lg px-8">Start for Free</Button>
            </Link>
            <a href="#how-to-use">
              <Button size="lg" variant="outline" className="text-lg px-8">How It Works</Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── HOW TO USE ────────────────────────────────────────── */}
      <section id="how-to-use" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl font-bold text-foreground mb-4">Get started in minutes</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you are a student, lecturer, or administrator, here is exactly what to do from first login to full productivity.
            </p>
          </div>

          {/* Role tabs — using details/summary for zero-JS accordion */}
          <div className="space-y-4">
            {/* Student guide */}
            <details className="group rounded-2xl border border-border bg-card overflow-hidden" open>
              <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer list-none select-none hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">For Students</h3>
                    <p className="text-sm text-muted-foreground">Learn, practice, track progress, earn achievements</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
              </summary>
              <div className="px-6 pb-6 border-t border-border">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
                  {HOW_TO_STEPS.student.map(({ step, icon: Icon, color, title, desc, iconStyle }) => (
                    <div key={step} className="flex flex-col gap-3 p-4 rounded-xl bg-background border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
                          <Icon className="h-5 w-5" style={iconStyle} />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Step {step}
                        </span>
                      </div>
                      <h4 className="font-semibold text-foreground">{title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <Link href="/sign-up">
                    <Button className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Create student account
                    </Button>
                  </Link>
                </div>
              </div>
            </details>

            {/* Instructor guide */}
            <details className="group rounded-2xl border border-border bg-card overflow-hidden">
              <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer list-none select-none hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <School className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">For Lecturers &amp; Tutors</h3>
                    <p className="text-sm text-muted-foreground">Upload materials, create assessments, monitor students</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
              </summary>
              <div className="px-6 pb-6 border-t border-border">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
                  {HOW_TO_STEPS.instructor.map(({ step, icon: Icon, color, title, desc }) => (
                    <div key={step} className="flex flex-col gap-3 p-4 rounded-xl bg-background border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Step {step}
                        </span>
                      </div>
                      <h4 className="font-semibold text-foreground">{title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <Link href="/sign-up">
                    <Button variant="outline" className="gap-2">
                      <School className="h-4 w-4" />
                      Register as Lecturer / Tutor
                    </Button>
                  </Link>
                </div>
              </div>
            </details>

            {/* Admin guide */}
            <details className="group rounded-2xl border border-border bg-card overflow-hidden">
              <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer list-none select-none hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">For Administrators</h3>
                    <p className="text-sm text-muted-foreground">Manage users, subscriptions, and platform activity</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
              </summary>
              <div className="px-6 pb-6 border-t border-border">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
                  {HOW_TO_STEPS.admin.map(({ step, icon: Icon, color, title, desc }) => (
                    <div key={step} className="flex flex-col gap-3 p-4 rounded-xl bg-background border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Step {step}
                        </span>
                      </div>
                      <h4 className="font-semibold text-foreground">{title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Platform Features</Badge>
            <h2 className="text-3xl font-bold text-foreground mb-4">Everything you need in one place</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Six integrated components that work together to support every step of your academic journey.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, color: "bg-primary/10 text-primary", title: "Content Library", desc: "Lessons, videos, PDFs, and audio — organized by department and course." },
              { icon: Lightbulb, color: "bg-accent/20 text-accent", title: "AI Learning Assistant", desc: "Instant answers, step-by-step explanations, and personalized exercises — 24/7." },
              { icon: ClipboardCheck, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400", title: "Interactive Assessments", desc: "AI-generated and instructor-created quizzes with instant feedback." },
              { icon: TrendingUp, color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400", title: "Progress Tracker", desc: "Learning streak, lesson completions, scores, and 30-day improvement trends." },
              { icon: Trophy, color: "bg-yellow-50 dark:bg-yellow-900/20", title: "Achievement System", desc: "Earn gold badges for completing lessons, acing assessments, and daily streaks.", iconStyle: { color: "#D4AF37" } },
              { icon: Bell, color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", title: "Smart Notifications", desc: "Deadline reminders, achievement alerts, and subscription updates — fully configurable." },
            ].map(({ icon: Icon, color, title, desc, iconStyle }) => (
              <Card key={title} className="bg-card border-border">
                <CardHeader>
                  <div className={`p-3 rounded-xl w-fit mb-3 ${color}`}>
                    <Icon className="h-6 w-6" style={iconStyle} />
                  </div>
                  <CardTitle className="text-foreground">{title}</CardTitle>
                  <CardDescription className="text-base">{desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANS ────────────────────────────────────────────── */}
      <section id="plans" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="outline" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl font-bold text-foreground mb-4">Flexible plans for every student</h2>
          <p className="text-muted-foreground mb-10">Start free for 7 days, then choose the plan that matches your goals.</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {[
              { name: "Free Trial", price: "M0", note: "7 days", highlight: false },
              { name: "Basic", price: "M50", note: "/month", highlight: false },
              { name: "Standard", price: "M80", note: "/month", highlight: false },
              { name: "Premium", price: "M120", note: "/month", highlight: true },
              { name: "Elite", price: "M200", note: "/month", highlight: true },
            ].map(({ name, price, note, highlight }) => (
              <div key={name} className={`rounded-xl border p-4 text-center transition-shadow ${highlight ? "border-primary shadow-md" : "border-border bg-card"}`}>
                {highlight && <Badge className="mb-2 text-xs">Popular</Badge>}
                <p className="text-xl font-bold text-foreground">{price}</p>
                <p className="text-xs text-muted-foreground">{note}</p>
                <p className="text-sm font-medium text-foreground mt-1">{name}</p>
              </div>
            ))}
          </div>
          <Link href="/sign-up">
            <Button size="lg" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Start free — no card required
            </Button>
          </Link>
        </div>
      </section>

      {/* ── ROLES ────────────────────────────────────────────── */}
      <section id="roles" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Built for every role</Badge>
            <h2 className="text-3xl font-bold text-foreground mb-4">Your experience, tailored to you</h2>
            <p className="text-muted-foreground">Students, Instructors, and Administrators each get their own dedicated workspace.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Users, color: "bg-primary/10 text-primary", title: "Students",
                points: ["Personalized dashboard with streak & progress", "AI assistant for questions and exercises", "Achievement badges and milestones", "Configurable notifications per category"],
              },
              {
                icon: School, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400", title: "Lecturers & Tutors",
                points: ["Dedicated instructor dashboard", "Upload PDF, Word, Audio, Video materials", "Create and manage module assessments", "Live student comment feed & monitoring"],
              },
              {
                icon: Star, color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", title: "Administrators",
                points: ["User search, suspension & role management", "Subscription plan adjustments", "Platform activity reports with CSV export", "Full audit log of all admin actions"],
              },
            ].map(({ icon: Icon, color, title, points }) => (
              <Card key={title} className="bg-card border-border">
                <CardHeader>
                  <div className={`p-3 rounded-xl w-fit mb-2 ${color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-foreground">{title}</CardTitle>
                </CardHeader>
                <div className="px-6 pb-6 space-y-2">
                  {points.map((p) => (
                    <div key={p} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{p}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Ready to start learning smarter?</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Create a free account and explore Tataiso for 7 days — no payment required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" variant="secondary" className="text-lg px-8 gap-2">
                <UserPlus className="h-5 w-5" />
                Create Free Account
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="text-lg px-8 gap-2 border-white/30 text-primary-foreground hover:bg-white/10">
                <LogIn className="h-5 w-5" />
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t bg-card">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="font-bold text-foreground">TATAISO</span>
              <span className="text-muted-foreground text-sm">· AI-Powered Educational Platform</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#how-to-use" className="hover:text-foreground transition-colors">How to Use</a>
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#plans" className="hover:text-foreground transition-colors">Pricing</a>
              <Link href="/sign-up" className="hover:text-foreground transition-colors">Get Started</Link>
              <Link href="/sign-in" className="hover:text-foreground transition-colors">Sign In</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
