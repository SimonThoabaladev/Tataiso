"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, BookOpen, GraduationCap, Flame, Star, Sparkles, Lock } from "lucide-react"

interface AchievementDef {
  id: number
  key: string
  name: string
  description: string
  unlockCriterion: string
  iconName: string
}

interface UserAchievement {
  achievementId: number
  earnedAt: Date
  name: string
  unlockCriterion: string
  iconName: string
}

interface AchievementsGalleryProps {
  allDefs: AchievementDef[]
  userAchievements: UserAchievement[]
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  BookOpen,
  GraduationCap,
  Flame,
  Star,
  Sparkles,
}

function AchievementIcon({
  iconName,
  className,
}: {
  iconName: string
  className?: string
}) {
  const Icon = ICON_MAP[iconName] ?? Trophy
  return <Icon className={className} />
}

export function AchievementsGallery({
  allDefs,
  userAchievements,
}: AchievementsGalleryProps) {
  const earnedIds = new Set(userAchievements.map((a) => a.achievementId))
  const earnedMap = new Map(
    userAchievements.map((a) => [a.achievementId, a])
  )

  if (allDefs.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          No achievements defined yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {allDefs.map((def) => {
        const earned = earnedIds.has(def.id)
        const earnedData = earnedMap.get(def.id)

        return (
          <Card
            key={def.id}
            className={`border-border relative transition-all ${
              earned ? "shadow-sm" : "opacity-60"
            }`}
          >
            {/* Gold badge indicator for earned — Req 8.4 */}
            {earned && (
              <div
                className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: "#D4AF3720", color: "#D4AF37", border: "1px solid #D4AF37" }}
              >
                Earned
              </div>
            )}

            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="p-3 rounded-full"
                  style={
                    earned
                      ? { background: "#D4AF3720", color: "#D4AF37" }
                      : { background: "var(--muted)", color: "var(--muted-foreground)" }
                  }
                >
                  {earned ? (
                    <AchievementIcon iconName={def.iconName} className="h-5 w-5" />
                  ) : (
                    <Lock className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base">{def.name}</CardTitle>
                  {/* Req 8.5 — unlock criterion always shown */}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {def.unlockCriterion}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <p className="text-sm text-foreground">{def.description}</p>
              {earned && earnedData && (
                <p className="text-xs text-muted-foreground mt-2">
                  Earned {new Date(earnedData.earnedAt).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
