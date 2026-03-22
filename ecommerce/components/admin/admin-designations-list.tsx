"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Plus, Edit, Trash2, Loader2, Shield, AlertCircle, Users, ChevronDown, ChevronUp } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

const PERMISSION_GROUPS: Record<string, { label: string; permissions: { value: string; label: string }[] }> = {
  dashboard: {
    label: "Dashboard",
    permissions: [{ value: "dashboard:view", label: "View Dashboard" }],
  },
  orders: {
    label: "Orders",
    permissions: [
      { value: "orders:view", label: "View Orders" },
      { value: "orders:manage", label: "Manage Orders" },
    ],
  },
  customers: {
    label: "Customers",
    permissions: [
      { value: "customers:view", label: "View Customers" },
      { value: "customers:manage", label: "Manage Customers" },
    ],
  },
  vendors: {
    label: "Vendors",
    permissions: [
      { value: "vendors:view", label: "View Vendors" },
      { value: "vendors:manage", label: "Manage Vendors" },
    ],
  },
  products: {
    label: "Products",
    permissions: [
      { value: "products:view", label: "View Products" },
      { value: "products:manage", label: "Manage Products" },
    ],
  },
  categories: {
    label: "Categories",
    permissions: [
      { value: "categories:view", label: "View Categories" },
      { value: "categories:manage", label: "Manage Categories" },
    ],
  },
  reports: {
    label: "Reports",
    permissions: [{ value: "reports:view", label: "View Reports" }],
  },
  ledger: {
    label: "Ledger",
    permissions: [{ value: "ledger:view", label: "View Ledger" }],
  },
  "learning-resources": {
    label: "Learning Resources",
    permissions: [
      { value: "learning-resources:view", label: "View Resources" },
      { value: "learning-resources:manage", label: "Manage Resources" },
    ],
  },
  "page-content": {
    label: "Page Content",
    permissions: [
      { value: "page-content:view", label: "View Page Content" },
      { value: "page-content:manage", label: "Manage Page Content" },
    ],
  },
  "push-notifications": {
    label: "Push Notifications",
    permissions: [{ value: "push-notifications:manage", label: "Manage Push Notifications" }],
  },
  notifications: {
    label: "Notifications",
    permissions: [{ value: "notifications:view", label: "View Notifications" }],
  },
  support: {
    label: "Support",
    permissions: [
      { value: "support:view", label: "View Support Requests" },
      { value: "support:manage", label: "Manage Support Requests" },
    ],
  },
  settings: {
    label: "Settings",
    permissions: [
      { value: "settings:view", label: "View Settings" },
      { value: "settings:manage", label: "Manage Settings" },
    ],
  },
  designations: {
    label: "Designations",
    permissions: [
      { value: "designations:view", label: "View Designations" },
      { value: "designations:manage", label: "Manage Designations" },
    ],
  },
  employees: {
    label: "Employees",
    permissions: [
      { value: "employees:view", label: "View Employees" },
      { value: "employees:manage", label: "Manage Employees" },
    ],
  },
}

interface Designation {
  _id: string
  name: string
  description: string
  permissions: string[]
  isActive: boolean
  employeeCount: number
  createdAt: string
  updatedAt: string
}

