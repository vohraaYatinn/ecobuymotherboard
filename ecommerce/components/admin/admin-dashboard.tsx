"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Users, ShoppingBag, TrendingUp, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.safartax.com"

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
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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
