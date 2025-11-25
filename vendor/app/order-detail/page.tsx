"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, AlertCircle, Check } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { API_URL } from "@/lib/api-config"
import { useNavigation } from "@/contexts/navigation-context"
import { useNotificationSoundContext } from "@/contexts/notification-sound-context"

interface OrderItem {
  name: string
  quantity: number
  price: number
  image?: string
  productId?: {
    _id: string
    name: string
    brand?: string
    images?: string[]
  }
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
}

interface Customer {
  _id: string
  name?: string
  mobile?: string
  email?: string
}

interface Order {
  _id: string
  orderNumber: string
  customerId: Customer | string
  items: OrderItem[]
  shippingAddress: ShippingAddress | string
  total: number
  subtotal: number
  shipping: number
  status: string
  vendorId?: string | null
  assignmentMode?: string | null
  createdAt: string
}

export default function OrderDetailPage() {
  const router = useRouter()
  const { selectedOrderId } = useNavigation()
  const { stopSound } = useNotificationSoundContext()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!selectedOrderId) {
      router.push("/orders")
      return
    }
    fetchOrderDetails(selectedOrderId)
  }, [selectedOrderId])

  const fetchOrderDetails = async (id: string) => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      // Try to fetch as assigned order first
      let response = await fetch(`${API_URL}/api/vendor/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // If not found as assigned, try to fetch from unassigned orders
      if (!response.ok) {
        response = await fetch(`${API_URL}/api/vendor/orders/unassigned`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const foundOrder = data.data.find((o: Order) => o._id === id)
            if (foundOrder) {
              setOrder(foundOrder)
              setLoading(false)
              return
            }
          }
        }
      } else {
        const data = await response.json()
        if (data.success) {
          setOrder(data.data)
          setLoading(false)
          return
        }
      }

      setError("Order not found")
    } catch (err) {
      console.error("Error fetching order:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!order) return

    try {
      setAccepting(true)
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/vendor/orders/${order._id}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
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
        alert(data.message || "Failed to accept order")
        return
      }

      // Stop sound for accepted order
      stopSound(order._id, true)
      
      alert("Order accepted successfully!")
      // Refresh order data
      fetchOrderDetails(order._id)
    } catch (err) {
      console.error("Error accepting order:", err)
      alert("Network error. Please try again.")
    } finally {
      setAccepting(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return

    try {
      setUpdatingStatus(true)
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/vendor/orders/${order._id}/status`, {
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

      // Update local state
      setOrder({ ...order, status: newStatus })
      alert("Status updated successfully!")
    } catch (err) {
      console.error("Error updating status:", err)
      alert("Network error. Please try again.")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getCustomerInfo = () => {
    if (!order) return { name: "N/A", mobile: "N/A", email: "N/A" }
    if (typeof order.customerId === "object" && order.customerId !== null) {
      return {
        name: order.customerId.name || "N/A",
        mobile: order.customerId.mobile || "N/A",
        email: order.customerId.email || "N/A",
      }
    }
    return { name: "N/A", mobile: "N/A", email: "N/A" }
  }

  const getAddressInfo = () => {
    if (!order) return "Address not available"
    if (typeof order.shippingAddress === "object" && order.shippingAddress !== null) {
      const addr = order.shippingAddress
      return `${addr.address1}${addr.address2 ? `, ${addr.address2}` : ""}, ${addr.city}, ${addr.state} ${addr.postcode}`
    }
    return "Address not available"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const canAccept = order && !order.vendorId && (order.status === "pending" || order.status === "confirmed")
  const isAssigned = order && order.vendorId

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" style={{ paddingBottom: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background" style={{ paddingBottom: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}>
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
            <h1 className="text-base font-bold text-foreground">Order Details</h1>
          </div>
        </div>
        <div className="px-4 py-8">
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">{error || "Order not found"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    )
  }

  const customer = getCustomerInfo()
  const address = getAddressInfo()

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}>
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
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-foreground leading-tight">{order.orderNumber}</h1>
              <p className="text-xs text-muted-foreground leading-tight">
                {formatDate(order.createdAt)} • {formatTime(order.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-3 space-y-2">
          {isAssigned && (
            <div className="w-full">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Order Status
              </label>
              <Select
                value={order.status}
                onValueChange={handleStatusUpdate}
                disabled={updatingStatus}
              >
                <SelectTrigger className="w-full h-10 bg-muted/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {order.status === "processing" && <SelectItem value="shipped">Shipped</SelectItem>}
                  {order.status === "shipped" && <SelectItem value="delivered">Delivered</SelectItem>}
                  {order.status === "delivered" && <SelectItem value="delivered">Delivered</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}
          {canAccept && (
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Accept Order
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Customer Info */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-bold text-foreground mb-3">Customer Information</h2>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Name</p>
                <p className="text-sm font-medium text-foreground">{customer.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Phone</p>
                <p className="text-sm font-medium text-foreground">{customer.mobile}</p>
              </div>
              {customer.email !== "N/A" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="text-sm font-medium text-foreground">{customer.email}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-bold text-foreground mb-3">Shipping Address</h2>
            <p className="text-sm text-foreground">{address}</p>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-bold text-foreground mb-3">Order Items</h2>
            <div className="space-y-3">
              {order.items.map((item, index) => {
                // Get image from item.image or productId.images[0]
                const getImageUrl = () => {
                  let imagePath = null
                  
                  // Check item.image first
                  if (item.image) {
                    imagePath = item.image
                  }
                  // Then check productId.images
                  else if (item.productId?.images && item.productId.images.length > 0) {
                    imagePath = item.productId.images[0]
                  }
                  
                  if (!imagePath) return null
                  
                  // If image is already a full URL (http/https), use it as is
                  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                    return imagePath
                  }
                  
                  // If image starts with /, it's a relative path from API root
                  if (imagePath.startsWith('/')) {
                    return `${API_URL}${imagePath}`
                  }
                  
                  // Otherwise, assume it's relative to uploads
                  return `${API_URL}/uploads/${imagePath}`
                }

                const imageUrl = getImageUrl()

                return (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover bg-muted"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          e.currentTarget.style.display = 'none'
                          const placeholder = e.currentTarget.nextElementSibling as HTMLElement
                          if (placeholder) placeholder.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div
                      className={`h-16 w-16 rounded-lg bg-muted flex items-center justify-center ${imageUrl ? 'hidden' : 'flex'}`}
                    >
                      <svg
                        className="h-8 w-8 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Qty: {item.quantity} × ₹{item.price.toLocaleString("en-IN")}
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-1">
                        ₹{(item.quantity * item.price).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="text-sm font-bold text-foreground mb-3">Order Summary</h2>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">₹{order.subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium text-foreground">₹{order.shipping.toLocaleString("en-IN")}</span>
            </div>
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-base font-bold text-primary">₹{order.total.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}

