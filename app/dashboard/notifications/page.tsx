export const dynamic = "force-dynamic"
import { getUserNotifications, getNotificationArchive, getNotificationPreferences } from "@/app/actions/notifications"
import { NotificationsPanel } from "@/components/notifications-panel"

export default async function NotificationsPage() {
  const [notifications, archive, preferences] = await Promise.all([
    getUserNotifications(),
    getNotificationArchive(),
    getNotificationPreferences(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Important alerts and updates for your Tataiso account.
        </p>
      </div>
      <NotificationsPanel
        notifications={notifications}
        archive={archive}
        preferences={preferences}
      />
    </div>
  )
}
