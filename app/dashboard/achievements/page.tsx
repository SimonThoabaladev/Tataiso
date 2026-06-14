export const dynamic = "force-dynamic"
import { getUserAchievements, getAllAchievementDefs } from "@/app/actions/achievements"
import { AchievementsGallery } from "@/components/achievements-gallery"

export default async function AchievementsPage() {
  const [userAchievements, allDefs] = await Promise.all([
    getUserAchievements(),
    getAllAchievementDefs(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Achievements</h1>
        <p className="text-muted-foreground mt-1">
          Badges and milestones you have earned on your learning journey.
        </p>
      </div>
      <AchievementsGallery allDefs={allDefs} userAchievements={userAchievements} />
    </div>
  )
}
