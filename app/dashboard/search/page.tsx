export const dynamic = "force-dynamic"
import { SearchMaterials } from "@/components/search-materials"

export default function SearchPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Search Materials</h1>
        <p className="text-muted-foreground mt-1">
          Find materials across all departments and courses
        </p>
      </div>
      <SearchMaterials />
    </div>
  )
}
