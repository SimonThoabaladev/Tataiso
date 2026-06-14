import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

// Only these emails can be administrators
const ADMIN_EMAILS = [
  'zandilemalefane01@gmail.com',
  'sellosthoabala@gmail.com',
]

const authConfig = {
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL ?? 'http://localhost:3000'),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
  trustedOrigins: [
    'http://localhost:3000',
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
  ],
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'student',
        input: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Auto-assign admin role to designated emails, prevent others from being admin
          const email = user.email?.toLowerCase()
          if (ADMIN_EMAILS.includes(email || '')) {
            return { data: { ...user, role: 'admin' } }
          }
          // Force non-admin emails to be student, tutor, or lecturer only
          if (user.role === 'admin') {
            return { data: { ...user, role: 'student' } }
          }
          return { data: user }
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
}

export const auth = betterAuth(authConfig)
