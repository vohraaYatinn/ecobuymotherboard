"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  Banknote,
  CalendarRange,
  CreditCard,
  Factory,
  IndianRupee,
  Loader2,
  Package,
  Receipt,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react"
import Link from "next/link"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

type PaymentBreakdown = {
  amount: number
  count: number
}

interface VendorPayout {
  vendorId: string
  name: string
  email?: string
  phone?: string
  orderCount: number
  gross: number
  commission: number
  gstCollected: number
  pendingPayout: number
}

interface ReturnEntry {
  _id: string
  orderNumber: string
  total: number
  status?: string
  refundStatus?: string
  requestedAt?: string
}

interface ReturnSummary {
  pending: number
  accepted: number
  denied: number
  completed: number
  refunded: number
  inReview: number
}

interface CancelledEntry {
  _id: string
  orderNumber: string
  total: number
  status: string
  paymentStatus?: string
  cancelledAt?: string
  customer?: {
    name?: string
    mobile?: string
  }
}

interface CancelledData {
  count: number
  recent: CancelledEntry[]
}

interface ReportMetrics {
  orders: number
  deliveredOrders: number
  grossCollections: number
  gstCollected: number
  commissionEarned: number
  estimatedGatewayCharges: number
  returns: number
}

interface Financials {
  grossCollections: number
  gst: {
    cgst: number
    sgst: number
    igst: number
    total: number
  }
  gstPayable: {
    total: number
    breakdown: {
      cgst: number
      sgst: number
      igst: number
    }
  }
  commissions: {
    total: number
  }
  gatewayCharges: {
    estimated: number
    rate: number
    paymentMethodBreakdown: Record<string, PaymentBreakdown>
  }
  payouts: {
    totalLiability: number
    vendors: VendorPayout[]
  }
  returns: {
    summary: ReturnSummary
    recent: ReturnEntry[]
  }
  cancelled?: CancelledData
  reports: {
    daily: ReportMetrics
    weekly: ReportMetrics
    monthly: ReportMetrics
  }
}

