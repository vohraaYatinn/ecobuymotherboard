"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { FileText, Loader2, Edit, RotateCcw, Plus, Trash2, GripVertical, Eye, Save, ArrowUp, ArrowDown } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.34:5000"

interface Section {
  heading: string
  content: string
  order: number
  _id?: string
}

interface PageContent {
  _id?: string
  slug: string
  title: string
  description?: string
  sections: Section[]
  isActive: boolean
  isDefault?: boolean
  updatedAt?: string
  lastUpdatedBy?: {
    name?: string
    email?: string
  }
}

const PAGE_LABELS: Record<string, { title: string; icon: string }> = {
  "terms-and-conditions": { title: "Terms and Conditions", icon: "📜" },
  "shipping-policy": { title: "Shipping Policy", icon: "🚚" },
  "privacy-policy": { title: "Privacy Policy", icon: "🔒" },
  "return-policy": { title: "Return Policy", icon: "↩️" },
}

export function AdminPageContent() {
  const router = useRouter()
  const [pages, setPages] = useState<PageContent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [selectedPage, setSelectedPage] = useState<PageContent | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [pageToReset, setPageToReset] = useState<PageContent | null>(null)

  const [formData, setFormData] = useState<{
    title: string
    description: string
    sections: Section[]
    isActive: boolean
  }>({
    title: "",
    description: "",
    sections: [],
    isActive: true,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem("adminToken")
    if (!token) {
      router.push("/admin-login")
      return
    }
    fetchPages()
  }

  const fetchPages = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin-login")
        return
      }

      const response = await fetch(`${API_URL}/api/page-content/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setPages(data.data || [])
      } else {
        setError(data.message || "Failed to load pages")
      }
    } catch (err) {
      console.error("Error fetching pages:", err)
      setError("Failed to load pages. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (page: PageContent) => {
    setSelectedPage(page)
    setFormData({
      title: page.title,
      description: page.description || "",
      sections: page.sections.map((s, i) => ({
        ...s,
        order: s.order || i + 1,
      })),
      isActive: page.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!selectedPage) return

    try {
      setSaving(true)
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin-login")
        return
      }

      const response = await fetch(
        `${API_URL}/api/page-content/${selectedPage.slug}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            sections: formData.sections,
            isActive: formData.isActive,
          }),
        }
      )

      const data = await response.json()

      if (data.success) {
        alert("Page content updated successfully!")
        setIsEditDialogOpen(false)
        setSelectedPage(null)
        fetchPages()
      } else {
        alert(data.message || "Failed to update page content")
      }
    } catch (err) {
      console.error("Error updating page content:", err)
      alert("Error updating page content. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!pageToReset) return

    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin-login")
        return
      }

      const response = await fetch(
        `${API_URL}/api/page-content/${pageToReset.slug}/reset`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (data.success) {
        alert("Page reset to default content!")
        setIsResetDialogOpen(false)
        setPageToReset(null)
        fetchPages()
      } else {
        alert(data.message || "Failed to reset page")
      }
    } catch (err) {
      console.error("Error resetting page:", err)
      alert("Error resetting page. Please try again.")
    }
  }

  const addSection = () => {
    setFormData({
      ...formData,
      sections: [
        ...formData.sections,
        {
          heading: "",
          content: "",
          order: formData.sections.length + 1,
        },
      ],
    })
  }

  const removeSection = (index: number) => {
    const newSections = formData.sections.filter((_, i) => i !== index)
    // Reorder remaining sections
    const reorderedSections = newSections.map((s, i) => ({
      ...s,
      order: i + 1,
    }))
    setFormData({ ...formData, sections: reorderedSections })
  }

  const updateSection = (index: number, field: "heading" | "content", value: string) => {
    const newSections = [...formData.sections]
    newSections[index] = { ...newSections[index], [field]: value }
    setFormData({ ...formData, sections: newSections })
  }

  const moveSection = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === formData.sections.length - 1)
    ) {
      return
    }

    const newSections = [...formData.sections]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    ;[newSections[index], newSections[targetIndex]] = [
      newSections[targetIndex],
      newSections[index],
    ]

    // Update order values
    const reorderedSections = newSections.map((s, i) => ({
      ...s,
      order: i + 1,
    }))

    setFormData({ ...formData, sections: reorderedSections })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const previewPage = (slug: string) => {
    const routeMap: Record<string, string> = {
      "terms-and-conditions": "/terms",
      "shipping-policy": "/shipping-policy",
      "privacy-policy": "/privacy-policy",
      "return-policy": "/return-policy",
    }
    window.open(routeMap[slug] || "/terms", "_blank")
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Page Content</h1>
        <p className="text-muted-foreground mt-1">
          Manage content for Terms & Conditions, Shipping, Privacy, and Return policies
        </p>
      </div>

      {error && (
        <Card className="border-destructive mb-6">
          <CardContent className="p-4">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pages.map((page) => {
            const pageInfo = PAGE_LABELS[page.slug] || { title: page.title, icon: "📄" }
            return (
              <Card key={page.slug} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pageInfo.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{pageInfo.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {page.sections.length} section{page.sections.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {page.isDefault ? (
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                          Default
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Customized
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          page.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {page.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {page.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {page.description}
                      </p>
                    )}

                    <div className="text-xs text-muted-foreground">
                      {page.isDefault ? (
                        <span>Using default content</span>
                      ) : (
                        <span>
                          Last updated: {formatDate(page.updatedAt)}
                          {page.lastUpdatedBy?.email && (
                            <> by {page.lastUpdatedBy.email}</>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => previewPage(page.slug)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleEdit(page)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      {!page.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPageToReset(page)
                            setIsResetDialogOpen(true)
                          }}
                          title="Reset to default"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">
                {selectedPage && PAGE_LABELS[selectedPage.slug]?.icon}
              </span>
              Edit {selectedPage && PAGE_LABELS[selectedPage.slug]?.title}
            </DialogTitle>
            <DialogDescription>
              Update the content for this page. Changes will be visible to customers immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Page Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Page Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter page title"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this page (optional)"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  When disabled, visitors will see a "Page not found" message
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            {/* Sections */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Content Sections</Label>
                <Button variant="outline" size="sm" onClick={addSection}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>

              {formData.sections.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No sections yet</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={addSection}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Section
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {formData.sections.map((section, index) => (
                    <Card key={index} className="relative">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col gap-1 mt-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={index === 0}
                              onClick={() => moveSection(index, "up")}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <div className="flex items-center justify-center h-6 w-6 text-muted-foreground">
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={index === formData.sections.length - 1}
                              onClick={() => moveSection(index, "down")}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                                Section {index + 1}
                              </span>
                              <div className="flex-1" />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeSection(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <Input
                              value={section.heading}
                              onChange={(e) => updateSection(index, "heading", e.target.value)}
                              placeholder="Section heading (e.g., '1. Introduction')"
                              className="font-medium"
                            />

                            <Textarea
                              value={section.content}
                              onChange={(e) => updateSection(index, "content", e.target.value)}
                              placeholder="Section content..."
                              rows={4}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setSelectedPage(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Default Content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all your custom content for{" "}
              <strong>{pageToReset && PAGE_LABELS[pageToReset.slug]?.title}</strong> and restore
              the original default content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPageToReset(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive hover:bg-destructive/90">
              Reset to Default
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}









