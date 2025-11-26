"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Package, CheckCircle2, MapPin, Phone, Mail, ArrowLeft, Download } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

interface OrderItem {
  productId: {
    _id: string
    name: string
    brand: string
    images?: string[]
  }
  name: string
  brand: string
  quantity: number
  price: number
  image?: string
}

interface ShippingAddress {
  firstName: string
  lastName: string
  phone: string
  address1: string
  address2?: string
  city: string
  state: string
  postcode: string
  country: string
}

interface Order {
  _id: string
  orderNumber: string
  status: string
  total: number
  subtotal: number
  shipping: number
  items: OrderItem[]
  shippingAddress: ShippingAddress
  paymentMethod: string
  paymentStatus: string
  createdAt: string
  updatedAt: string
}

interface TrackingStep {
  status: string
  date: string
  completed: boolean
}

export function OrderDetailContent({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem("customerToken")
        if (!token) {
          router.push("/login")
          return
        }

        const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch order details")
        }

        const data = await response.json()
        if (data.success) {
          setOrder(data.data)
        } else {
          setError(data.message || "Order not found")
        }
      } catch (err: any) {
        console.error("Error fetching order:", err)
        setError(err.message || "Failed to load order details")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, router])

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

  const generateTrackingSteps = (order: Order): TrackingStep[] => {
    const steps: TrackingStep[] = []
    const statusOrder = ["pending", "confirmed", "processing", "shipped", "delivered"]
    const currentStatusIndex = statusOrder.indexOf(order.status.toLowerCase())

    const statusLabels: Record<string, string> = {
      pending: "Order Placed",
      confirmed: "Order Confirmed",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
    }

    statusOrder.forEach((status, index) => {
      const isCompleted = index <= currentStatusIndex
      const isCurrent = index === currentStatusIndex

      let date = ""
      if (isCompleted) {
        if (status === "pending") {
          date = new Date(order.createdAt).toLocaleString("en-IN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        } else if (status === "delivered" && order.status.toLowerCase() === "delivered") {
          date = new Date(order.updatedAt).toLocaleString("en-IN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        } else if (isCurrent) {
          date = "In progress"
        } else {
          date = "Completed"
        }
      } else {
        date = "Pending"
      }

      steps.push({
        status: statusLabels[status] || status,
        date,
        completed: isCompleted,
      })
    })

    return steps
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

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-md mx-auto text-center">
          <p className="text-destructive mb-4">{error || "Order not found"}</p>
          <Link href="/dashboard/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    )
  }

  const trackingSteps = generateTrackingSteps(order)
  const orderDate = new Date(order.createdAt)

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Back Button */}
      <Link href="/dashboard/orders">
        <Button variant="ghost" className="mb-4 text-xs sm:text-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>
      </Link>

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Order Details</h1>
          <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Download Invoice
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <p className="text-sm sm:text-base text-muted-foreground">
            Order Number: <span className="font-semibold text-foreground">{order.orderNumber}</span>
          </p>
          <Badge className={`${getStatusColor(order.status)} w-fit text-xs`}>
            {formatStatus(order.status)}
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Placed on {orderDate.toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          at {orderDate.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Order Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Order Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-6 sm:space-y-8">
                {trackingSteps.map((track, idx) => (
                  <div key={idx} className="relative flex gap-3 sm:gap-4">
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full ${
                          track.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {track.completed ? (
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-current" />
                        )}
                      </div>
                      {idx < trackingSteps.length - 1 && (
                        <div
                          className={`absolute top-10 h-full w-0.5 ${track.completed ? "bg-primary" : "bg-muted"}`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-6 sm:pb-8">
                      <p
                        className={`font-semibold text-sm sm:text-base ${track.completed ? "" : "text-muted-foreground"}`}
                      >
                        {track.status}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">{track.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex gap-3 sm:gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.image || (item.productId?.images && item.productId.images[0]) ? (
                      <Image
                        src={
                          item.image
                            ? `${API_URL}${item.image}`
                            : `${API_URL}${item.productId?.images?.[0]}`
                        }
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base line-clamp-2">{item.name}</p>
                    {item.brand && (
                      <p className="text-xs text-muted-foreground mt-1">{item.brand}</p>
                    )}
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm sm:text-base">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">₹{item.price.toLocaleString()} each</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">
                  {order.shipping === 0 ? "FREE" : `₹${order.shipping.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium uppercase">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Status</span>
                <Badge
                  variant={order.paymentStatus === "paid" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {formatStatus(order.paymentStatus)}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between text-base sm:text-lg font-bold">
                <span>Total</span>
                <span>₹{order.total.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.shippingAddress && typeof order.shippingAddress === "object" && "_id" in order.shippingAddress ? (
                <>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-semibold">
                        {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                      </p>
                      <p className="text-muted-foreground mt-1">{order.shippingAddress.address1}</p>
                      {order.shippingAddress.address2 && (
                        <p className="text-muted-foreground">{order.shippingAddress.address2}</p>
                      )}
                      <p className="text-muted-foreground">
                        {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postcode}
                      </p>
                      <p className="text-muted-foreground">{order.shippingAddress.country}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{order.shippingAddress.phone}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Address details loading...</p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <Link href="/dashboard/support">
                <Button variant="outline" className="w-full text-sm bg-transparent">
                  Contact Support
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full text-sm bg-transparent"
                disabled={order.status.toLowerCase() !== "delivered"}
              >
                Return Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
