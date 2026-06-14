import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"

// ─────────────────────────────────────────────────────────────
// Better Auth managed tables
// ─────────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  /** admin | lecturer | tutor | student */
  role: text("role").notNull().default("student"),
  /** Account suspension — set by admin */
  suspended: boolean("suspended").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// ─────────────────────────────────────────────────────────────
// Content tables
// ─────────────────────────────────────────────────────────────

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const courses = pgTable(
  "courses",
  {
    id: serial("id").primaryKey(),
    departmentId: integer("departmentId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** Admin-controlled: show at top of course picker */
    popular: boolean("popular").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("courses_code_dept_idx").on(table.code, table.departmentId),
  ]
)

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  courseId: integer("courseId").notNull(),
  uploaderId: text("uploaderId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  fileType: text("fileType").notNull(),
  fileName: text("fileName").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileSize: integer("fileSize").notNull(),
  /** Optional URL for an associated video resource */
  videoUrl: text("videoUrl"),
  /** Subject tag for AI exercise generation */
  subject: text("subject"),
  /** Lesson ordering within a course */
  lessonNumber: integer("lessonNumber"),
  downloadCount: integer("downloadCount").notNull().default(0),
  /** ISO timestamp of last edit */
  lastEditedAt: timestamp("lastEditedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").notNull(),
    materialId: integer("materialId").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bookmarks_user_material_idx").on(table.userId, table.materialId),
  ]
)

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  materialId: integer("materialId").notNull(),
  userId: text("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const downloads = pgTable("downloads", {
  id: serial("id").primaryKey(),
  materialId: integer("materialId").notNull(),
  userId: text("userId").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────

/**
 * Notification categories: Deadlines | Achievements | Subscription | Announcements
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  href: text("href"),
  /** Deadlines | Achievements | Subscription | Announcements */
  category: text("category").notNull().default("Announcements"),
  read: boolean("read").notNull().default(false),
  /** Dismissed notifications are moved to archive */
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  /** Auto-delete after 90 days; set when archived */
  archiveExpiresAt: timestamp("archiveExpiresAt"),
})

/** Per-user notification category preferences */
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").notNull(),
    /** Deadlines | Achievements | Subscription | Announcements */
    category: text("category").notNull(),
    /** false = user has disabled this category */
    enabled: boolean("enabled").notNull().default(true),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notif_pref_user_cat_idx").on(table.userId, table.category),
  ]
)

// ─────────────────────────────────────────────────────────────
// Subscriptions
// ─────────────────────────────────────────────────────────────

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  /** free | basic | standard | premium | elite */
  plan: text("plan").notNull().default("free"),
  /** active | cancelled | expired */
  status: text("status").notNull().default("active"),
  startDate: timestamp("startDate").notNull().defaultNow(),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────
// Assessments / Quizzes
// ─────────────────────────────────────────────────────────────

export const quizzes = pgTable(
  "quizzes",
  {
    id: serial("id").primaryKey(),
    courseId: integer("courseId").notNull(),
    moduleNumber: integer("moduleNumber").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    passingScore: integer("passingScore").notNull().default(80),
    /** Optional time limit in minutes (1-180); null = no limit */
    timeLimitMinutes: integer("timeLimitMinutes"),
    /** Target subscription tier: free | basic | standard | premium | elite */
    targetTier: text("targetTier").notNull().default("free"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("quizzes_course_module_idx").on(table.courseId, table.moduleNumber),
  ]
)

export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quizId").notNull(),
  question: text("question").notNull(),
  /** JSON string array of options (2-6) */
  options: text("options").notNull(),
  /** Index of correct option (0-based) */
  correctAnswer: integer("correctAnswer").notNull(),
  /** Explanation shown after submission */
  explanation: text("explanation"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  quizId: integer("quizId").notNull(),
  score: integer("score").notNull(),
  passed: boolean("passed").notNull().default(false),
  /** JSON array of answer indices submitted */
  answersSnapshot: text("answersSnapshot"),
  completedAt: timestamp("completedAt").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────
// Progress Tracking
// ─────────────────────────────────────────────────────────────

/** Records each lesson completion event */
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").notNull(),
    materialId: integer("materialId").notNull(),
    completedAt: timestamp("completedAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("lesson_progress_user_material_idx").on(table.userId, table.materialId),
  ]
)

/** Daily learning activity log (used for streak calculation) */
export const learningActivity = pgTable(
  "learning_activity",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").notNull(),
    /** Date string YYYY-MM-DD */
    activityDate: text("activityDate").notNull(),
    /** Type: lesson | assessment | ai_session */
    activityType: text("activityType").notNull(),
    referenceId: integer("referenceId"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("learning_activity_user_date_type_idx").on(
      table.userId,
      table.activityDate,
      table.activityType
    ),
  ]
)

/** Student consent for sharing progress data with instructors */
export const progressConsent = pgTable(
  "progress_consent",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").notNull().unique(),
    /** true = student has consented to share data with instructors */
    consented: boolean("consented").notNull().default(false),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  }
)

// ─────────────────────────────────────────────────────────────
// Achievements
// ─────────────────────────────────────────────────────────────

/** Master list of achievement definitions */
export const achievementDefs = pgTable("achievement_defs", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g. 'lessons_10'
  name: text("name").notNull(),
  description: text("description").notNull(),
  unlockCriterion: text("unlockCriterion").notNull(),
  iconName: text("iconName").notNull().default("Trophy"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Achievements earned by a specific student */
export const userAchievements = pgTable(
  "user_achievements",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").notNull(),
    achievementId: integer("achievementId").notNull(),
    earnedAt: timestamp("earnedAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_achievements_user_ach_idx").on(table.userId, table.achievementId),
  ]
)

// ─────────────────────────────────────────────────────────────
// Admin Audit Log
// ─────────────────────────────────────────────────────────────

export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  adminId: text("adminId").notNull(),
  actionType: text("actionType").notNull(), // e.g. 'SUSPEND_USER', 'CHANGE_ROLE', 'ADJUST_SUBSCRIPTION'
  /** Type of entity affected, e.g. 'user' | 'subscription' */
  entityType: text("entityType").notNull(),
  entityId: text("entityId").notNull(),
  /** JSON snapshot of what changed */
  details: text("details"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────
// Student onboarding profile
// ─────────────────────────────────────────────────────────────

/**
 * Stored after the student completes onboarding.
 * One row per student (upsertable).
 */
export const studentProfile = pgTable("student_profile", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull().unique(),
  /** Institutional student number, e.g. "2021/12345" */
  studentNumber: text("studentNumber").notNull(),
  /** Primary enrolled course */
  courseId: integer("courseId").notNull(),
  /** JSON array of module/material IDs the student selected */
  selectedModules: text("selectedModules").notNull().default("[]"),
  /** Whether onboarding has been completed */
  onboardingComplete: boolean("onboardingComplete").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})
