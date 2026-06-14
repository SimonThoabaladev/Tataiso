export const dynamic = "force-dynamic"
import { getUserBookmarks } from "@/app/actions/materials"
import { BookmarksList } from "@/components/bookmarks-list"

export default async function BookmarksPage() {
  const bookmarks = await getUserBookmarks()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Your Bookmarks</h1>
        <p className="text-muted-foreground mt-1">
          Quick access to your saved materials
        </p>
      </div>
      <BookmarksList bookmarks={bookmarks} />
    </div>
  )
}
