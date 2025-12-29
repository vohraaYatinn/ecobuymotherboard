"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle } from "lucide-react"
import { API_URL } from "@/lib/api-config"
import { useNavigation } from "@/contexts/navigation-context"

interface RecentOrder {
  _id: string
  orderNumber: string
  total: number
  status: string
  paymentStatus: string
  createdAt: string
}

interface Address {
  firstName?: string
  lastName?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  postcode?: string
}

interface Customer {
  _id: string
  name?: string
  email?: string
  mobile: string
  totalOrders: number
  totalSpent: number
  joinDate: string
  lastOrderDate: string | null
  address: Address | null
  recentOrders: RecentOrder[]
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const { selectedCustomerId, setSelectedOrderId } = useNavigation()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [vendorCommission, setVendorCommission] = useState<number | null>(null)

  useEffect(() => {
    if (!selectedCustomerId) {
      router.push("/customers")
      return
    }
    fetchCustomerDetails()
    fetchVendorProfile()
  }, [selectedCustomerId])

  const fetchCustomerDetails = async () => {
    if (!selectedCustomerId) return

    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/vendor/orders/customers/${selectedCustomerId}`, {
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
        setError(data.message || "Failed to load customer details")
        return
      }

      setCustomer(data.data)
    } catch (err) {
      console.error("Error fetching customer details:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`
    }
    return `₹${amount.toLocaleString("en-IN")}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatPhone = (mobile: string) => {
    if (mobile.length === 12 && mobile.startsWith("91")) {
      return `+91 ${mobile.slice(2, 7)} ${mobile.slice(7)}`
    }
    return mobile
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

  const getPayoutBreakdown = (order: RecentOrder) => {
    const PAYMENT_GATEWAY_RATE = 2
    const commissionRate = getCommissionRate()
    // For customer detail orders, we need to estimate subtotal from total
    // Since we don't have subtotal, we'll use total as an approximation
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

  const handleOrderClick = (orderId: string) => {
    setSelectedOrderId(orderId)
    router.push("/order-detail")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background" style={{ paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom, 0px))` }}>
        <div className="sticky top-0 z-10 border-b border-border/50 bg-card/95 backdrop-blur-sm safe-top" style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))` }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <svg className="h-4 w-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-base font-bold text-foreground">Customer Details</h1>
          </div>
        </div>
        <div className="px-4 py-6">
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchCustomerDetails} className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!customer) return null

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom, 0px))` }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-card/95 backdrop-blur-sm safe-top" style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))` }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <svg className="h-4 w-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">Customer Details</h1>
              <p className="text-xs text-muted-foreground leading-tight">
                Member since {formatDate(customer.joinDate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Customer Profile */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                {(customer.name || "N/A")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{customer.name || "N/A"}</h2>
                    <p className="text-sm text-muted-foreground">{customer.email || "N/A"}</p>
                  </div>
                  <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{customer.totalOrders}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 mb-3">
                <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(customer.totalSpent)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{customer.email || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">Email</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                  <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{formatPhone(customer.mobile)}</p>
                  <p className="text-xs text-muted-foreground">Phone</p>
                </div>
              </div>
              {customer.address && (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-3/10">
                    <svg className="h-5 w-5 text-chart-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {customer.address.address1 || "N/A"}
                      {customer.address.address2 && `, ${customer.address.address2}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {customer.address.city || "N/A"}, {customer.address.state || "N/A"}{" "}
                      {customer.address.postcode || ""}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
              <button className="text-xs font-medium text-primary hover:text-primary/80">View All</button>
            </div>
            <div className="space-y-3">
              {customer.recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent orders</p>
              ) : (
                customer.recentOrders.map((order) => {
                  const payout = getPayoutBreakdown(order)
                  return (
                    <button
                      key={order._id}
                      onClick={() => handleOrderClick(order._id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary p-3 hover:bg-secondary/80 transition-colors cursor-pointer">
                        <div>
                          <p className="text-sm font-medium text-foreground">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            ₹{payout.netPayout.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              order.status === "delivered"
                                ? "bg-green-100 text-green-800"
                                : order.status === "processing" || order.status === "shipped"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-accent/10 text-accent"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={() => (window.location.href = `tel:${customer.mobile}`)}
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            Call Customer
          </Button>
          {customer.email ? (
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => (window.location.href = `mailto:${customer.email}`)}
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Send Email
            </Button>
          ) : (
            <Button className="w-full bg-primary/50 hover:bg-primary/70" disabled>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              No Email
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}





























