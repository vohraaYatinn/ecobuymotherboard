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
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Plus, Edit, Trash2, Loader2, UserCog, AlertCircle, Eye, EyeOff, Shield, Mail, Phone } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

interface Designation {
  _id: string
  name: string
  permissions: string[]
  isActive: boolean
}

interface Employee {
  _id: string
  name: string
  email: string
  phone: string
  designation: Designation
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function AdminEmployeesList() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filterDesignation, setFilterDesignation] = useState("")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    designation: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchDesignations()
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [page, filterDesignation])

  const fetchDesignations = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch(`${API_URL}/api/admin/designations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setDesignations(data.data)
      }
    } catch (err) {
      console.error("Error fetching designations:", err)
    }
  }

  const fetchEmployees = async () => {
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("adminToken")
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        includeInactive: "true",
      })
      if (filterDesignation) params.append("designation", filterDesignation)
      if (search) params.append("search", search)

      const response = await fetch(`${API_URL}/api/admin/employees?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setEmployees(data.data)
        setTotalPages(data.pagination.pages)
        setTotal(data.pagination.total)
      } else {
        setError("Failed to load employees")
      }
    } catch (err) {
      console.error("Error fetching employees:", err)
      setError("Error loading employees. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchEmployees()
  }

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditing(employee)
      setFormData({
        name: employee.name,
        email: employee.email,
        password: "",
        phone: employee.phone,
        designation: employee.designation._id,
      })
    } else {
      setEditing(null)
      setFormData({ name: "", email: "", password: "", phone: "", designation: "" })
    }
    setShowPassword(false)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditing(null)
    setFormData({ name: "", email: "", password: "", phone: "", designation: "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const token = localStorage.getItem("adminToken")
      const url = editing
        ? `${API_URL}/api/admin/employees/${editing._id}`
        : `${API_URL}/api/admin/employees`
      const method = editing ? "PUT" : "POST"

      const body: Record<string, string> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        designation: formData.designation,
      }
      if (formData.password) body.password = formData.password

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Failed to save employee")
        setSaving(false)
        return
      }

      handleCloseDialog()
      fetchEmployees()
    } catch (err) {
      console.error("Error saving employee:", err)
      setError("Error saving employee. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (employee: Employee) => {
    setToDelete(employee)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    setError("")
    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch(`${API_URL}/api/admin/employees/${toDelete._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.message || "Failed to delete employee")
        setDeleting(false)
        return
      }
      setDeleteDialogOpen(false)
      setToDelete(null)
      fetchEmployees()
    } catch (err) {
      console.error("Error deleting employee:", err)
      setError("Error deleting employee. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (employee: Employee) => {
    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch(`${API_URL}/api/admin/employees/${employee._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !employee.isActive }),
      })
      const data = await response.json()
      if (response.ok) {
        fetchEmployees()
      } else {
        setError(data.message || "Failed to update employee status")
      }
    } catch (err) {
      console.error("Error toggling employee status:", err)
      setError("Error updating employee status.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground mt-1">
            Manage employees and assign designations ({total} total)
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Employee
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterDesignation} onValueChange={(v) => { setFilterDesignation(v === "all" ? "" : v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Designations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                {designations.map((d) => (
                  <SelectItem key={d._id} value={d._id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} variant="outline">
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No employees found</p>
            <Button onClick={() => handleOpenDialog()} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Employee
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp._id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-sm">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            {emp.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          {emp.phone ? (
                            <span className="flex items-center gap-1.5 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {emp.phone}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Shield className="h-3 w-3" />
                            {emp.designation?.name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={emp.isActive ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleActive(emp)}
                          >
                            {emp.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setViewEmployee(emp)
                                setViewDialogOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(emp)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(emp)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* View Employee Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {viewEmployee && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Name</p>
                  <p className="font-medium">{viewEmployee.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant={viewEmployee.isActive ? "default" : "secondary"}>
                    {viewEmployee.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="text-sm">{viewEmployee.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Phone</p>
                  <p className="text-sm">{viewEmployee.phone || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Designation</p>
                  <Badge variant="outline" className="gap-1">
                    <Shield className="h-3 w-3" />
                    {viewEmployee.designation?.name || "N/A"}
                  </Badge>
                </div>
              </div>
              {viewEmployee.designation?.permissions && viewEmployee.designation.permissions.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Permissions</p>
                  <div className="flex flex-wrap gap-1">
                    {viewEmployee.designation.permissions.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <p>Created</p>
                  <p>{new Date(viewEmployee.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p>Last Updated</p>
                  <p>{new Date(viewEmployee.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Employee" : "Add New Employee"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update employee information and designation."
                : "Create a new employee account with a designation."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="emp-name">Full Name *</Label>
                <Input
                  id="emp-name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-email">Email *</Label>
                <Input
                  id="emp-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-password">
                  Password {editing ? "(leave blank to keep current)" : "*"}
                </Label>
                <div className="relative">
                  <Input
                    id="emp-password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder={editing ? "Leave blank to keep current" : "Min 6 characters"}
                    required={!editing}
                    minLength={formData.password ? 6 : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-phone">Phone</Label>
                <Input
                  id="emp-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Designation *</Label>
                <Select
                  value={formData.designation}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, designation: v }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.designation && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      Permissions for this designation:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {designations
                        .find((d) => d._id === formData.designation)
                        ?.permissions.map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {p}
                          </Badge>
                        )) || (
                        <span className="text-xs text-muted-foreground">No permissions assigned</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !formData.designation}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>{editing ? "Update" : "Create"} Employee</>
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
            <DialogTitle>Deactivate Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate &quot;{toDelete?.name}&quot;? They will no longer be able to log in.
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
                  Deactivating...
                </>
              ) : (
                "Deactivate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
