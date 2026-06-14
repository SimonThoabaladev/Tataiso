"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Archive, Settings, X, Check } from "lucide-react"
import {
  dismissNotification,
  markNotificationRead,
  setNotificationPreference,
  type NotificationCategory,
} from "@/app/actions/notifications"

interface Notification {
  id: number
  title: string
  message: string
  href: string | null
  category: string
  read: boolean
  archived: boolean
  createdAt: Date
}

interface Preference {
  category: NotificationCategory
  enabled: boolean
}

interface NotificationsPanelProps {
  notifications: Notification[]
  archive: Notification[]
  preferences: Preference[]
}

const CATEGORY_COLORS: Record<string, string> = {
  Deadlines: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Achievements: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Subscription: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Announcements: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
}

function NotificationCard({
  notification,
  onDismiss,
  onMarkRead,
}: {
  notification: Notification
  onDismiss: (id: number) => void
  onMarkRead: (id: number) => void
}) {
  return (
    <Card
      className={`border-border transition-opacity ${notification.archived ? "opacity-60" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base text-foreground">{notification.title}</CardTitle>
              {!notification.read && (
                <Badge variant="default" className="text-xs">New</Badge>
              )}
              <Badge
                variant="outline"
                className={`text-xs ${CATEGORY_COLORS[notification.category] ?? ""}`}
              >
                {notification.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(notification.createdAt).toLocaleString()}
            </p>
          </div>
          {!notification.archived && (
            <div className="flex items-center gap-1 shrink-0">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Mark as read"
                  onClick={() => onMarkRead(notification.id)}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Dismiss"
                onClick={() => onDismiss(notification.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-sm text-foreground pb-4">{notification.message}</CardContent>
    </Card>
  )
}

export function NotificationsPanel({
  notifications: initialNotifications,
  archive: initialArchive,
  preferences: initialPreferences,
}: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [archive, setArchive] = useState(initialArchive)
  const [prefs, setPrefs] = useState(initialPreferences)
  const [isPending, startTransition] = useTransition()

  const handleDismiss = (id: number) => {
    startTransition(async () => {
      await dismissNotification(id)
      const item = notifications.find((n) => n.id === id)
      if (item) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        setArchive((prev) => [{ ...item, archived: true, read: true }, ...prev])
      }
    })
  }

  const handleMarkRead = (id: number) => {
    startTransition(async () => {
      await markNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    })
  }

  const handleTogglePref = (category: NotificationCategory, enabled: boolean) => {
    startTransition(async () => {
      await setNotificationPreference(category, enabled)
      setPrefs((prev) =>
        prev.map((p) => (p.category === category ? { ...p, enabled } : p))
      )
    })
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <Tabs defaultValue="active">
      <TabsList className="mb-6">
        <TabsTrigger value="active" className="gap-2">
          <Bell className="h-4 w-4" />
          Active
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-1 text-xs">
              {unreadCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="archive" className="gap-2">
          <Archive className="h-4 w-4" />
          Archive
          <span className="text-muted-foreground text-xs ml-1">
            ({archive.length})
          </span>
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-2">
          <Settings className="h-4 w-4" />
          Preferences
        </TabsTrigger>
      </TabsList>

      {/* Active notifications */}
      <TabsContent value="active" className="space-y-4">
        {notifications.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              No active notifications. Dismiss notifications to move them to the archive.
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onDismiss={handleDismiss}
              onMarkRead={handleMarkRead}
            />
          ))
        )}
      </TabsContent>

      {/* Archive — Req 9.3 */}
      <TabsContent value="archive" className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Archived notifications are retained for 90 days.
        </p>
        {archive.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              No archived notifications yet.
            </CardContent>
          </Card>
        ) : (
          archive.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onDismiss={() => {}}
              onMarkRead={() => {}}
            />
          ))
        )}
      </TabsContent>

      {/* Preferences — Req 9.4 */}
      <TabsContent value="settings">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Notification Categories</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose which types of notifications you receive.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {prefs.map((pref) => (
              <div key={pref.category} className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">{pref.category}</Label>
                  <p className="text-sm text-muted-foreground">
                    {pref.category === "Deadlines" &&
                      "Reminders for upcoming lesson and assessment deadlines"}
                    {pref.category === "Achievements" &&
                      "Notifications when you earn a new achievement badge"}
                    {pref.category === "Subscription" &&
                      "Updates about your plan, renewals, and billing"}
                    {pref.category === "Announcements" &&
                      "Platform news and general announcements"}
                  </p>
                </div>
                <Switch
                  checked={pref.enabled}
                  onCheckedChange={(checked) =>
                    handleTogglePref(pref.category as NotificationCategory, checked)
                  }
                  disabled={isPending}
                  aria-label={`Toggle ${pref.category} notifications`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
