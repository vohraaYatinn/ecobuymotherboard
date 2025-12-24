"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Search, Eye, Plus, Store, MapPin, Loader2, Smartphone, Download, Percent, Trash2 } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.34:5000"

interface PushToken {
  token: string
  platform: string
  deviceModel: string
  appVersion: string
  lastSeenAt: string
  createdAt: string
}

interface Vendor {
  _id: string
  name: string
  email: string
  phone: string
  username: string
  status: string
  commission?: number
  gstNumber?: string
  pan?: string
  bankAccountNumber?: string
  ifscCode?: string
  tan?: string
  referralCode?: string
  documents?: VendorDocument[]
  address: {
    city: string
    state: string
    country: string
  }
  totalProducts: number
  createdAt: string
  pushTokens?: PushToken[]
}

interface VendorDocument {
  url: string
  originalName?: string
}

const getStatusColor = (status: string) => {
  const statusMap: Record<string, string> = {
    approved: "bg-green-100 text-green-800",
    pending: "bg-orange-100 text-orange-800",
    rejected: "bg-red-100 text-red-800",
    suspended: "bg-gray-100 text-gray-800",
  }
  return statusMap[status] || "bg-gray-100 text-gray-800"
}

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    approved: "Approved",
    pending: "Pending",
    rejected: "Rejected",
    suspended: "Suspended",
  }
  return statusMap[status] || status
}

