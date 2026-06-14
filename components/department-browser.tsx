"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Building2, BookOpen, ChevronRight, Plus, Loader2 } from "lucide-react"
import { createDepartment, createCourse } from "@/app/actions/materials"

interface Course {
  id: number
  departmentId: number
  code: string
  name: string
  description: string | null
  createdAt: Date
}

interface Department {
  id: number
  name: string
  description: string | null
  createdAt: Date
  courses: Course[]
}

interface DepartmentBrowserProps {
  departments: Department[]
  userRole: string
}

export function DepartmentBrowser({ departments, userRole }: DepartmentBrowserProps) {
  const [expandedDept, setExpandedDept] = useState<number | null>(null)
  const canManageDepts = userRole === "admin" || userRole === "lecturer"
  
  // Department creation state
  const [deptDialogOpen, setDeptDialogOpen] = useState(false)
  const [deptName, setDeptName] = useState("")
  const [deptDesc, setDeptDesc] = useState("")
  const [deptLoading, setDeptLoading] = useState(false)
  
  // Course creation state
  const [courseDialogOpen, setCourseDialogOpen] = useState(false)
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null)
  const [courseCode, setCourseCode] = useState("")
  const [courseName, setCourseName] = useState("")
  const [courseDesc, setCourseDesc] = useState("")
  const [courseLoading, setCourseLoading] = useState(false)

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeptLoading(true)
    try {
      await createDepartment(deptName, deptDesc || undefined)
      setDeptDialogOpen(false)
      setDeptName("")
      setDeptDesc("")
    } catch (error) {
      console.error("Failed to create department:", error)
    }
    setDeptLoading(false)
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDeptId) return
    setCourseLoading(true)
    try {
      await createCourse({
        departmentId: selectedDeptId,
        code: courseCode,
        name: courseName,
        description: courseDesc || undefined,
      })
      setCourseDialogOpen(false)
      setCourseCode("")
      setCourseName("")
      setCourseDesc("")
      setSelectedDeptId(null)
    } catch (error) {
      console.error("Failed to create course:", error)
    }
    setCourseLoading(false)
  }

  const openCourseDialog = (deptId: number) => {
    setSelectedDeptId(deptId)
    setCourseDialogOpen(true)
  }

  if (departments.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Departments Yet</h3>
          <p className="text-muted-foreground mb-4">
            {canManageDepts ? "Start by creating your first department." : "No departments have been created yet."}
          </p>
          {canManageDepts && (
            <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Department
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Department</DialogTitle>
                  <DialogDescription>Add a new department to organize courses.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateDepartment} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dept-name">Department Name</Label>
                    <Input
                      id="dept-name"
                      placeholder="e.g., Computer Science"
                      value={deptName}
                      onChange={(e) => setDeptName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dept-desc">Description (optional)</Label>
                    <Textarea
                      id="dept-desc"
                      placeholder="Brief description of the department"
                      value={deptDesc}
                      onChange={(e) => setDeptDesc(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={deptLoading}>
                    {deptLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Department
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {canManageDepts && (
        <div className="flex justify-end">
          <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Department</DialogTitle>
                <DialogDescription>Add a new department to organize courses.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateDepartment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dept-name">Department Name</Label>
                  <Input
                    id="dept-name"
                    placeholder="e.g., Computer Science"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dept-desc">Description (optional)</Label>
                  <Textarea
                    id="dept-desc"
                    placeholder="Brief description of the department"
                    value={deptDesc}
                    onChange={(e) => setDeptDesc(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={deptLoading}>
                  {deptLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Department
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {departments.map((dept) => (
        <Card key={dept.id} className="bg-card border-border overflow-hidden">
          <CardHeader
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">{dept.name}</CardTitle>
                  {dept.description && (
                    <CardDescription className="mt-1">{dept.description}</CardDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{dept.courses.length} courses</Badge>
                <ChevronRight
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
                    expandedDept === dept.id ? "rotate-90" : ""
                  }`}
                />
              </div>
            </div>
          </CardHeader>

          {expandedDept === dept.id && (
            <CardContent className="pt-0 border-t">
              {dept.courses.length === 0 ? (
                <div className="py-8 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No courses in this department yet.</p>
                  {canManageDepts && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => openCourseDialog(dept.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Course
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pt-4">
                  {dept.courses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/dashboard/course/${course.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium text-foreground">
                            {course.code} - {course.name}
                          </div>
                          {course.description && (
                            <div className="text-sm text-muted-foreground">{course.description}</div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                  {canManageDepts && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => openCourseDialog(dept.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Course
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}

      {/* Course Creation Dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Course</DialogTitle>
            <DialogDescription>Add a new course to this department.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course-code">Course Code</Label>
              <Input
                id="course-code"
                placeholder="e.g., CS101"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-name">Course Name</Label>
              <Input
                id="course-name"
                placeholder="e.g., Introduction to Programming"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-desc">Description (optional)</Label>
              <Textarea
                id="course-desc"
                placeholder="Brief description of the course"
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={courseLoading}>
              {courseLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Course
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
