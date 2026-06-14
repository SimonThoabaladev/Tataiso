// Tataiso subscription plans as per requirements
// Free Trial: 7 days, Basic: M50/mo, Standard: M80/mo, Premium: M120/mo, Elite: M200/mo

export type SubscriptionPlan = "free" | "basic" | "standard" | "premium" | "elite"

export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  free: 0,
  basic: 50,
  standard: 80,
  premium: 120,
  elite: 200,
}

export const PLANS: Record<
  SubscriptionPlan,
  {
    name: string
    price: number
    currency: string
    period: string
    description: string
    features: string[]
    // Access flags
    canDownload: boolean
    canViewMaterials: boolean
    canViewRecordings: boolean
    freeTutorials: number
    fullAccess: boolean
    notesAccess: boolean
    // Lesson / assessment limits
    maxLessons: number | null       // null = unlimited
    maxAssessmentsPerWeek: number | null  // null = unlimited
    // AI tier
    advancedAI: boolean
    personalizedLearningPath: boolean
    priorityAI: boolean
    // Analytics
    detailedAnalytics: boolean
    // Extra
    instructorFeedback: boolean
    tutorSessions: boolean
    exclusiveResources: boolean
    videoResources: boolean
  }
> = {
  free: {
    name: "Free Trial",
    price: 0,
    currency: "M",
    period: "7-day trial",
    description:
      "Try Tataiso free for 7 days with access to 10 lessons, AI Assistant, and up to 2 assessment attempts.",
    features: [
      "Access to 10 lessons",
      "AI Assistant access",
      "Up to 2 assessment attempts per 7-day period",
      "Progress Tracker access",
    ],
    canDownload: false,
    canViewMaterials: true,
    canViewRecordings: false,
    freeTutorials: 10,
    fullAccess: false,
    notesAccess: true,
    maxLessons: 10,
    maxAssessmentsPerWeek: 2,
    advancedAI: false,
    personalizedLearningPath: false,
    priorityAI: false,
    detailedAnalytics: false,
    instructorFeedback: false,
    tutorSessions: false,
    exclusiveResources: false,
    videoResources: false,
  },
  basic: {
    name: "Basic",
    price: 50,
    currency: "M",
    period: "/month",
    description: "Full Content Library access, AI Assistant, unlimited assessments, and Progress Tracker.",
    features: [
      "Full Content Library access",
      "AI Assistant access",
      "Unlimited assessments",
      "Progress Tracker access",
      "Download materials",
    ],
    canDownload: true,
    canViewMaterials: true,
    canViewRecordings: true,
    freeTutorials: 9999,
    fullAccess: true,
    notesAccess: true,
    maxLessons: null,
    maxAssessmentsPerWeek: null,
    advancedAI: false,
    personalizedLearningPath: false,
    priorityAI: false,
    detailedAnalytics: false,
    instructorFeedback: false,
    tutorSessions: false,
    exclusiveResources: false,
    videoResources: false,
  },
  standard: {
    name: "Standard",
    price: 80,
    currency: "M",
    period: "/month",
    description:
      "All Basic features plus advanced AI responses, video resources, and detailed analytics.",
    features: [
      "Everything in Basic",
      "Advanced AI Assistant responses",
      "Video resources",
      "Detailed analytics & subject breakdowns",
      "Time-on-task data",
    ],
    canDownload: true,
    canViewMaterials: true,
    canViewRecordings: true,
    freeTutorials: 9999,
    fullAccess: true,
    notesAccess: true,
    maxLessons: null,
    maxAssessmentsPerWeek: null,
    advancedAI: true,
    personalizedLearningPath: false,
    priorityAI: false,
    detailedAnalytics: true,
    instructorFeedback: false,
    tutorSessions: false,
    exclusiveResources: false,
    videoResources: true,
  },
  premium: {
    name: "Premium",
    price: 120,
    currency: "M",
    period: "/month",
    description:
      "All Standard features plus personalized learning paths, priority AI, and Instructor feedback.",
    features: [
      "Everything in Standard",
      "Personalized learning paths",
      "Priority AI Assistant responses",
      "Instructor feedback",
      "Advanced analytics",
    ],
    canDownload: true,
    canViewMaterials: true,
    canViewRecordings: true,
    freeTutorials: 9999,
    fullAccess: true,
    notesAccess: true,
    maxLessons: null,
    maxAssessmentsPerWeek: null,
    advancedAI: true,
    personalizedLearningPath: true,
    priorityAI: true,
    detailedAnalytics: true,
    instructorFeedback: true,
    tutorSessions: false,
    exclusiveResources: false,
    videoResources: true,
  },
  elite: {
    name: "Elite",
    price: 200,
    currency: "M",
    period: "/month",
    description:
      "All Premium features plus 1-on-1 tutor sessions, advanced analytics, and exclusive resources.",
    features: [
      "Everything in Premium",
      "1-on-1 tutor sessions",
      "Advanced analytics",
      "Exclusive resources",
      "Priority everything",
    ],
    canDownload: true,
    canViewMaterials: true,
    canViewRecordings: true,
    freeTutorials: 9999,
    fullAccess: true,
    notesAccess: true,
    maxLessons: null,
    maxAssessmentsPerWeek: null,
    advancedAI: true,
    personalizedLearningPath: true,
    priorityAI: true,
    detailedAnalytics: true,
    instructorFeedback: true,
    tutorSessions: true,
    exclusiveResources: true,
    videoResources: true,
  },
}
