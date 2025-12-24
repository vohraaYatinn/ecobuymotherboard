"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, FileDown, CreditCard, Wallet } from "lucide-react"
import { API_URL } from "@/lib/api-config"
import { useNavigation } from "@/contexts/navigation-context"

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
  invoiceNumber?: string | null
}

const DEFAULT_COMMISSION_RATE = 20 // percent fallback if vendor commission is missing
const PAYMENT_GATEWAY_RATE = 2 // percent of payout-before-gateway

export default function OrdersPage() {
  const router = useRouter()
  const { setSelectedOrderId } = useNavigation()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [vendorCommission, setVendorCommission] = useState<number | null>(null)
  const [downloadingStatement, setDownloadingStatement] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [activeTab])

  useEffect(() => {
    fetchVendorProfile()
  }, [])

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
        setVendorCommission(DEFAULT_COMMISSION_RATE)
      }
    } catch (err) {
      console.error("Error fetching vendor profile:", err)
    }
  }

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(orderId)
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/vendor/orders/${orderId}/status`, {
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
    } catch (err) {
      console.error("Error updating status:", err)
      alert("Network error. Please try again.")
    } finally {
      setUpdatingStatus(null)
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
    return DEFAULT_COMMISSION_RATE
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

  const tabs = [
    { id: "all", label: "All", count: orders.length },
    { id: "processing", label: "Processing", count: orders.filter((o) => o.status === "processing").length },
    { id: "shipped", label: "Packed", count: orders.filter((o) => o.status === "shipped").length },
    { id: "delivered", label: "Delivered", count: orders.filter((o) => o.status === "delivered").length },
  ]

  const filteredOrders = orders.filter((order) => {
    const customer = getCustomerInfo(order)
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.mobile.includes(searchQuery)
    return matchesSearch
  })

  const handleDownloadInvoice = (orderId: string) => {
    const url = `${API_URL}/api/invoices/${orderId}/download`
    window.open(url, "_blank")
  }

  const handleDownloadStatement = () => {
    if (filteredOrders.length === 0) return
    setDownloadingStatement(true)

    try {
      const headers = [
        "Order Number",
        "Status",
        "Payment Status",
        "Payment Method",
        "Transaction ID",
        "Order Total",
        "Product Total",
        "Commission %",
        "Commission Amount",
        "Gateway Fees",
        "Net Payout",
        "Delivered / Updated",
      ]

      const sanitize = (value: any) => `"${String(value ?? "").replace(/"/g, '""')}"`

      const rows = filteredOrders.map((order) => {
        const payout = getPayoutBreakdown(order)

        return [
          order.orderNumber,
          order.status,
          order.paymentStatus || "pending",
          order.paymentMethod || "N/A",
          order.paymentTransactionId || "",
          formatCurrency(order.total),
          formatCurrency(payout.productTotal),
          `${payout.commissionRate}%`,
          formatCurrency(payout.commissionAmount),
          formatCurrency(payout.gatewayFees),
          formatCurrency(payout.netPayout),
          formatDateLabel(order.deliveredAt || order.updatedAt || order.createdAt),
        ]
      })

      const csvContent = [headers, ...rows]
        .map((row) => row.map(sanitize).join(","))
        .join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `vendor-statement-${new Date().toISOString().split("T")[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
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
              disabled={filteredOrders.length === 0 || downloadingStatement}
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
                      <Button
                        className="w-full"
                        variant="outline"
                        disabled={updatingStatus === order._id}
                        onClick={() => handleStatusUpdate(order._id, "shipped")}
                      >
                        {updatingStatus === order._id ? "Updating..." : "Mark as Packed"}
                      </Button>
                    </div>
                  )}

                  {/* Payout & Payment */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4 text-primary" />
                          Sales & delivery
                        </span>
                        <span className="text-[11px] uppercase text-muted-foreground">
                          {order.paymentStatus || "pending"}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        Payment: {order.paymentMethod?.toUpperCase() || "N/A"}{" "}
                        {order.paymentTransactionId ? `• ${order.paymentTransactionId}` : ""}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                        <span className="flex items-center gap-1">
                          <Wallet className="h-4 w-4 text-chart-3" />
                          Net payout
                        </span>
                        <span className="text-[11px] text-muted-foreground">Commission {payout.commissionRate}%</span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Product total</span>
                          <span className="font-medium text-foreground">{formatCurrency(payout.productTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Commission</span>
                          <span className="text-destructive">- {formatCurrency(payout.commissionAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gateway ({PAYMENT_GATEWAY_RATE}%)</span>
                          <span className="text-orange-600">- {formatCurrency(payout.gatewayFees)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-border/60">
                          <span className="text-xs font-semibold text-foreground">Net payout</span>
                          <span className="text-sm font-bold text-chart-3">{formatCurrency(payout.netPayout)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Downloads */}
                  <div className="mt-3">
                    <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                        <span>Downloadables</span>
                        <span className="text-[11px] text-muted-foreground">Invoices & records</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadInvoice(order._id)}
                          className="gap-2"
                        >
                          <FileDown className="h-4 w-4" />
                          Invoice PDF
                        </Button>
                        {order.invoiceNumber && (
                          <span className="text-[11px] text-muted-foreground">#{order.invoiceNumber}</span>
                        )}
                      </div>
                    </div>
                  </div>

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
                    <p className="text-lg font-bold text-primary">₹{order.total.toLocaleString("en-IN")}</p>
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