export function AdminVendorsList() {
  const { toast } = useToast()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [isCommissionDialogOpen, setIsCommissionDialogOpen] = useState(false)
  const [commissionValue, setCommissionValue] = useState("")
  const [updatingCommission, setUpdatingCommission] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true)
      setError("")
      try {
        const params = new URLSearchParams()
        if (search) params.append("search", search)
        if (statusFilter && statusFilter !== "all") params.append("status", statusFilter)
        params.append("limit", "50")

        const response = await fetch(`${API_URL}/api/vendors?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setVendors(data.data)
        } else {
          setError("Failed to load vendors")
        }
      } catch (err) {
        console.error("Error fetching vendors:", err)
        setError("Error loading vendors. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchVendors()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [search, statusFilter])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleSelectVendor = (vendorId: string) => {
    if (selectedVendors.includes(vendorId)) {
      setSelectedVendors(selectedVendors.filter((id) => id !== vendorId))
    } else {
      setSelectedVendors([...selectedVendors, vendorId])
    }
  }

  const handleSelectAll = () => {
    if (selectedVendors.length === vendors.length) {
      setSelectedVendors([])
    } else {
      setSelectedVendors(vendors.map((v) => v._id))
    }
  }

  const handleOpenCommissionDialog = () => {
    setIsCommissionDialogOpen(true)
  }

  const handleOpenDeleteDialog = () => {
    if (selectedVendors.length === 0) {
      toast({
        title: "No vendors selected",
        description: "Select at least one vendor to delete.",
        variant: "destructive",
      })
      return
    }
    setIsDeleteDialogOpen(true)
  }

  const handleUpdateCommission = async () => {
    if (!commissionValue || isNaN(parseFloat(commissionValue))) {
      toast({
        title: "Invalid commission",
        description: "Please enter a valid commission percentage (0-100).",
        variant: "destructive",
      })
      return
    }

    const commission = parseFloat(commissionValue)
    if (commission < 0 || commission > 100) {
      toast({
        title: "Invalid commission",
        description: "Commission must be between 0 and 100.",
        variant: "destructive",
      })
      return
    }

    try {
      setUpdatingCommission(true)
      const token = localStorage.getItem("adminToken")
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please log in again.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`${API_URL}/api/vendors/update-commissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          // Apply commission to all vendors currently in the list (respecting filters)
          vendorIds: vendors.map((v) => v._id),
          commission: commission,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Commission updated",
          description: `Commission set to ${commission}% for ${data.data.updatedCount} vendor(s).`,
        })
        setIsCommissionDialogOpen(false)
        setCommissionValue("")
        setSelectedVendors([])
        // Refresh vendors list
        const params = new URLSearchParams()
        if (search) params.append("search", search)
        if (statusFilter && statusFilter !== "all") params.append("status", statusFilter)
        params.append("limit", "50")
        const refreshResponse = await fetch(`${API_URL}/api/vendors?${params.toString()}`)
        const refreshData = await refreshResponse.json()
        if (refreshData.success) {
          setVendors(refreshData.data)
        }
      } else {
        toast({
          title: "Failed to update commission",
          description: data.message || "An error occurred.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error updating commission:", err)
      toast({
        title: "Error",
        description: "Failed to update commission. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdatingCommission(false)
    }
  }

  const handleExportVendors = async () => {
    try {
      setExporting(true)
      const token = localStorage.getItem("adminToken")
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please log in again.",
          variant: "destructive",
        })
        return
      }

      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`${API_URL}/api/vendors/export/csv?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Export failed")
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `vendors-export-${Date.now()}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      toast({
        title: "Export successful",
        description: "Vendor list has been downloaded.",
      })
    } catch (err) {
      console.error("Error exporting vendors:", err)
      toast({
        title: "Export failed",
        description: "Failed to export vendors. Please try again.",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteVendors = async () => {
    if (selectedVendors.length === 0) return

    try {
      setDeleting(true)
      const token = localStorage.getItem("adminToken")
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please log in again.",
          variant: "destructive",
        })
        setDeleting(false)
        return
      }

      const response = await fetch(`${API_URL}/api/vendors/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vendorIds: selectedVendors }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Vendors deleted",
          description: `Removed ${data.data?.deletedCount || selectedVendors.length} vendor(s).`,
        })
        setVendors((prev) => prev.filter((vendor) => !selectedVendors.includes(vendor._id)))
        setSelectedVendors([])
      } else {
        toast({
          title: "Delete failed",
          description: data.message || "Unable to delete vendors.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error deleting vendors:", err)
      toast({
        title: "Error",
        description: "Failed to delete vendors. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Vendors Management</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all vendors</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportVendors}
            disabled={exporting}
            className="gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </Button>
          <Link href="/admin/vendors/add">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Vendor
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by vendor name, email, or phone..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Bulk Actions */}
      {!loading && !error && vendors.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedVendors.length === vendors.length && vendors.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All ({selectedVendors.length} selected)
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleOpenCommissionDialog}
              disabled={vendors.length === 0}
              className="gap-2"
            >
              <Percent className="h-4 w-4" />
              Assign Commission
            </Button>
            <Button
              variant="destructive"
              onClick={handleOpenDeleteDialog}
              disabled={selectedVendors.length === 0}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Vendors Grid */}
      {!loading && !error && (
        <>
          {vendors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No vendors found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {vendors.map((vendor) => (
                <Card key={vendor._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            checked={selectedVendors.includes(vendor._id)}
                            onCheckedChange={() => handleSelectVendor(vendor._id)}
                            className="mt-1"
                          />
                          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                            <Store className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link href={`/admin/vendors/${vendor._id}`}>
                              <h3 className="text-lg font-semibold text-foreground hover:text-primary truncate">
                                {vendor.name}
                              </h3>
                            </Link>
                            <p className="text-sm text-muted-foreground truncate">{vendor.email}</p>
                            <p className="text-sm text-muted-foreground">{vendor.phone}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(vendor.status)}>{getStatusLabel(vendor.status)}</Badge>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Vendor ID</p>
                          <p className="font-medium text-xs">{vendor._id.slice(-8)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">GST</p>
                          <p className="font-medium break-all">{vendor.gstNumber || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">PAN</p>
                          <p className="font-medium break-all">{vendor.pan || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Percent className="h-3 w-3" /> Commission
                          </p>
                          <p className="font-medium">{vendor.commission || 0}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Location
                          </p>
                          <p className="font-medium">
                            {vendor.address.city}, {vendor.address.state}
                          </p>
                        </div>
                        <div className="sm:col-span-5 flex flex-wrap gap-4 pt-2 border-t border-border">
                          <span className="text-muted-foreground text-xs">
                            Docs: {vendor.documents?.length ? vendor.documents.length : 0}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            Bank: {vendor.bankAccountNumber ? `••••${vendor.bankAccountNumber.slice(-4)}` : "—"} /{" "}
                            {vendor.ifscCode || "IFSC N/A"}
                          </span>
                          {vendor.referralCode && (
                            <span className="text-muted-foreground text-xs">Referral: {vendor.referralCode}</span>
                          )}
                        </div>
                      </div>

                      {/* FCM Tokens */}
                      {vendor.pushTokens && vendor.pushTokens.length > 0 && (
                        <div className="border-t border-border pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Smartphone className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold text-foreground">
                              FCM Tokens ({vendor.pushTokens.length})
                            </p>
                          </div>
                          <div className="space-y-2">
                            {vendor.pushTokens.slice(0, 3).map((token, idx) => (
                              <div
                                key={idx}
                                className="bg-muted/50 p-2 rounded border border-border/50 text-xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-mono text-[10px] break-all text-foreground mb-1">
                                      {token.token}
                                    </p>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {token.platform}
                                      </Badge>
                                      <span className="text-[10px]">
                                        {token.deviceModel.length > 20
                                          ? token.deviceModel.substring(0, 20) + "..."
                                          : token.deviceModel}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      Last seen: {new Date(token.lastSeenAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {vendor.pushTokens.length > 3 && (
                              <p className="text-xs text-muted-foreground text-center">
                                +{vendor.pushTokens.length - 3} more token(s)
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {(!vendor.pushTokens || vendor.pushTokens.length === 0) && (
                        <div className="border-t border-border pt-4">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">No FCM tokens registered</p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-between items-center pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">Joined: {formatDate(vendor.createdAt)}</p>
                        <Link href={`/admin/vendors/${vendor._id}`}>
                          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                            <Eye className="h-4 w-4" />
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Commission Assignment Dialog */}
      <Dialog open={isCommissionDialogOpen} onOpenChange={setIsCommissionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Commission</DialogTitle>
            <DialogDescription>
              Set a commission percentage that will apply to all vendors in the current list (after filters). Commission
              must be between 0 and 100.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="commission">Commission Percentage (%)</Label>
              <Input
                id="commission"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Enter commission percentage (0-100)"
                value={commissionValue}
                onChange={(e) => setCommissionValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a value between 0 and 100. This will be applied to all vendors currently visible in the list.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCommissionDialogOpen(false)
                setCommissionValue("")
              }}
              disabled={updatingCommission}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateCommission} disabled={updatingCommission}>
              {updatingCommission ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Commission"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected vendors</DialogTitle>
            <DialogDescription>
              This action will permanently remove {selectedVendors.length} vendor(s). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteVendors}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
