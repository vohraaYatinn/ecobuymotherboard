"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  LogOut,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  HeadphonesIcon,
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.safartax.com"

interface Order {
  _id: string
  orderNumber: string
  status: string
  total: number
  items: Array<{ quantity: number }>
  createdAt: string
}

interface Customer {
  _id: string
  name: string
  mobile: string
  email?: string
}

interface OrderStats {
  total: number
  pending: number
  processing: number
  shipped: number
  delivered: number
  cancelled: number
}

export function DashboardContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("customerToken")
        if (!token) {
          router.push("/login")
          return
        }

        // Fetch customer profile
        const customerRes = await fetch(`${API_URL}/api/customer-auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!customerRes.ok) {
          throw new Error("Failed to fetch customer profile")
        }

        const customerData = await customerRes.json()
        if (customerData.success) {
          setCustomer(customerData.data)
        }

        // Fetch order stats
        const statsRes = await fetch(`${API_URL}/api/orders/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          if (statsData.success) {
            setStats(statsData.data)
          }
        }

        // Fetch recent orders
        const ordersRes = await fetch(`${API_URL}/api/orders?limit=3`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json()
          if (ordersData.success) {
            setRecentOrders(ordersData.data)
          }
        }
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err)
        setError(err.message || "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("customerToken")
    localStorage.removeItem("customerData")
    window.dispatchEvent(new Event("auth-change"))
    router.push("/")
    router.refresh()
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-500"
      case "shipped":
        return "bg-blue-500"
      case "processing":
        return "bg-yellow-500"
      case "pending":
        return "bg-gray-500"
      case "cancelled":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatStatus = (status: string) => {
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-md mx-auto text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => router.push("/login")}>Go to Login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Welcome back! Manage your account and orders</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">
                    {customer?.name || "Customer"}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {customer?.mobile ? `+${customer.mobile}` : "No phone number"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full justify-start text-sm sm:text-base h-10 sm:h-11">
                  <User className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/orders">
                <Button variant="ghost" className="w-full justify-start text-sm sm:text-base h-10 sm:h-11">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  My Orders
                </Button>
              </Link>
              <Link href="/wishlist">
                <Button variant="ghost" className="w-full justify-start text-sm sm:text-base h-10 sm:h-11">
                  <Heart className="mr-2 h-4 w-4" />
                  Wishlist
                </Button>
              </Link>
              <Link href="/dashboard/addresses">
                <Button variant="ghost" className="w-full justify-start text-sm sm:text-base h-10 sm:h-11">
                  <MapPin className="mr-2 h-4 w-4" />
                  Addresses
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive text-sm sm:text-base h-10 sm:h-11"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-blue-500/10">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats?.total || 0}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-yellow-500/10">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats?.pending || 0}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-orange-500/10">
                    <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats?.shipped || 0}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Shipping</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats?.delivered || 0}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Delivered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Recent Orders</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Your latest order history</CardDescription>
                </div>
                <Link href="/dashboard/orders">
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm w-full sm:w-auto bg-transparent">
                    View All Orders
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No orders yet</p>
                  <Link href="/products">
                    <Button variant="outline">Start Shopping</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => {
                    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
                    return (
                      <Link
                        key={order._id}
                        href={`/dashboard/orders/${order._id}`}
                        className="block rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm sm:text-base">{order.orderNumber}</p>
                              <Badge className={`${getStatusColor(order.status)} text-xs`}>
                                {formatStatus(order.status)}
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              • {itemCount} item{itemCount > 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-bold text-sm sm:text-base">₹{order.total.toLocaleString()}</p>
                            <p className="text-xs text-primary hover:underline">View Details →</p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/dashboard/support">
                  <Button variant="outline" className="w-full h-auto py-4 justify-start bg-transparent">
                    <HeadphonesIcon className="mr-2 h-5 w-5" />
                    <div className="text-left">
                      <p className="font-semibold text-sm">Customer Support</p>
                      <p className="text-xs text-muted-foreground">Get help with your orders</p>
                    </div>
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full h-auto py-4 justify-start bg-transparent">
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    <div className="text-left">
                      <p className="font-semibold text-sm">Continue Shopping</p>
                      <p className="text-xs text-muted-foreground">Browse our products</p>
                    </div>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
