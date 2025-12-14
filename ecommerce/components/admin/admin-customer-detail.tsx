"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ShoppingBag,
  TrendingUp,
  Loader2,
  AlertCircle,
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.35:5000"

interface Address {
  _id: string
  type: string
  firstName: string
  lastName: string
  phone: string
  address1: string
  address2?: string
  city: string
  state: string
  postcode: string
  country?: string
  isDefault?: boolean
}

interface RecentOrder {
  _id: string
  orderNumber: string
  total: number
  status: string
  paymentStatus: string
  createdAt: string
}

interface CustomerDetail {
  _id: string
  name?: string
  email?: string
  mobile: string
  isActive?: boolean
  createdAt?: string
  lastLoginAt?: string
  totalOrders: number
  totalSpent: number
  addresses?: Address[]
  recentOrders?: RecentOrder[]
}

export function AdminCustomerDetail({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCustomer()
  }, [customerId])

  const fetchCustomer = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("adminToken")
      if (!token) {
        setError("Not authenticated. Please login again.")
        setLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/api/admin/customers/${customerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load customer")
      }

      setCustomer(data.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error. Please try again."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN")}`

  const formatDate = (value?: string) => {
    if (!value) return "N/A"
    return new Date(value).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatDateTime = (value?: string) => {
    if (!value) return "N/A"
    return new Date(value).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatPhone = (mobile: string) => {
    if (mobile.length === 12 && mobile.startsWith("91")) {
      return `+91 ${mobile.slice(2, 7)} ${mobile.slice(7)}`
    }
    return mobile
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800"
      case "processing":
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Customer Details</h1>
        </div>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">{error || "Customer not found"}</p>
              <Button variant="outline" size="sm" className="ml-auto" onClick={fetchCustomer}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const addresses = customer.addresses || []
  const recentOrders = customer.recentOrders || []
  const customerCode = `CUST${customer._id.slice(-6).toUpperCase()}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Customer Details</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {customerCode} • {customer._id}
            </p>
          </div>
          <Badge className={customer.isActive === false ? "bg-gray-100 text-gray-800" : "bg-green-100 text-green-800"}>
            {customer.isActive === false ? "Inactive" : "Active"}
          </Badge>
        </div>
      </div>

      {/* Customer Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="text-base font-medium mt-1">{customer.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </p>
                <p className="text-base font-medium mt-1">{customer.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </p>
                <p className="text-base font-medium mt-1">{formatPhone(customer.mobile)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Member Since
                </p>
                <p className="text-base font-medium mt-1">{formatDate(customer.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Last Login
                </p>
                <p className="text-base font-medium mt-1">{formatDateTime(customer.lastLoginAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="h-4 w-4" />
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{customer.totalOrders ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(customer.totalSpent || 0)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Addresses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Saved Addresses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved addresses.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div key={addr._id} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium capitalize">{addr.type || "home"}</h4>
                      <p className="text-sm text-muted-foreground">
                        {addr.firstName} {addr.lastName}
                        <br />
                        {formatPhone(addr.phone)}
                      </p>
                    </div>
                    {addr.isDefault && (
                      <Badge variant="outline" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {addr.address1}
                    {addr.address2 ? (
                      <>
                        <br />
                        {addr.address2}
                      </>
                    ) : null}
                    <br />
                    {addr.city}, {addr.state}
                    <br />
                    {addr.postcode}
                    <br />
                    {addr.country || "India"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders found for this customer.</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order._id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border last:border-0"
                >
                  <div>
                    <Link href={`/admin/orders/${order._id}`}>
                      <p className="font-medium hover:text-primary">{order.orderNumber}</p>
                    </Link>
                    <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold">{formatCurrency(order.total)}</p>
                    <Badge className={getStatusBadgeClass(order.status)}>{order.status}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {order.paymentStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
