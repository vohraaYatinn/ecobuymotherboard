"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, Eye, Filter, Download, ChevronLeft, ChevronRight, UserPlus, Store, FileDown, Trash2, RotateCcw, CheckCircle, XCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

interface OrderItem {
  productId?: {
    _id: string
    name: string
    brand: string
    sku?: string
  }
  name: string
  brand: string
  quantity: number
  price: number
}

interface ShippingAddress {
  firstName: string
  lastName: string
  phone: string
  address1: string
  city: string
  state: string
  postcode: string
}

interface Customer {
  _id: string
  name?: string
  mobile: string
  email?: string
}

interface Vendor {
  _id: string
  name: string
  email: string
  phone: string
  address?: {
    city: string
    state: string
  }
}

interface ReturnAttachment {
  url: string
  originalName?: string
  mimeType?: string
  size?: number
}

interface ReturnRequest {
  type: "pending" | "accepted" | "denied" | "completed" | null
  reason?: string
  requestedAt?: string
  reviewedAt?: string
  reviewedBy?: string | { _id: string; name: string; email: string }
  adminNotes?: string
  refundStatus?: "pending" | "processing" | "completed" | "failed" | null
  refundTransactionId?: string
  attachments?: ReturnAttachment[]
}

interface Order {
  _id: string
  orderNumber: string
  customerId: Customer | string
  vendorId?: Vendor | string | null
  assignmentMode?: string | null
  items: OrderItem[]
  shippingAddress: ShippingAddress | string
  status: string
  paymentMethod: string
  paymentStatus: string
  total: number
  subtotal: number
  shipping: number
  returnRequest?: ReturnRequest
  createdAt: string
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "confirmed":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "processing":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "shipped":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "delivered":
      return "bg-green-100 text-green-800 border-green-200"
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const formatStatus = (status: string) => {
  return status
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function AdminOrdersList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [assignmentModeFilter, setAssignmentModeFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [assignVendorDialogOpen, setAssignVendorDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState<string>("")
  const [updateForm, setUpdateForm] = useState({
    status: "",
    paymentStatus: "",
    paymentMethod: "",
  })
  const [exporting, setExporting] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [returnRequestDialogOpen, setReturnRequestDialogOpen] = useState(false)
  const [returnRequestOrder, setReturnRequestOrder] = useState<Order | null>(null)
  const [returnActionLoading, setReturnActionLoading] = useState(false)
  const [returnAdminNotes, setReturnAdminNotes] = useState("")

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    const mb = bytes / 1024 / 1024
    if (mb >= 1) return `${mb.toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  const getFileUrl = (url: string) => {
    if (!url) return ""
    return url.startsWith("http") ? url : `${API_URL}${url}`
  }

  useEffect(() => {
    fetchOrders()
  }, [page, statusFilter, paymentMethodFilter, paymentStatusFilter, vendorFilter, assignmentModeFilter])

  // Clear selected orders when orders change
  useEffect(() => {
    setSelectedOrders([])
  }, [orders])

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("adminToken")
      if (!token) {
        return
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(paymentMethodFilter !== "all" && { paymentMethod: paymentMethodFilter }),
        ...(paymentStatusFilter !== "all" && { paymentStatus: paymentStatusFilter }),
        ...(vendorFilter !== "all" && { vendorId: vendorFilter }),
        ...(assignmentModeFilter !== "all" && { assignmentMode: assignmentModeFilter }),
      })

      const response = await fetch(`${API_URL}/api/admin/orders?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch orders")
      }

      const data = await response.json()
      if (data.success) {
        setOrders(data.data)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchOrders()
  }

  const fetchVendors = async () => {
    try {
      setLoadingVendors(true)
      const response = await fetch(`${API_URL}/api/vendors?status=approved&limit=100`)
      const data = await response.json()
      if (data.success) {
        setVendors(data.data)
      }
    } catch (error) {
      console.error("Error fetching vendors:", error)
    } finally {
      setLoadingVendors(false)
    }
  }

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return

    try {
      setUpdatingOrderId(selectedOrder._id)
      const token = localStorage.getItem("adminToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/admin/orders/${selectedOrder._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateForm),
      })

      const data = await response.json()

      if (data.success) {
        setUpdateDialogOpen(false)
        setSelectedOrder(null)
        setUpdateForm({ status: "", paymentStatus: "", paymentMethod: "" })
        fetchOrders()
      } else {
        alert(data.message || "Failed to update order")
      }
    } catch (error) {
      console.error("Error updating order:", error)
      alert("Network error. Please try again.")
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleAssignVendor = async () => {
    if (!selectedOrder) return

    try {
      setUpdatingOrderId(selectedOrder._id)
      const token = localStorage.getItem("adminToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/admin/orders/${selectedOrder._id}/assign-vendor`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendorId: selectedVendorId === "none" ? null : selectedVendorId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAssignVendorDialogOpen(false)
        setSelectedOrder(null)
        setSelectedVendorId("")
        fetchOrders()
      } else {
        alert(data.message || "Failed to assign vendor")
      }
    } catch (error) {
      console.error("Error assigning vendor:", error)
      alert("Network error. Please try again.")
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const openAssignVendorDialog = (order: Order) => {
    setSelectedOrder(order)
    const vendorId = typeof order.vendorId === "object" && order.vendorId !== null ? order.vendorId._id : null
    setSelectedVendorId(vendorId || "none")
    setAssignVendorDialogOpen(true)
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) {
      return
    }

    try {
      const token = localStorage.getItem("adminToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        fetchOrders()
      } else {
        alert(data.message || "Failed to cancel order")
      }
    } catch (error) {
      console.error("Error deleting order:", error)
      alert("Network error. Please try again.")
    }
  }

  const handleSelectOrder = (orderId: string) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId))
    } else {
      setSelectedOrders([...selectedOrders, orderId])
    }
  }

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(orders.map((order) => order._id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one order to delete")
      return
    }

    try {
      setBulkDeleting(true)
      const token = localStorage.getItem("adminToken")
      if (!token) {
        alert("Please login again")
        return
      }

      const response = await fetch(`${API_URL}/api/admin/orders/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderIds: selectedOrders,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setBulkDeleteDialogOpen(false)
        setSelectedOrders([])
        fetchOrders()
        alert(`Successfully deleted ${data.data.deletedCount} order(s)`)
      } else {
        alert(data.message || "Failed to delete orders")
      }
    } catch (error) {
      console.error("Error bulk deleting orders:", error)
      alert("Network error. Please try again.")
    } finally {
      setBulkDeleting(false)
    }
  }

  const openReturnRequestDialog = (order: Order) => {
    setReturnRequestOrder(order)
    setReturnAdminNotes("")
    setReturnRequestDialogOpen(true)
  }

  const handleAcceptReturn = async () => {
    if (!returnRequestOrder) return

    setReturnActionLoading(true)
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        alert("Please login again")
        return
      }

      const response = await fetch(`${API_URL}/api/admin/orders/${returnRequestOrder._id}/return/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminNotes: returnAdminNotes.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setReturnRequestDialogOpen(false)
        setReturnRequestOrder(null)
        setReturnAdminNotes("")
        fetchOrders()
        alert("Return request accepted successfully")
      } else {
        alert(data.message || "Failed to accept return request")
      }
    } catch (error) {
      console.error("Error accepting return request:", error)
      alert("Network error. Please try again.")
    } finally {
      setReturnActionLoading(false)
    }
  }

  const handleDenyReturn = async () => {
    if (!returnRequestOrder) return

    if (!returnAdminNotes.trim()) {
      alert("Please provide a reason for denying the return request")
      return
    }

    setReturnActionLoading(true)
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        alert("Please login again")
        return
      }

      const response = await fetch(`${API_URL}/api/admin/orders/${returnRequestOrder._id}/return/deny`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminNotes: returnAdminNotes.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setReturnRequestDialogOpen(false)
        setReturnRequestOrder(null)
        setReturnAdminNotes("")
        fetchOrders()
        alert("Return request denied successfully")
      } else {
        alert(data.message || "Failed to deny return request")
      }
    } catch (error) {
      console.error("Error denying return request:", error)
      alert("Network error. Please try again.")
    } finally {
      setReturnActionLoading(false)
    }
  }

  const openUpdateDialog = (order: Order) => {
    setSelectedOrder(order)
    setUpdateForm({
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
    })
    setUpdateDialogOpen(true)
  }

  const getCustomerInfo = (order: Order) => {
    if (typeof order.customerId === "object" && order.customerId !== null) {
      return {
        name: order.customerId.name || "N/A",
        mobile: order.customerId.mobile || "N/A",
      }
    }
    return { name: "N/A", mobile: "N/A" }
  }

  const getAddressInfo = (order: Order) => {
    if (typeof order.shippingAddress === "object" && order.shippingAddress !== null) {
      return order.shippingAddress
    }
    return null
  }

  const getVendorInfo = (order: Order) => {
    if (typeof order.vendorId === "object" && order.vendorId !== null) {
      return order.vendorId
    }
    return null
  }

  const handleExportOrders = async () => {
    try {
      setExporting(true)
      const token = localStorage.getItem("adminToken")
      if (!token) {
        alert("Please login to export orders")
        return
      }

      // Fetch all orders matching current filters (without pagination)
      const params = new URLSearchParams({
        page: "1",
        limit: "10000", // Large limit to get all orders
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(paymentMethodFilter !== "all" && { paymentMethod: paymentMethodFilter }),
        ...(paymentStatusFilter !== "all" && { paymentStatus: paymentStatusFilter }),
        ...(vendorFilter !== "all" && { vendorId: vendorFilter }),
        ...(assignmentModeFilter !== "all" && { assignmentMode: assignmentModeFilter }),
      })

      const response = await fetch(`${API_URL}/api/admin/orders?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch orders for export")
      }

      const data = await response.json()
      if (!data.success || !data.data) {
        throw new Error("No orders data available")
      }

      const orders = data.data

      // Convert orders to CSV
      const csvHeaders = [
        "Order Number",
        "Order Date",
        "Customer Name",
        "Customer Mobile",
        "Customer Email",
        "Vendor Name",
        "Vendor Phone",
        "Assignment Mode",
        "Items",
        "Item Details",
        "Quantity",
        "Subtotal",
        "Shipping",
        "Total",
        "Payment Method",
        "Payment Status",
        "Order Status",
        "Shipping Address",
        "City",
        "State",
        "Postcode",
        "Phone",
      ]

      const csvRows = orders.map((order: Order) => {
        const customer = getCustomerInfo(order)
        const vendor = getVendorInfo(order)
        const address = getAddressInfo(order)
        const itemsList = order.items.map((item) => `${item.name} (${item.brand})`).join("; ")
        const itemDetails = order.items
          .map((item) => `${item.name} (${item.brand}) - Qty: ${item.quantity} - ₹${item.price}`)
          .join("; ")
        const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0)

        return [
          order.orderNumber || "",
          new Date(order.createdAt).toLocaleDateString("en-IN"),
          customer.name || "",
          customer.mobile || "",
          typeof order.customerId === "object" && order.customerId !== null ? order.customerId.email || "" : "",
          vendor?.name || "Unassigned",
          vendor?.phone || "",
          order.assignmentMode
            ? order.assignmentMode === "assigned-by-admin"
              ? "By Admin"
              : "By Vendor"
            : "",
          itemsList,
          itemDetails,
          totalQuantity.toString(),
          `₹${order.subtotal.toLocaleString()}`,
          `₹${order.shipping.toLocaleString()}`,
          `₹${order.total.toLocaleString()}`,
          order.paymentMethod.toUpperCase(),
          formatStatus(order.paymentStatus),
          formatStatus(order.status),
          address ? `${address.address1 || ""}` : "",
          address?.city || "",
          address?.state || "",
          address?.postcode || "",
          address?.phone || "",
        ]
      })

      // Create CSV content
      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n")

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      const timestamp = new Date().toISOString().split("T")[0]
      a.href = url
      a.download = `orders_export_${timestamp}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting orders:", error)
      alert("Failed to export orders. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders Management</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all customer orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
            onClick={handleExportOrders}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Exporting...</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={fetchOrders}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Order ID, Customer Contact, Product Name..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch()
                  }
                }}
              />
            </div>
            <Button onClick={handleSearch} className="sm:w-auto">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Payment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="cod">COD</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor._id} value={vendor._id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assignmentModeFilter} onValueChange={setAssignmentModeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="assigned-by-admin">By Admin</SelectItem>
                <SelectItem value="accepted-by-vendor">By Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-t-4 border-t-primary">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
          <CardTitle className="text-lg">
            All Orders ({pagination.total}) - Page {pagination.page} of {pagination.pages}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <>
              {/* Bulk Actions */}
              {!loading && orders.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 border-b">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedOrders.length === orders.length && orders.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                        Select All ({selectedOrders.length} selected)
                      </Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => setBulkDeleteDialogOpen(true)}
                      disabled={selectedOrders.length === 0 || bulkDeleting}
                      className="gap-2"
                    >
                      {bulkDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Bulk Delete ({selectedOrders.length})
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold w-12">
                        <Checkbox
                          checked={selectedOrders.length === orders.length && orders.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold">Order Number</TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Vendor</TableHead>
                      <TableHead className="font-semibold">Assignment</TableHead>
                      <TableHead className="font-semibold">Items</TableHead>
                      <TableHead className="font-semibold">Payment</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Total</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const customer = getCustomerInfo(order)
                      const vendor = getVendorInfo(order)
                      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
                      return (
                        <TableRow key={order._id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <Checkbox
                              checked={selectedOrders.includes(order._id)}
                              onCheckedChange={() => handleSelectOrder(order._id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-primary">
                            <Link href={`/admin/orders/${order._id}`} className="hover:underline">
                              {order.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">{customer.mobile}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {vendor ? (
                              <div>
                                <p className="font-medium">{vendor.name}</p>
                                <p className="text-xs text-muted-foreground">{vendor.phone}</p>
                                {vendor.address && (
                                  <p className="text-xs text-muted-foreground">
                                    {vendor.address.city}, {vendor.address.state}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Unassigned
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {order.assignmentMode ? (
                              <Badge
                                variant={order.assignmentMode === "assigned-by-admin" ? "secondary" : "default"}
                                className="text-[10px] px-1.5 py-0.5"
                                title={
                                  order.assignmentMode === "assigned-by-admin"
                                    ? "Assigned by Admin"
                                    : "Accepted by Vendor"
                                }
                              >
                                {order.assignmentMode === "assigned-by-admin" ? "By Admin" : "By Vendor"}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div>
                              <p className="font-medium">{itemCount} item(s)</p>
                              <p className="text-xs text-muted-foreground">
                                {order.items[0]?.name || "N/A"}
                                {order.items.length > 1 && ` +${order.items.length - 1} more`}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge
                                variant={order.paymentMethod === "cod" ? "secondary" : "default"}
                                className="text-xs"
                              >
                                {order.paymentMethod.toUpperCase()}
                              </Badge>
                              <br />
                              <Badge
                                variant={
                                  order.paymentStatus === "paid"
                                    ? "default"
                                    : order.paymentStatus === "failed"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {formatStatus(order.paymentStatus)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge
                                asChild
                                className={`${getStatusColor(order.status)} cursor-pointer`}
                                title="View order details"
                              >
                                <Link href={`/admin/orders/${order._id}`}>{formatStatus(order.status)}</Link>
                              </Badge>
                              {order.returnRequest && order.returnRequest.type && (
                                <Badge
                                  variant={
                                    order.returnRequest.type === "pending"
                                      ? "secondary"
                                      : order.returnRequest.type === "accepted"
                                      ? "default"
                                      : "destructive"
                                  }
                                  className="text-xs ml-1"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1 inline" />
                                  Return {order.returnRequest.type}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">₹{order.total.toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={`/admin/orders/${order._id}`}>
                                <Button variant="ghost" size="sm" className="gap-2">
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={() => openAssignVendorDialog(order)}
                                title="Assign Vendor"
                              >
                                <UserPlus className="h-4 w-4" />
                                Vendor
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={() => openUpdateDialog(order)}
                              >
                                <Filter className="h-4 w-4" />
                                Edit
                              </Button>
                              {order.returnRequest && order.returnRequest.type === "pending" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-2 text-orange-600 hover:text-orange-700"
                                  onClick={() => openReturnRequestDialog(order)}
                                  title="Review Return Request"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Return
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-border">
                {orders.map((order) => {
                  const customer = getCustomerInfo(order)
                  const vendor = getVendorInfo(order)
                  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
                  return (
                    <div key={order._id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedOrders.includes(order._id)}
                              onCheckedChange={() => handleSelectOrder(order._id)}
                            />
                            <Link href={`/admin/orders/${order._id}`}>
                              <h3 className="font-semibold text-primary hover:underline">{order.orderNumber}</h3>
                            </Link>
                          </div>
                          <Badge className={getStatusColor(order.status)}>{formatStatus(order.status)}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Customer:</span>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.mobile}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Vendor:</span>
                            {vendor ? (
                              <>
                                <p className="font-medium">{vendor.name}</p>
                                <p className="text-xs text-muted-foreground">{vendor.phone}</p>
                                {order.assignmentMode && (
                                  <Badge
                                    variant={order.assignmentMode === "assigned-by-admin" ? "secondary" : "default"}
                                    className="text-[10px] mt-1 px-1.5 py-0"
                                    title={
                                      order.assignmentMode === "assigned-by-admin"
                                        ? "Assigned by Admin"
                                        : "Accepted by Vendor"
                                    }
                                  >
                                    {order.assignmentMode === "assigned-by-admin" ? "By Admin" : "By Vendor"}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Badge variant="outline" className="text-xs mt-1">
                                Unassigned
                              </Badge>
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Items:</span>
                            <p className="font-medium">{itemCount} item(s)</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Payment:</span>
                            <p className="font-medium">{order.paymentMethod.toUpperCase()}</p>
                            <Badge
                              variant={
                                order.paymentStatus === "paid"
                                  ? "default"
                                  : order.paymentStatus === "failed"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-xs mt-1"
                            >
                              {formatStatus(order.paymentStatus)}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <p className="font-semibold text-green-600">₹{order.total.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <div className="mt-1 space-y-1">
                              <Badge
                                asChild
                                className={`${getStatusColor(order.status)} cursor-pointer`}
                                title="View order details"
                              >
                                <Link href={`/admin/orders/${order._id}`}>{formatStatus(order.status)}</Link>
                              </Badge>
                              {order.returnRequest && order.returnRequest.type && (
                                <Badge
                                  variant={
                                    order.returnRequest.type === "pending"
                                      ? "secondary"
                                      : order.returnRequest.type === "accepted"
                                      ? "default"
                                      : "destructive"
                                  }
                                  className="text-xs ml-1"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1 inline" />
                                  Return {order.returnRequest.type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                          <Link href={`/admin/orders/${order._id}`}>
                            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-transparent"
                            onClick={() => openAssignVendorDialog(order)}
                          >
                            <UserPlus className="h-4 w-4" />
                            Vendor
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-transparent"
                            onClick={() => openUpdateDialog(order)}
                          >
                            <Filter className="h-4 w-4" />
                            Edit
                          </Button>
                          {order.returnRequest && order.returnRequest.type === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 bg-transparent text-orange-600 hover:text-orange-700"
                              onClick={() => openReturnRequestDialog(order)}
                            >
                              <RotateCcw className="h-4 w-4" />
                              Return
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm">
              Page {pagination.page} of {pagination.pages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Update Order Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order</DialogTitle>
            <DialogDescription>Update order status and payment information</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <Label>Order Number</Label>
                <p className="font-semibold">{selectedOrder.orderNumber}</p>
              </div>
              <div>
                <Label htmlFor="status">Order Status</Label>
                <Select value={updateForm.status} onValueChange={(value) => setUpdateForm({ ...updateForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select
                  value={updateForm.paymentStatus}
                  onValueChange={(value) => setUpdateForm({ ...updateForm, paymentStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={updateForm.paymentMethod}
                  onValueChange={(value) => setUpdateForm({ ...updateForm, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cod">COD</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleUpdateOrder}
                  disabled={updatingOrderId === selectedOrder._id}
                  className="flex-1"
                >
                  {updatingOrderId === selectedOrder._id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Order"
                  )}
                </Button>
                <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Vendor Dialog */}
      <Dialog open={assignVendorDialogOpen} onOpenChange={setAssignVendorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Vendor to Order</DialogTitle>
            <DialogDescription>Select a vendor to assign to this order</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <Label>Order Number</Label>
                <p className="font-semibold">{selectedOrder.orderNumber}</p>
              </div>
              <div>
                <Label htmlFor="vendor">Select Vendor</Label>
                {loadingVendors ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                ) : (
                  <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassign (No Vendor)</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor._id} value={vendor._id}>
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            <span>{vendor.name}</span>
                            {vendor.address && (
                              <span className="text-xs text-muted-foreground">
                                - {vendor.address.city}, {vendor.address.state}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {vendors.length === 0 && !loadingVendors && (
                <p className="text-sm text-muted-foreground">No approved vendors available</p>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleAssignVendor}
                  disabled={updatingOrderId === selectedOrder._id || loadingVendors}
                  className="flex-1"
                >
                  {updatingOrderId === selectedOrder._id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {selectedVendorId === "none" ? "Unassign Vendor" : "Assign Vendor"}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setAssignVendorDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedOrders.length} order(s) and remove them from records. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting || selectedOrders.length === 0}
              className="flex-1"
            >
              {bulkDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedOrders.length} Order(s)
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)} disabled={bulkDeleting}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Request Dialog */}
      <Dialog open={returnRequestDialogOpen} onOpenChange={setReturnRequestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Review Return Request
            </DialogTitle>
            <DialogDescription>
              Review and accept or deny the return request for this order
            </DialogDescription>
          </DialogHeader>
          {returnRequestOrder && returnRequestOrder.returnRequest && (
            <div className="space-y-4">
              <div>
                <Label>Order Number</Label>
                <p className="font-semibold">{returnRequestOrder.orderNumber}</p>
              </div>
              
              <div>
                <Label>Customer Return Reason</Label>
                <Alert className="mt-2">
                  <AlertDescription>{returnRequestOrder.returnRequest.reason}</AlertDescription>
                </Alert>
              </div>

              {returnRequestOrder.returnRequest.requestedAt && (
                <div>
                  <Label>Requested At</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(returnRequestOrder.returnRequest.requestedAt).toLocaleString("en-IN")}
                  </p>
                </div>
              )}

              {returnRequestOrder.returnRequest.attachments && returnRequestOrder.returnRequest.attachments.length > 0 && (
                <div>
                  <Label>Customer Uploads</Label>
                  <ul className="mt-2 space-y-1 text-sm">
                    {returnRequestOrder.returnRequest.attachments.map((file, idx) => (
                      <li key={`${file.url}-${idx}`} className="flex items-center justify-between gap-2">
                        <a
                          href={getFileUrl(file.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {file.originalName || file.url?.split("/").pop()}
                        </a>
                        <span className="text-xs text-muted-foreground">
                          {(file.mimeType?.split("/")?.[0] || "file").toUpperCase()} {formatFileSize(file.size)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <Label htmlFor="adminNotes">Admin Notes {returnRequestOrder.returnRequest.type === "pending" && "(Required for denial)"}</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Add notes about your decision (required if denying)..."
                  value={returnAdminNotes}
                  onChange={(e) => setReturnAdminNotes(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>

              {returnRequestOrder.returnRequest.type === "pending" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleAcceptReturn}
                    disabled={returnActionLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {returnActionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept Return
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleDenyReturn}
                    disabled={returnActionLoading}
                    variant="destructive"
                    className="flex-1"
                  >
                    {returnActionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Deny Return
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReturnRequestDialogOpen(false)
                      setReturnRequestOrder(null)
                      setReturnAdminNotes("")
                    }}
                    disabled={returnActionLoading}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {returnRequestOrder.returnRequest.type !== "pending" && (
                <div className="pt-4 border-t">
                  <Alert
                    variant={returnRequestOrder.returnRequest.type === "accepted" ? "default" : "destructive"}
                  >
                    <AlertDescription>
                      <div className="font-semibold mb-1">
                        Status: {returnRequestOrder.returnRequest.type === "accepted" ? "Accepted" : "Denied"}
                      </div>
                      {returnRequestOrder.returnRequest.adminNotes && (
                        <div className="mt-1">
                          <span className="font-medium">Admin Notes:</span> {returnRequestOrder.returnRequest.adminNotes}
                        </div>
                      )}
                      {returnRequestOrder.returnRequest.reviewedAt && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          Reviewed: {new Date(returnRequestOrder.returnRequest.reviewedAt).toLocaleString("en-IN")}
                        </div>
                      )}
                      {returnRequestOrder.returnRequest.type === "accepted" &&
                        returnRequestOrder.returnRequest.refundStatus && (
                          <div className="mt-1">
                            <span className="font-medium">Refund Status:</span>{" "}
                            {returnRequestOrder.returnRequest.refundStatus}
                          </div>
                        )}
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReturnRequestDialogOpen(false)
                      setReturnRequestOrder(null)
                      setReturnAdminNotes("")
                    }}
                    className="mt-4 w-full"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
