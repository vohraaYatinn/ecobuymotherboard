"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Package, MapPin, Loader2, Sparkles } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.safartax.com"

interface OrderItem {
  productId: string
  name: string
  brand: string
  quantity: number
  price: number
  image: string
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
  items: OrderItem[]
  shippingAddress: ShippingAddress
  subtotal: number
  shipping: number
  total: number
  status: string
  paymentMethod: string
  paymentStatus: string
  paymentGateway?: string
  paymentTransactionId?: string
  createdAt: string
}

export function OrderConfirmationContent({ orderId }: { orderId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAnimation, setShowAnimation] = useState(true)
  const [checkingPayment, setCheckingPayment] = useState(false)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        // Validate order ID format (MongoDB ObjectId is 24 hex characters)
        if (!orderId || orderId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(orderId)) {
          setError("Invalid order ID format")
          setLoading(false)
          setShowAnimation(false)
          return
        }

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

        const data = await response.json()
        
        if (!response.ok) {
          console.error("Order fetch error:", {
            status: response.status,
            statusText: response.statusText,
            data
          })
          throw new Error(data.message || `HTTP error! status: ${response.status}`)
        }

        if (data.success && data.data) {
          console.log("Order fetched successfully:", data.data)
          setOrder(data.data)
          if (data.data.paymentStatus === "paid") {
            setTimeout(() => setShowAnimation(false), 3000)
          } else {
            setShowAnimation(false)
          }
        } else {
          console.error("Order fetch failed:", data)
          setError(data.message || "Failed to load order details")
          setShowAnimation(false)
        }
      } catch (err: any) {
        console.error("Error fetching order:", err)
        setError(err.message || "Network error. Please try again.")
        setShowAnimation(false)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, router])

  const verifyPaymentStatus = async () => {
    try {
      setCheckingPayment(true)
      const token = localStorage.getItem("customerToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/orders/razorpay/status/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success && data.data?.order) {
        setOrder(data.data.order)
        if (data.data.order.paymentStatus === "paid") {
          setShowAnimation(false)
        }
      } else {
        setError(data.message || "Unable to verify payment status.")
      }
    } catch (err: any) {
      console.error("Error verifying payment status:", err)
      setError("Payment verification failed. Please contact support with your transaction ID.")
    } finally {
      setCheckingPayment(false)
    }
  }

  useEffect(() => {
    if (!order) return
    if (order.paymentStatus === "paid" || checkingPayment) return
    verifyPaymentStatus()
  }, [order?.paymentStatus, checkingPayment])

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-6">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-muted-foreground mb-2">{error || "The order you're looking for doesn't exist."}</p>
          <p className="text-sm text-muted-foreground mb-8">Order ID: {orderId}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button>Go to Home</Button>
            </Link>
            <Link href="/dashboard/orders">
              <Button variant="outline">View My Orders</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const paymentComplete = order.paymentStatus === "paid"

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto">
        {!paymentComplete && (
          <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {order.paymentStatus === "failed"
              ? "Your payment could not be confirmed. If amount is debited, please contact support with the transaction ID below."
              : checkingPayment
                ? "Verifying payment with Razorpay. This may take a few seconds..."
                : "Payment is pending. If you completed payment, please wait while we confirm with Razorpay."}
          </div>
        )}

        {/* Animated Success Message */}
        <div className="text-center mb-8 relative">
          {showAnimation && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-2xl p-8 max-w-md mx-4 animate-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center">
                  {/* Animated Check Circle */}
                  <div className="relative mb-6">
                    <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in-95 duration-500">
                      <CheckCircle className="h-16 w-16 text-green-600 animate-in zoom-in-95 duration-700" />
                    </div>
                    {/* Sparkles Animation */}
                    <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
                    <Sparkles className="h-5 w-5 text-yellow-400 absolute -bottom-1 -left-1 animate-pulse delay-300" />
                    <Sparkles className="h-4 w-4 text-yellow-400 absolute top-1/2 -left-3 animate-pulse delay-700" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
                    Order Confirmed!
                  </h2>
                  <p className="text-muted-foreground mb-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000">
                    Your order has been placed successfully
                  </p>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-full animate-progress" style={{ animation: "progress 3s linear forwards" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Message (shown after animation) */}
          <div className={`transition-opacity duration-500 ${showAnimation ? "opacity-0" : "opacity-100"}`}>
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in-95 duration-500">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">{paymentComplete ? "Payment Confirmed!" : "Order Created"}</h1>
            <p className="text-muted-foreground">
              {paymentComplete
                ? "Thank you for your purchase. We've received your order."
                : "We have your order. Please complete/confirm the PhonePe payment to proceed."}
            </p>
          </div>
        </div>

        {/* Order Details */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="text-xl font-bold">{order.orderNumber}</p>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Order Date</p>
                <p className="font-medium">{new Date(order.createdAt).toLocaleDateString("en-IN", { 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Payment Method</p>
                <p className="font-medium uppercase">{order.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Payment Status</p>
                <p className="font-medium uppercase">{order.paymentStatus}</p>
                {order.paymentTransactionId && (
                  <p className="text-xs text-muted-foreground break-all">Txn ID: {order.paymentTransactionId}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </h2>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={item.image ? `${API_URL}${item.image}` : "/placeholder.svg"}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{item.brand}</p>
                    <p className="font-medium mb-1">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{item.price * item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Address
            </h2>
            <div className="space-y-1">
              {order.shippingAddress && typeof order.shippingAddress === "object" && "_id" in order.shippingAddress ? (
                <>
                  <p className="font-medium">
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{order.shippingAddress.phone}</p>
                  <p className="text-sm">
                    {order.shippingAddress.address1}
                    {order.shippingAddress.address2 && `, ${order.shippingAddress.address2}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postcode}
                  </p>
                  <p className="text-sm text-muted-foreground">{order.shippingAddress.country}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Address details loading...</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">₹{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-semibold">{order.shipping === 0 ? "FREE" : `₹${order.shipping}`}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">₹{order.total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              Continue Shopping
            </Button>
          </Link>
          <Link href="/dashboard/orders" className="flex-1">
            <Button className="w-full">
              View My Orders
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

