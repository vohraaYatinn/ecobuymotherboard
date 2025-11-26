"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { ChevronDown, ChevronUp, Check, Loader2, AlertCircle, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { API_URL } from "@/lib/api-config"
import { useNotificationSoundContext } from "@/contexts/notification-sound-context"

interface OrderItem {
  name: string
  quantity: number
  price: number
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
  mobile: string
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
  createdAt: string
}

export default function AcceptOrdersPage() {
  const router = useRouter()
  const { startSound, stopSound, stopAllSounds, isPlaying } = useNotificationSoundContext()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({})
  const [previousOrderIds, setPreviousOrderIds] = useState<Set<string>>(new Set())
  const [soundPlaying, setSoundPlaying] = useState(false)

  useEffect(() => {
    fetchUnassignedOrders()
    // Poll for new orders every 10 seconds
    const interval = setInterval(() => {
      fetchUnassignedOrders()
    }, 10000)
    
    // Check sound status periodically
    const soundCheckInterval = setInterval(async () => {
      const playing = await isPlaying()
      setSoundPlaying(playing)
    }, 500)
    
    return () => {
      clearInterval(interval)
      clearInterval(soundCheckInterval)
    }
  }, [isPlaying])

  const fetchUnassignedOrders = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/vendor/orders/unassigned`, {
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
        setError(data.message || "Failed to load orders")
        return
      }

      const newOrders = data.data || []
      setOrders(newOrders)

      // Check for orders that were removed (accepted by someone else or cancelled)
      const currentOrderIds = new Set(newOrders.map((o: Order) => o._id))
      const removedOrderIds = Array.from(previousOrderIds).filter(id => !currentOrderIds.has(id))
      
      // Stop sound for removed orders
      for (const orderId of removedOrderIds) {
        await stopSound(orderId)
      }
      
      setPreviousOrderIds(currentOrderIds)
    } catch (err) {
      console.error("Error fetching orders:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (orderId: string) => {
    try {
      setAcceptingOrderId(orderId)
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/vendor/orders/${orderId}/accept`, {
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
      await stopSound(orderId, true)
      
      // Remove accepted order from list
      setOrders((prev) => prev.filter((order) => order._id !== orderId))
      setPreviousOrderIds((prev) => {
        const updated = new Set(prev)
        updated.delete(orderId)
        return updated
      })
      alert("Order accepted successfully!")
    } catch (err) {
      console.error("Error accepting order:", err)
      alert("Network error. Please try again.")
    } finally {
      setAcceptingOrderId(null)
    }
  }

  const getCustomerInfo = (order: Order) => {
    if (typeof order.customerId === "object" && order.customerId !== null) {
      return {
        name: order.customerId.name || "N/A",
        mobile: order.customerId.mobile || "N/A",
      }
    }
    return { name: "N/A", mobile: "N/A" }
  }

  const getAddressInfo = (order: Order) => {
    if (typeof order.shippingAddress === "object" && order.shippingAddress !== null) {
      const addr = order.shippingAddress
      return `${addr.address1}${addr.address2 ? `, ${addr.address2}` : ""}, ${addr.city}, ${addr.state} ${addr.postcode}`
    }
    return "Address not available"
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  }

  const toggleItems = (orderId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }))
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="sticky top-0 z-10 border-b-2 border-border/50 bg-card/98 backdrop-blur-xl shadow-sm safe-top" style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Accept Orders</h1>
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

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="sticky top-0 z-10 border-b-2 border-border/50 bg-card/98 backdrop-blur-xl shadow-sm safe-top" style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))` }}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Accept Orders</h1>
            <div className="flex items-center gap-2">
              {soundPlaying ? (
                <button
                  onClick={async () => {
                    await stopAllSounds()
                    setSoundPlaying(false)
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors animate-pulse"
                  title="Stop notification sound"
                >
                  <VolumeX className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-semibold text-destructive">Stop</span>
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await startSound('test', 'Test Alert', 'Testing notification sound')
                    setSoundPlaying(true)
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                  title="Test notification sound"
                >
                  <Volume2 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">Test</span>
                </button>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold text-primary">{orders.length} pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}>
        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUnassignedOrders}
                  className="ml-auto"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {orders.length === 0 && !error && (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No unassigned orders available</p>
            </CardContent>
          </Card>
        )}

        {orders.map((order, index) => {
          const customer = getCustomerInfo(order)
          const address = getAddressInfo(order)
          const timeAgo = formatTimeAgo(order.createdAt)
          const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

          return (
            <Card
              key={order._id}
              className="border-2 border-border/50 bg-card shadow-lg hover:shadow-xl transition-shadow"
              style={{
                animation: `slideUp 0.3s ease-out ${index * 0.1}s both`,
              }}
            >
              <CardContent className="p-4">
                {/* Order ID & Time */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{order.orderNumber}</h2>
                    <p className="text-xs text-muted-foreground">Received {timeAgo}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-3 p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-white font-bold text-sm shadow-md">
                      {customer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.mobile}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg
                      className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
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
                    <p className="text-xs text-foreground">{address}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="rounded-lg bg-primary/5 overflow-hidden border border-primary/10">
                    <button
                      onClick={() => toggleItems(order._id)}
                      className="w-full flex items-center justify-between p-2.5 hover:bg-primary/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-foreground">Items</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">{itemCount} items</span>
                        {expandedItems[order._id] ? (
                          <ChevronUp className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </button>

                    {expandedItems[order._id] && (
                      <div className="px-2.5 pb-2.5 space-y-1.5 animate-in slide-in-from-top-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-md bg-background/50 border border-border/30"
                          >
                            <span className="text-xs text-foreground">{item.name}</span>
                            <span className="text-xs font-semibold text-primary">Qty: {item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Order Value */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-chart-3/5 border border-chart-3/20">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-chart-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-foreground">Order Value</span>
                    </div>
                    <span className="text-lg font-bold text-chart-3">₹{order.total.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleAccept(order._id)}
                  disabled={acceptingOrderId === order._id}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {acceptingOrderId === order._id ? (
                    <>
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                      <span className="text-base font-bold text-white">Accepting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5 text-white" strokeWidth={3} />
                      <span className="text-base font-bold text-white">Accept Order</span>
                    </>
                  )}
                </button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <BottomNav />

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
