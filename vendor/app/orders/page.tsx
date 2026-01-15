"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, FileDown, CreditCard, Wallet, X } from "lucide-react"
import { API_URL } from "@/lib/api-config"
import { useNavigation } from "@/contexts/navigation-context"
import { Capacitor } from "@capacitor/core"
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem"

interface OrderItem {
  name: string
  quantity: number
  price: number
  productId?: {
    _id: string
    name: string
    brand?: string
    images?: string[]
  }
}

interface Customer {
  _id: string
  name?: string
  mobile: string
  email?: string
}

interface Order {
  _id: string
  orderNumber: string
  customerId: Customer | string
  items: OrderItem[]
  status: string
  total: number
  subtotal: number
  shipping: number
  createdAt: string
  updatedAt?: string
  deliveredAt?: string | null
  paymentStatus?: string
  paymentMethod?: string
  paymentTransactionId?: string | null
  paymentGateway?: string | null
  returnRequest?: {
    type?: string | null
    refundStatus?: string | null
    requestedAt?: string | null
  } | null
}

const PAYMENT_GATEWAY_RATE = 2 // percent of payout-before-gateway

export default function OrdersPage() {
  const router = useRouter()
  const { setSelectedOrderId } = useNavigation()
  const [orders, setOrders] = useState<Order[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([]) // Store all orders for tab counts
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [vendorCommission, setVendorCommission] = useState<number | null>(null)
  const [downloadingStatement, setDownloadingStatement] = useState(false)
  const [packingVideoFiles, setPackingVideoFiles] = useState<Record<string, File | null>>({})

  useEffect(() => {
    fetchOrders()
  }, [activeTab])

  useEffect(() => {
    fetchVendorProfile()
    // Fetch all orders on initial load for tab counts
    fetchAllOrders()
  }, [])

  // Refresh all orders when orders are updated (e.g., after status change)
  useEffect(() => {
    if (orders.length > 0 && allOrders.length === 0) {
      // If we have orders but no allOrders, fetch them
      fetchAllOrders()
    }
  }, [orders.length])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        ...(activeTab !== "all" && { status: activeTab }),
      })

      const response = await fetch(`${API_URL}/api/vendor/orders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        if (response.status === 401) {
          localStorage.removeItem("vendorToken")
          localStorage.removeItem("vendorData")
          router.push("/login")
          return
        }
        setError(data.message || "Failed to load orders")
        return
      }

      setOrders(data.data || [])
    } catch (err) {
      console.error("Error fetching orders:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fetchAllOrders = async () => {
    try {
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        return
      }

      const response = await fetch(`${API_URL}/api/vendor/orders?page=1&limit=1000`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setAllOrders(data.data || [])
      }
    } catch (err) {
      console.error("Error fetching all orders for counts:", err)
      // Don't show error to user, just use current orders as fallback
    }
  }

  const fetchVendorProfile = async () => {
    try {
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/vendor-auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        if (response.status === 401) {
          localStorage.removeItem("vendorToken")
          localStorage.removeItem("vendorData")
          router.push("/login")
          return
        }
        return
      }

      const commissionValue = data.data?.vendor?.commission
      if (typeof commissionValue === "number") {
        setVendorCommission(commissionValue)
      } else {
        // If commission is not available, set to null - calculations will handle this
        setVendorCommission(null)
      }
    } catch (err) {
      console.error("Error fetching vendor profile:", err)
    }
  }

  const handleStatusUpdate = async (orderId: string, newStatus: string, packingVideoFile?: File | null) => {
    try {
      setUpdatingStatus(orderId)
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const url = `${API_URL}/api/vendor/orders/${orderId}/status`
      const isPackingWithVideo = newStatus === "shipped" && packingVideoFile instanceof File

      const response = await fetch(url, isPackingWithVideo
        ? {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: (() => {
              const form = new FormData()
              form.append("status", newStatus)
              form.append("packingVideo", packingVideoFile)
              return form
            })(),
          }
        : {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: newStatus }),
          })

      const data = await response.json()

      if (!response.ok || !data.success) {
        if (response.status === 401) {
          localStorage.removeItem("vendorToken")
          localStorage.removeItem("vendorData")
          router.push("/login")
          return
        }
        alert(data.message || "Failed to update status")
        return
      }

      // Update order in list
      setOrders((prev) =>
        prev.map((order) => (order._id === orderId ? { ...order, status: newStatus } : order))
      )
      // Also update in allOrders for accurate tab counts
      setAllOrders((prev) =>
        prev.map((order) => (order._id === orderId ? { ...order, status: newStatus } : order))
      )
      // Clear selected packing video file (if any)
      setPackingVideoFiles((prev) => ({ ...prev, [orderId]: null }))
    } catch (err) {
      console.error("Error updating status:", err)
      alert("Network error. Please try again.")
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    try {
      const confirmCancel = confirm("Cancel this accepted order? Admin will be notified for reassignment.")
      if (!confirmCancel) return

      const reason = prompt("Reason for cancelling (optional):") || ""

      setCancellingOrderId(orderId)
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/vendor/orders/${orderId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        if (response.status === 401) {
          localStorage.removeItem("vendorToken")
          localStorage.removeItem("vendorData")
          router.push("/login")
          return
        }
        alert(data.message || "Failed to cancel order")
        return
      }

      // Remove from current tab list + counts (it becomes unassigned + admin_review_required)
      setOrders((prev) => prev.filter((o) => o._id !== orderId))
      setAllOrders((prev) => prev.filter((o) => o._id !== orderId))

      alert("Order cancelled. Admin has been notified for reassignment.")
    } catch (err) {
      console.error("Error cancelling order:", err)
      alert("Network error. Please try again.")
    } finally {
      setCancellingOrderId(null)
    }
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  }

  const itemCount = (order: Order) => {
    return order.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  const formatCurrency = (amount: number, withSymbol = true) => {
    const formatted = amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return withSymbol ? `₹${formatted}` : formatted
  }

  const getCommissionRate = () => {
    if (typeof vendorCommission === "number") return vendorCommission
    // If commission is not available, return 0 (no commission)
    // This should not happen in normal operation, but provides a safe fallback
    return 0
  }

  const getPayoutBreakdown = (order: Order) => {
    const commissionRate = getCommissionRate()
    const productTotal = typeof order.subtotal === "number" ? order.subtotal : order.total
    const commissionAmount = Math.max(0, (commissionRate / 100) * productTotal)
    const payoutBeforeGateway = Math.max(productTotal - commissionAmount, 0)
    const gatewayFees = Math.max(0, (PAYMENT_GATEWAY_RATE / 100) * payoutBeforeGateway)
    const netPayout = Math.max(payoutBeforeGateway - gatewayFees, 0)

    return {
      commissionRate,
      productTotal,
      commissionAmount,
      payoutBeforeGateway,
      gatewayFees,
      netPayout,
    }
  }

  const formatDateLabel = (value?: Date | string | null) => {
    if (!value) return "N/A"
    const date = typeof value === "string" ? new Date(value) : value
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  // Use allOrders for tab counts to show accurate numbers regardless of active tab
  // Fallback to orders if allOrders is not yet loaded (e.g., on "all" tab)
  const ordersForCounts = allOrders.length > 0 ? allOrders : (activeTab === "all" ? orders : [])
  const tabs = [
    { id: "all", label: "All", count: ordersForCounts.length },
    { id: "processing", label: "Processing", count: ordersForCounts.filter((o) => o.status === "processing").length },
    { id: "shipped", label: "Packed", count: ordersForCounts.filter((o) => o.status === "shipped").length },
    { id: "delivered", label: "Delivered", count: ordersForCounts.filter((o) => o.status === "delivered").length },
  ]

  const filteredOrders = orders.filter((order) => {
    const customer = getCustomerInfo(order)
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.mobile.includes(searchQuery)
    return matchesSearch
  })


  const handleDownloadStatement = async () => {
    // Use orders from current tab, not filteredOrders (which includes search filter)
    const ordersToExport = orders.length > 0 ? orders : []
    
    if (ordersToExport.length === 0) {
      alert("No orders to export")
      return
    }
    
    setDownloadingStatement(true)

    try {
      const headers = [
        "Order Number",
        "Status",
        "Payment Method",
        "Transaction ID",
        "Order Amount",
        "Delivered / Updated",
      ]

      const sanitize = (value: any) => `"${String(value ?? "").replace(/"/g, '""')}"`

      const rows = ordersToExport.map((order) => {
        const payout = getPayoutBreakdown(order)
        return [
          order.orderNumber,
          order.status,
          order.paymentMethod || "N/A",
          order.paymentTransactionId || "",
          formatCurrency(payout.netPayout, false),
          formatDateLabel(order.deliveredAt || order.updatedAt || order.createdAt),
        ]
      })

      const csvContent = [headers, ...rows]
        .map((row) => row.map(sanitize).join(","))
        .join("\n")

      const filename = `vendor-statement-${new Date().toISOString().split("T")[0]}.csv`

      // Check if running in Capacitor native app
      if (Capacitor.isNativePlatform()) {
        try {
          const platform = Capacitor.getPlatform()
          
          // Use Documents directory - works on both Android and iOS
          // On Android: saves to app's Documents folder (accessible via file manager)
          // On iOS: saves to app's Documents folder (accessible via Files app)
          const result = await Filesystem.writeFile({
            path: filename,
            data: csvContent,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          })

          const folderName = platform === "android" 
            ? "Documents folder (accessible via file manager)" 
            : "Documents folder (accessible via Files app)"
          
          alert(`CSV file saved successfully!\n\nFile: ${filename}\nLocation: ${folderName}`)
        } catch (filesystemError) {
          console.error("Error saving file with Filesystem API:", filesystemError)
          
          // Fallback: Try to use browser download method (works in some Capacitor webviews)
          try {
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            alert("File download initiated")
          } catch (fallbackError) {
            console.error("Error with fallback download:", fallbackError)
            alert("Unable to save file. Please check app permissions or try again.")
          }
        }
      } else {
        // Use browser download for web
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error("Error generating statement:", err)
      alert("Unable to generate statement right now. Please try again.")
    } finally {
      setDownloadingStatement(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-chart-3/10 text-chart-3 border-chart-3/20"
      case "shipped":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "processing":
        return "bg-primary/10 text-primary border-primary/20"
      case "pending":
        return "bg-chart-5/10 text-chart-5 border-chart-5/20"
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getStatusLabel = (status: string) => {
    if (status === "shipped") return "packed"
    return status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case "shipped":
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
        )
      case "processing":
        return (
          <svg className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )
      case "pending":
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
    }
  }

  const shouldShowPayout = (status: string) => {
    return ["processing", "shipped", "delivered"].includes(status)
  }

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}>
      <div className="sticky top-0 z-10 border-b-2 border-border/50 bg-card/98 backdrop-blur-xl shadow-sm safe-top" style={{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Orders</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your order history</p>
            </div>
          </div>

          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              type="search"
              placeholder="Search by order ID or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Includes commission, gateway fees, return window and payout schedule.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadStatement}
              disabled={orders.length === 0 || downloadingStatement}
              className="flex items-center gap-2"
            >
              <FileDown className="h-4 w-4" />
              {downloadingStatement ? "Preparing..." : "Download CSV"}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:scale-105"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-background text-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchOrders} className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted/50">
              <svg className="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">No orders found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredOrders.map((order, index) => {
            const customer = getCustomerInfo(order)
            const timeAgo = formatTimeAgo(order.createdAt)
            const items = itemCount(order)
            const canUpdateStatus = order.status === "processing"
            const payout = getPayoutBreakdown(order)
            const selectedPackingVideo = packingVideoFiles[order._id] || null

            return (
              <Card
                key={order._id}
                className="border-2 border-border/50 bg-card hover:border-primary/50 hover:shadow-lg transition-all hover:-translate-y-0.5 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${getStatusColor(order.status).replace("text-", "bg-").replace("bg-", "bg-").split(" ")[0]}`}
                    >
                      <div className={getStatusColor(order.status).split(" ")[1]}>{getStatusIcon(order.status)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <button
                            onClick={() => {
                              setSelectedOrderId(order._id)
                              router.push("/order-detail")
                            }}
                            className="text-sm font-bold text-foreground hover:text-primary text-left"
                          >
                            {order.orderNumber}
                          </button>
                          <p className="text-xs text-muted-foreground mt-0.5">{customer.name}</p>
                        </div>
                        <span className={`rounded-lg border px-3 py-1 text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Update Button */}
                  {canUpdateStatus && (
                    <div className="mb-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <label className="text-xs font-semibold text-foreground mb-2 block">Update Status:</label>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <p className="text-[11px] text-muted-foreground">
                            Packing video (optional) — helps verify returns later.
                          </p>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              setPackingVideoFiles((prev) => ({ ...prev, [order._id]: file }))
                            }}
                            className="block w-full text-xs file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
                          />
                          {selectedPackingVideo && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              Selected: {selectedPackingVideo.name}
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled={updatingStatus === order._id || !selectedPackingVideo}
                            onClick={() => handleStatusUpdate(order._id, "shipped", selectedPackingVideo)}
                          >
                            {updatingStatus === order._id ? "Updating..." : "Upload Video & Mark as Packed"}
                          </Button>
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled={updatingStatus === order._id}
                            onClick={() => handleStatusUpdate(order._id, "shipped")}
                          >
                            {updatingStatus === order._id ? "Updating..." : "Skip Video & Mark as Packed"}
                          </Button>
                          <Button
                            className="w-full"
                            variant="destructive"
                            disabled={updatingStatus === order._id || cancellingOrderId === order._id}
                            onClick={() => handleCancelOrder(order._id)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            {cancellingOrderId === order._id ? "Cancelling..." : "Cancel Order"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payout & Payment */}
                  {shouldShowPayout(order.status) && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4 text-primary" />
                            You Will Receive
                          </span>
                          <span className="text-[11px] uppercase text-muted-foreground">
                            {order.paymentStatus || "pending"}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(payout.netPayout)}</p>
                        <p className="text-xs text-muted-foreground">
                          Payment: {order.paymentMethod?.toUpperCase() || "N/A"}{" "}
                          {order.paymentTransactionId ? `• ${order.paymentTransactionId}` : ""}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                          <span className="flex items-center gap-1">
                            <Wallet className="h-4 w-4 text-chart-3" />
                            You Will Receive
                          </span>
                        </div>
                        <p className="text-lg font-bold text-chart-3 mt-1">{formatCurrency(payout.netPayout)}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                        <span className="font-medium">{items} items</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {timeAgo}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-primary">{formatCurrency(payout.netPayout)}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <BottomNav />
    </div>
  )
}
