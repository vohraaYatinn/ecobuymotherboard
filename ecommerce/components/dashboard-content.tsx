"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Settings,
  LogOut,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  HeadphonesIcon,
} from "lucide-react"

export function DashboardContent() {
  const recentOrders = [
    {
      id: "ORD-2024-001",
      date: "Jan 15, 2024",
      status: "Delivered",
      total: "Rs. 3,450.00",
      items: 2,
    },
    {
      id: "ORD-2024-002",
      date: "Jan 20, 2024",
      status: "In Transit",
      total: "Rs. 5,670.00",
      items: 1,
    },
    {
      id: "ORD-2024-003",
      date: "Jan 22, 2024",
      status: "Processing",
      total: "Rs. 2,340.00",
      items: 3,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-500"
      case "In Transit":
        return "bg-blue-500"
      case "Processing":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
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
                  <CardTitle className="text-base sm:text-lg">John Doe</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">+91 98765 43210</CardDescription>
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
              <Link href="/dashboard/support">
                <Button variant="ghost" className="w-full justify-start text-sm sm:text-base h-10 sm:h-11">
                  <HeadphonesIcon className="mr-2 h-4 w-4" />
                  Support
                </Button>
              </Link>
              <Link href="/dashboard/settings">
                <Button variant="ghost" className="w-full justify-start text-sm sm:text-base h-10 sm:h-11">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive text-sm sm:text-base h-10 sm:h-11"
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
                    <p className="text-xl sm:text-2xl font-bold">12</p>
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
                    <p className="text-xl sm:text-2xl font-bold">2</p>
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
                    <p className="text-xl sm:text-2xl font-bold">3</p>
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
                    <p className="text-xl sm:text-2xl font-bold">7</p>
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
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    className="block rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm sm:text-base">{order.id}</p>
                          <Badge className={`${getStatusColor(order.status)} text-xs`}>{order.status}</Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {order.date} • {order.items} item{order.items > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-bold text-sm sm:text-base">{order.total}</p>
                        <p className="text-xs text-primary hover:underline">View Details →</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
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
