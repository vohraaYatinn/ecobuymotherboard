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
    revenue: number
    avgOrderValue: number
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
}

export default function DashboardPage() {
  const router = useRouter()
  const { setSelectedOrderId } = useNavigation()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    fetchDashboardStats()
    fetchUnreadNotifications()
    
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
      }
    } catch (err) {
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

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`
    } else {
      return `₹${amount.toLocaleString("en-IN")}`
    }
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
    {
      title: "Revenue",
      value: formatCurrency(stats.totals.revenue),
      change: `${stats.totals.delivered} delivered`,
      trend: "up",
      href: "/orders?status=delivered",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      bgColor: "bg-chart-3/10",
      iconColor: "text-chart-3",
    },
    {
      title: "Avg. Value",
      value: formatCurrency(stats.totals.avgOrderValue),
      change: "per order",
      trend: "up",
      href: "/orders",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      bgColor: "bg-chart-2/10",
      iconColor: "text-chart-2",
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
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              Recent Orders
            </h2>
            <Link href="/orders">
              <button className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-all">
                View All
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </Link>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-card via-card to-card/95 shadow-xl border border-border/30 overflow-hidden">
            {stats.recentOrders.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30">
                  <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground font-medium">No recent orders</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {stats.recentOrders.map((order, index) => (
                  <button
                    key={order._id}
                    onClick={() => {
                      setSelectedOrderId(order._id)
                      router.push("/order-detail")
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-4 p-4 transition-all hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent cursor-pointer group">
                      <div
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:scale-110 ${
                          order.status === "delivered"
                            ? "bg-gradient-to-br from-chart-3/20 to-chart-3/10"
                            : order.status === "processing" || order.status === "shipped"
                              ? "bg-gradient-to-br from-primary/20 to-primary/10"
                              : "bg-gradient-to-br from-chart-5/20 to-chart-5/10"
                        }`}
                      >
                        <svg
                          className={`h-6 w-6 ${order.status === "delivered" ? "text-chart-3" : order.status === "processing" || order.status === "shipped" ? "text-primary" : "text-chart-5"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate mb-1">{getCustomerName(order)}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.orderNumber} • {formatTimeAgo(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-foreground mb-1">₹{order.total.toLocaleString("en-IN")}</p>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold ${
                            order.status === "delivered"
                              ? "bg-gradient-to-r from-chart-3/20 to-chart-3/10 text-chart-3"
                              : order.status === "processing" || order.status === "shipped"
                                ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary"
                                : "bg-gradient-to-r from-chart-5/20 to-chart-5/10 text-chart-5"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
