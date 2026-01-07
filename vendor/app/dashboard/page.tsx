"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { API_URL } from "@/lib/api-config"
import { useNavigation } from "@/contexts/navigation-context"

interface DashboardStats {
  totals: {
    orders: number
    pending: number
    shipped: number
    delivered: number
    totalEarned: number
    pendingAmount: number
    paidAmount: number
    balanceAmount: number
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
    createdAt: string
  }>
  vendorNotLinked?: boolean
  vendorNotApproved?: boolean
  vendorStatus?: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const { setSelectedOrderId } = useNavigation()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [vendorCommission, setVendorCommission] = useState<number | null>(null)

  useEffect(() => {
    fetchDashboardStats()
    fetchUnreadNotifications()
    fetchVendorProfile()
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchUnreadNotifications, 30000)
    
    return () => {
      clearInterval(interval)
    }
  }, [])

  const fetchUnreadNotifications = async () => {
    try {
      const token = localStorage.getItem("vendorToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/notifications/vendor?unreadOnly=true&limit=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUnreadNotifications(data.data.unreadCount || 0)
      } else if (response.status === 401) {
        // Token expired or invalid - silently fail, don't redirect
        console.warn("Notification fetch unauthorized - token may be invalid")
      }
    } catch (err) {
      // Silently fail for notifications - don't disrupt the dashboard
      console.error("Error fetching unread notifications:", err)
    }
  }


  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/vendor/orders/dashboard/stats`, {
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

  // Always show the full rupee amount (no K/L/Cr abbreviations) to match order detail payouts
  const formatCurrency = (amount: number) => {
    const normalized = Number.isFinite(amount) ? amount : 0
    return `₹${normalized.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`
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

  const fetchVendorProfile = async () => {
    try {
      const token = localStorage.getItem("vendorToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/vendor-auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const commissionValue = data.data?.vendor?.commission
        if (typeof commissionValue === "number") {
          setVendorCommission(commissionValue)
        } else {
          setVendorCommission(null)
        }
      }
    } catch (err) {
      console.error("Error fetching vendor profile:", err)
    }
  }

  const getCommissionRate = () => {
    if (typeof vendorCommission === "number") return vendorCommission
    return 0
  }

  const getPayoutBreakdown = (order: DashboardStats["recentOrders"][0]) => {
    const PAYMENT_GATEWAY_RATE = 2
    const commissionRate = getCommissionRate()
    // For dashboard orders, we need to estimate subtotal from total
    // Since we don't have subtotal, we'll use total as an approximation
    // In a real scenario, the API should provide subtotal
    const productTotal = order.total // This is an approximation
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

  const getCustomerName = (order: DashboardStats["recentOrders"][0]) => {
    if (typeof order.customerId === "object" && order.customerId !== null) {
      return order.customerId.name || "N/A"
    }
    return "N/A"
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="flex-none bg-gradient-to-r from-primary/20 via-primary/10 to-transparent backdrop-blur-xl shadow-lg safe-top" style={{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }} >
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Dashboard</h1>
              <p className="text-xs text-muted-foreground">Welcome back</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="flex-none bg-white shadow-md safe-top" style={{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }}>
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Dashboard</h1>
              <p className="text-xs text-muted-foreground">Welcome back</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="border-destructive/50 bg-destructive/10 w-full max-w-md rounded-3xl shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive flex-1">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchDashboardStats} className="ml-auto rounded-full">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!stats) return null

  const dashboardStats = [
    {
      title: "Total Amount Earned",
      value: formatCurrency(stats.totals.totalEarned || 0),
      change: "Delivered orders with closed return period",
      trend: stats.totals.totalEarned > 0 ? "up" : "down",
      href: "/orders?status=delivered",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: "bg-chart-2/10",
      iconColor: "text-chart-2",
    },
    {
      title: "Pending Amount",
      value: formatCurrency(stats.totals.pendingAmount || 0),
      change: "Orders to be delivered or waiting for return period to over",
      trend: stats.totals.pendingAmount > 0 ? "up" : "down",
      href: "/orders?status=shipped",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: "bg-chart-5/10",
      iconColor: "text-chart-5",
    },
    {
      title: "Paid Amount",
      value: formatCurrency(stats.totals.paidAmount || 0),
      change: "Marked paid in ledger",
      trend: stats.totals.paidAmount > 0 ? "up" : "down",
      href: "/orders",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      bgColor: "bg-chart-3/10",
      iconColor: "text-chart-3",
    },
    {
      title: "Balance Left",
      value: formatCurrency(stats.totals.balanceAmount || 0),
      change: "Remaining to be paid",
      trend: stats.totals.balanceAmount > 0 ? "up" : "down",
      href: "/orders",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      bgColor: "bg-chart-1/10",
      iconColor: "text-chart-1",
    },
    {
      title: "Total Orders",
      value: stats.totals.orders.toString(),
      change: `${stats.totals.delivered} delivered`,
      trend: "up",
      href: "/orders",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Processing",
      value: stats.totals.pending.toString(),
      change: `${stats.totals.shipped} shipped`,
      trend: stats.totals.pending > 0 ? "up" : "down",
      href: "/orders?status=processing",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      bgColor: "bg-chart-5/10",
      iconColor: "text-chart-5",
    },
  ]

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/10 via-primary/5 to-background">
      {/* Header - Fixed at top */}
      <div className="flex-none bg-white shadow-md safe-top" style={{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }}>
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 shadow-xl shadow-primary/40">
              <svg className="h-6 w-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Dashboard</h1>
              <p className="text-xs text-muted-foreground">Welcome back</p>
            </div>
          </div>
          <Link href="/notifications" className="relative">
            <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 transition-all hover:scale-105 shadow-lg border border-border/50">
              <svg className="h-5 w-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-destructive to-destructive/80 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 space-y-5" style={{ paddingBottom: `calc(7rem + env(safe-area-inset-bottom, 0px))` }}>
        {/* Vendor Status Notices */}
        {stats.vendorNotLinked && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
                  <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-orange-900 mb-1">Vendor Account Not Linked</h3>
                  <p className="text-xs text-orange-700">
                    Your account is not yet linked to a vendor profile. Please contact support to complete your vendor registration.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {stats.vendorNotApproved && stats.vendorStatus === "pending" && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-blue-900 mb-1">Vendor Account Pending Approval</h3>
                  <p className="text-xs text-blue-700">
                    Your vendor account is pending approval. Once approved by admin, you'll be able to view orders and manage your dashboard.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {stats.vendorNotApproved && stats.vendorStatus === "rejected" && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                  <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-red-900 mb-1">Vendor Account Rejected</h3>
                  <p className="text-xs text-red-700">
                    Your vendor account has been rejected. Please contact support for more information.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {stats.vendorNotApproved && stats.vendorStatus === "suspended" && (
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100">
                  <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-yellow-900 mb-1">Vendor Account Suspended</h3>
                  <p className="text-xs text-yellow-700">
                    Your vendor account has been suspended. Please contact support for more information.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Stats Grid - Modern curvy design */}
        <div className="grid grid-cols-2 gap-4">
          {dashboardStats.map((stat, index) => (
            <Link key={index} href={stat.href}>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-card/95 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-border/30">
                {/* Decorative gradient overlay */}
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20 ${stat.bgColor.replace('/10', '')}`}></div>
                <CardContent className="p-4 relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.bgColor} shadow-lg`}>
                      <span className={stat.iconColor}>{stat.icon}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground mb-2">{stat.value}</p>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${stat.trend === "up" ? "bg-chart-3/10 text-chart-3" : "bg-destructive/10 text-destructive"}`}
                    >
                      {stat.trend === "up" ? (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 11-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {stat.change}
                    </span>
                  </div>
                </CardContent>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 text-base font-bold text-foreground flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                name: "Reports",
                href: "/reports",
                icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
                highlighted: false,
                gradient: "from-chart-5/20 to-chart-5/10",
                iconColor: "text-chart-5",
              },
              {
                name: "Customers",
                href: "/customers",
                icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
                highlighted: true,
                gradient: "from-primary/30 to-primary/15",
                iconColor: "text-primary",
              },
            ].map((action, idx) => (
              <Link key={idx} href={action.href}>
                <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${action.gradient} border-2 ${action.highlighted ? "border-primary/30 shadow-xl" : "border-border/30 shadow-lg"} p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02]`}>
                  {/* Decorative circles */}
                  <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10 blur-xl"></div>
                  <div className="absolute -bottom-4 -left-4 w-12 h-12 rounded-full bg-white/5 blur-lg"></div>
                  <div className="relative z-10 flex flex-col items-center justify-center gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg`}>
                      <svg
                        className={`h-7 w-7 ${action.iconColor}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-foreground text-center">{action.name}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
    
      </div>

      <BottomNav />
    </div>
  )
}