export function AdminDesignationsList() {
  const [designations, setDesignations] = useState<Designation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Designation | null>(null)
  const [formData, setFormData] = useState({ name: "", description: "", permissions: [] as string[] })
  const [saving, setSaving] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Designation | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchDesignations()
  }, [])

  const fetchDesignations = async () => {
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch(`${API_URL}/api/admin/designations?includeInactive=true`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setDesignations(data.data)
      } else {
        setError("Failed to load designations")
      }
    } catch (err) {
      console.error("Error fetching designations:", err)
      setError("Error loading designations. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const filtered = designations.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase())
  )

  const handleOpenDialog = (designation?: Designation) => {
    if (designation) {
      setEditing(designation)
      setFormData({
        name: designation.name,
        description: designation.description,
        permissions: [...designation.permissions],
      })
    } else {
      setEditing(null)
      setFormData({ name: "", description: "", permissions: [] })
    }
    setExpandedGroups({})
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditing(null)
    setFormData({ name: "", description: "", permissions: [] })
  }

  const togglePermission = (perm: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }))
  }

  const toggleGroupAll = (groupKey: string) => {
    const group = PERMISSION_GROUPS[groupKey]
    const allPerms = group.permissions.map((p) => p.value)
    const allSelected = allPerms.every((p) => formData.permissions.includes(p))

    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !allPerms.includes(p))
        : [...new Set([...prev.permissions, ...allPerms])],
    }))
  }

  const selectAll = () => {
    const allPerms = Object.values(PERMISSION_GROUPS).flatMap((g) => g.permissions.map((p) => p.value))
    setFormData((prev) => ({ ...prev, permissions: allPerms }))
  }

  const deselectAll = () => {
    setFormData((prev) => ({ ...prev, permissions: [] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const token = localStorage.getItem("adminToken")
      const url = editing
        ? `${API_URL}/api/admin/designations/${editing._id}`
        : `${API_URL}/api/admin/designations`
      const method = editing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Failed to save designation")
        setSaving(false)
        return
      }

      handleCloseDialog()
      fetchDesignations()
    } catch (err) {
      console.error("Error saving designation:", err)
      setError("Error saving designation. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (designation: Designation) => {
    setToDelete(designation)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    setError("")
    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch(`${API_URL}/api/admin/designations/${toDelete._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.message || "Failed to delete designation")
        setDeleting(false)
        return
      }
      setDeleteDialogOpen(false)
      setToDelete(null)
      fetchDesignations()
    } catch (err) {
      console.error("Error deleting designation:", err)
      setError("Error deleting designation. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Designations</h1>
          <p className="text-muted-foreground mt-1">Manage designations and their permissions</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Designation
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search designations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No designations found</p>
            <Button onClick={() => handleOpenDialog()} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Designation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((designation) => (
            <Card key={designation._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      {designation.name}
                    </CardTitle>
                    {designation.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {designation.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={designation.isActive ? "default" : "secondary"}>
                    {designation.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {designation.employeeCount} employee{designation.employeeCount !== 1 ? "s" : ""}
                  </span>
                  <span>{designation.permissions.length} permission{designation.permissions.length !== 1 ? "s" : ""}</span>
                </div>

                {designation.permissions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {designation.permissions.slice(0, 4).map((p) => (
                      <Badge key={p} variant="outline" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                    {designation.permissions.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{designation.permissions.length - 4} more
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(designation)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(designation)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Designation" : "Add New Designation"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update designation details and permissions."
                : "Create a new designation with specific permissions."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="desig-name">Designation Name *</Label>
                <Input
                  id="desig-name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Sales Manager"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desig-desc">Description</Label>
                <Textarea
                  id="desig-desc"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this designation"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Permissions ({formData.permissions.length} selected)</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg divide-y max-h-[40vh] overflow-y-auto">
                  {Object.entries(PERMISSION_GROUPS).map(([key, group]) => {
                    const allPerms = group.permissions.map((p) => p.value)
                    const allSelected = allPerms.every((p) => formData.permissions.includes(p))
                    const someSelected = allPerms.some((p) => formData.permissions.includes(p))
                    const expanded = expandedGroups[key] ?? false

                    return (
                      <div key={key}>
                        <div
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer"
                          onClick={() => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))}
                        >
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                            onChange={(e) => {
                              e.stopPropagation()
                              toggleGroupAll(key)
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="flex-1 text-sm font-medium">{group.label}</span>
                          <span className="text-xs text-muted-foreground mr-2">
                            {allPerms.filter((p) => formData.permissions.includes(p)).length}/{allPerms.length}
                          </span>
                          {expanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        {expanded && (
                          <div className="pl-10 pr-3 pb-2 space-y-1.5">
                            {group.permissions.map((perm) => (
                              <label key={perm.value} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(perm.value)}
                                  onChange={() => togglePermission(perm.value)}
                                  className="h-3.5 w-3.5 rounded border-gray-300"
                                />
                                <span className="text-sm text-muted-foreground">{perm.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>{editing ? "Update" : "Create"} Designation</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Designation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{toDelete?.name}&quot;? This action cannot be undone.
              {toDelete && toDelete.employeeCount > 0 && (
                <span className="block mt-2 text-destructive">
                  This designation has {toDelete.employeeCount} active employee(s). Reassign them before deleting.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setToDelete(null)
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