interface DashboardStats {
  totals: {
    orders: number
    customers: number
    products: number
    vendors: number
    revenue: number
  }
  orderStatus: {
    pending: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
  }
  recentOrders: Array<{
    _id: string
    orderNumber: string
    customerId: {
      _id: string
      name?: string
      mobile: string
    }
    total: number
    status: string
    paymentStatus: string
    createdAt: string
  }>
  pendingVendors: Array<{
    _id: string
    name: string
    email: string
    phone: string
    createdAt: string
  }>
  financials?: Financials
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reportRange, setReportRange] = useState<"daily" | "weekly" | "monthly">("monthly")

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("adminToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || "Failed to load dashboard data")
        return
      }

      setStats(data.data)
    } catch (err) {
      console.error("Error fetching dashboard stats:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`
    } else {
      return `₹${amount.toLocaleString("en-IN")}`
    }
  }

  const formatNumber = (value: number) => {
    return value?.toLocaleString("en-IN")
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, Admin</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, Admin</p>
        </div>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) return null

  const financials = stats.financials
  const paymentBreakdown =
    financials?.gatewayCharges?.paymentMethodBreakdown || ({ cod: { amount: 0, count: 0 }, online: { amount: 0, count: 0 }, wallet: { amount: 0, count: 0 }, other: { amount: 0, count: 0 } } as Record<
      string,
      PaymentBreakdown
    >)
  const payoutVendors = financials?.payouts?.vendors?.slice(0, 6) || []
  const currentReport = financials?.reports?.[reportRange]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back, Admin</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totals.orders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.orderStatus.pending} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totals.customers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totals.products.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.totals.vendors} vendors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totals.revenue)}</div>
            <p className="text-xs text-muted-foreground">From delivered orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview */}
      {financials && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gross Collections</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(financials.grossCollections || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  Online ₹{formatNumber(paymentBreakdown.online?.amount || 0)} • COD ₹
                  {formatNumber(paymentBreakdown.cod?.amount || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">GST Collected &amp; Payable</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(financials.gst?.total || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  CGST ₹{formatNumber(financials.gst?.cgst || 0)} • SGST ₹{formatNumber(financials.gst?.sgst || 0)} •
                  IGST ₹{formatNumber(financials.gst?.igst || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(financials.commissions?.total || 0)}</div>
                <p className="text-xs text-muted-foreground">Delivered seller orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gateway Charges (est.)</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(financials.gatewayCharges?.estimated || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  @{((financials.gatewayCharges?.rate || 0) * 100).toFixed(1)}% online + wallet volume
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Seller Payout Liability</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Net payable after commission &amp; GST on delivered, paid orders
                  </p>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {formatCurrency(financials.payouts?.totalLiability || 0)}
                </div>
              </CardHeader>
              <CardContent>
                {payoutVendors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No vendor payouts pending</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[640px] space-y-3">
                      {payoutVendors.map((vendor) => (
                        <div
                          key={vendor.vendorId}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                        >
                          <div>
                            <p className="font-semibold">{vendor.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {vendor.email || "N/A"} • {vendor.phone || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Orders: {vendor.orderCount} • Commission: {formatCurrency(vendor.commission || 0)}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-xs text-muted-foreground">Pending payout</p>
                            <p className="text-lg font-bold text-foreground">
                              {formatCurrency(vendor.pendingPayout || 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Gross {formatCurrency(vendor.gross || 0)} • GST {formatCurrency(vendor.gstCollected || 0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Returns, Refunds &amp; Disputes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Pending: {financials.returns?.summary.pending || 0}</Badge>
                  <Badge variant="secondary">Accepted: {financials.returns?.summary.accepted || 0}</Badge>
                  <Badge variant="outline">Completed: {financials.returns?.summary.completed || 0}</Badge>
                  <Badge variant="outline">Denied: {financials.returns?.summary.denied || 0}</Badge>
                  <Badge variant="outline">Refunded: {financials.returns?.summary.refunded || 0}</Badge>
                  <Badge variant="outline">In Review: {financials.returns?.summary.inReview || 0}</Badge>
                </div>

                <div className="space-y-3">
                  {financials.returns?.recent?.length ? (
                    financials.returns.recent.map((ret) => (
                      <div key={ret._id} className="rounded-lg border p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <Link href={`/admin/orders/${ret._id}`} className="font-semibold text-primary hover:underline">
                            {ret.orderNumber}
                          </Link>
                          <span className="text-sm font-medium">{formatCurrency(ret.total || 0)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">{ret.status || "pending"}</Badge>
                          {ret.refundStatus && <Badge variant="outline">Refund: {ret.refundStatus}</Badge>}
                          <span>
                            Requested {formatTimeAgo(ret.requestedAt || new Date().toISOString())}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent returns</p>
                  )}
                </div>

                {/* Cancelled Orders Section */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Cancelled Orders
                    </CardTitle>
                    <Badge variant="outline">Total: {financials.cancelled?.count || 0}</Badge>
                  </div>
                  <div className="space-y-3">
                    {financials.cancelled?.recent?.length ? (
                      financials.cancelled.recent.map((order) => (
                        <div key={order._id} className="rounded-lg border p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <Link href={`/admin/orders/${order._id}`} className="font-semibold text-primary hover:underline">
                              {order.orderNumber}
                            </Link>
                            <span className="text-sm font-medium">{formatCurrency(order.total || 0)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary">cancelled</Badge>
                            {order.paymentStatus && (
                              <Badge variant="outline">Payment: {order.paymentStatus}</Badge>
                            )}
                            {order.customer && (
                              <span>
                                {order.customer.name || "N/A"} • {order.customer.mobile || "N/A"}
                              </span>
                            )}
                            <span>
                              Cancelled {formatTimeAgo(order.cancelledAt || new Date().toISOString())}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No recent cancelled orders</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <CalendarRange className="h-5 w-5" />
                  Financial Reports
                </CardTitle>
                <p className="text-sm text-muted-foreground">Daily / weekly / monthly financial snapshots</p>
              </div>
              <div className="flex items-center gap-2">
                {(["daily", "weekly", "monthly"] as const).map((range) => (
                  <Button
                    key={range}
                    variant={reportRange === range ? "default" : "outline"}
                    size="sm"
                    onClick={() => setReportRange(range)}
                  >
                    {range === "daily" ? "Daily" : range === "weekly" ? "Weekly" : "Monthly"}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {currentReport ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Orders</p>
                    <p className="text-2xl font-bold">{formatNumber(currentReport.orders || 0)}</p>
                    <p className="text-xs text-muted-foreground">
                      Delivered {formatNumber(currentReport.deliveredOrders || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Gross Collections</p>
                    <p className="text-2xl font-bold">{formatCurrency(currentReport.grossCollections || 0)}</p>
                    <p className="text-xs text-muted-foreground">
                      GST {formatCurrency(currentReport.gstCollected || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Commission &amp; Fees</p>
                    <p className="text-2xl font-bold">{formatCurrency(currentReport.commissionEarned || 0)}</p>
                    <p className="text-xs text-muted-foreground">
                      Gateway est. {formatCurrency(currentReport.estimatedGatewayCharges || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 space-y-2 md:col-span-3">
                    <p className="text-sm text-muted-foreground">Returns &amp; Refunds</p>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">Cases: {currentReport.returns || 0}</Badge>
                      <Badge variant="outline">
                        Online Volume ₹{formatNumber(paymentBreakdown.online?.amount || 0)}
                      </Badge>
                      <Badge variant="outline">
                        COD Volume ₹{formatNumber(paymentBreakdown.cod?.amount || 0)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Financial report data unavailable. Refresh to try again.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent orders</p>
            ) : (
              <div className="space-y-4">
                {stats.recentOrders.map((order) => {
                  const customer = typeof order.customerId === "object" ? order.customerId : null
                  return (
                    <Link key={order._id} href={`/admin/orders/${order._id}`}>
                      <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 hover:bg-muted/50 p-2 rounded transition-colors cursor-pointer">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {customer?.name || "N/A"} • {customer?.mobile || "N/A"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">₹{order.total.toLocaleString("en-IN")}</p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              order.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : order.status === "processing"
                                  ? "bg-blue-100 text-blue-800"
                                  : order.status === "delivered"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Vendor Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.pendingVendors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No pending vendor requests</p>
            ) : (
              <div className="space-y-4">
                {stats.pendingVendors.map((vendor) => (
                  <Link key={vendor._id} href={`/admin/vendors/${vendor._id}`}>
                    <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 hover:bg-muted/50 p-2 rounded transition-colors cursor-pointer">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{vendor.name}</p>
                        <p className="text-xs text-muted-foreground">{vendor.email}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                        Pending
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
