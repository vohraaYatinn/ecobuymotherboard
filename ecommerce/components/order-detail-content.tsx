"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Package, CheckCircle2, MapPin, Phone, Mail, ArrowLeft, Download, Truck, AlertCircle, ExternalLink, XCircle, RotateCcw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.43:5000"

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

interface ReturnAttachment {
  url: string
  originalName?: string
  mimeType?: string
  size?: number
}

interface ReturnRequest {
  type: "pending" | "accepted" | "denied" | "completed" | null
  reason?: string
  requestedAt?: string
  reviewedAt?: string
  reviewedBy?: string
  adminNotes?: string
  refundStatus?: "pending" | "processing" | "completed" | "failed" | null
  refundTransactionId?: string
  attachments?: ReturnAttachment[]
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
  refundStatus?: "pending" | "processing" | "completed" | "failed" | null
  awbNumber?: string
  returnAwbNumber?: string
  dtdcTrackingData?: any
  trackingLastUpdated?: string
  invoiceNumber?: string
  cgst?: number
  sgst?: number
  igst?: number
  shippingState?: string
  returnRequest?: ReturnRequest
  deliveredAt?: string
  createdAt: string
  updatedAt: string
}

interface TrackingStep {
  status: string
  date: string
  completed: boolean
  isCancelled?: boolean
  isRejected?: boolean
}

export function OrderDetailContent({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [returnReason, setReturnReason] = useState("")
  const [returnAttachments, setReturnAttachments] = useState<File[]>([])
  const [submittingReturn, setSubmittingReturn] = useState(false)

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

  const getDTDCTrackingUrl = (awb: string) => {
    // DTDC tracking URL format
    return `https://www.dtdc.com/track-your-shipment/?awb=${encodeURIComponent(awb)}`
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-500"
      case "picked_up":
      case "picked up":
        return "bg-violet-500"
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
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  /**
   * Infer a more granular forward-shipment stage from DTDC tracking text.
   * This lets us show Processing -> Picked Up -> Shipped progression even if
   * the backend order.status is only "shipped".
   */
  const inferForwardStageFromDtdc = (order: Order): "picked_up" | "shipped" | "delivered" | null => {
    const statusText = String(order.dtdcTrackingData?.statusText || "").toLowerCase()
    if (!statusText) return null

    if (statusText.includes("delivered") || statusText.includes("delivery completed")) {
      return "delivered"
    }
    if (
      statusText.includes("out for delivery") ||
      statusText.includes("in transit") ||
      statusText.includes("dispatched") ||
      statusText.includes("arrived at")
    ) {
      return "shipped"
    }
    if (
      statusText.includes("picked up") ||
      statusText.includes("pickup completed") ||
      statusText.includes("pickup done")
    ) {
      return "picked_up"
    }

    return null
  }

  const getEffectiveOrderStatus = (order: Order): string => {
    const s = (order.status || "").toLowerCase()
    // Keep special flows as-is
    if (s === "cancelled" || s.startsWith("return_") || s === "admin_review_required") return s

    const inferred = inferForwardStageFromDtdc(order)
    if (inferred) return inferred
    return s
  }

  const handleReturnFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 5) {
      alert("You can upload up to 5 files for a return request.")
      event.target.value = ""
      return
    }

    const hasOversize = files.some((file) => file.size > 25 * 1024 * 1024)
    if (hasOversize) {
      alert("Each file must be 25MB or smaller.")
      event.target.value = ""
      return
    }

    setReturnAttachments(files)
  }

  const generateTrackingSteps = (order: Order): TrackingStep[] => {
    const steps: TrackingStep[] = []
    const orderStatus = order.status.toLowerCase()
    const effectiveStatus = getEffectiveOrderStatus(order)
    const isPaymentPending = order.paymentStatus?.toLowerCase() === "pending"

    // Handle cancelled orders
    if (orderStatus === "cancelled") {
      steps.push({
        status: isPaymentPending ? "Awaiting Payment" : "Order Placed",
        date: new Date(order.createdAt).toLocaleString("en-IN", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        completed: true,
      })
      steps.push({
        status: "Cancelled",
        date: new Date(order.updatedAt).toLocaleString("en-IN", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        completed: true,
        isCancelled: true,
      })
      return steps
    }

    // Handle return flow
    if (order.returnRequest && order.returnRequest.type) {
      const returnType = order.returnRequest.type
      const isReturnAccepted = returnType === "accepted" || orderStatus === "return_accepted"
      const isReturnRejected = returnType === "denied" || orderStatus === "return_rejected"
      const isReturnPickedUp = orderStatus === "return_picked_up"
      const isRefunded = order.refundStatus === "completed" || 
                        order.returnRequest.refundStatus === "completed" ||
                        order.paymentStatus === "refunded"

      // Show order progression up to delivered
      const normalStatusOrder = ["pending", "confirmed", "processing", "shipped", "delivered"]
      const deliveredIndex = normalStatusOrder.indexOf("delivered")
      
      normalStatusOrder.forEach((status, index) => {
        steps.push({
          status: status === "pending" ? (isPaymentPending ? "Awaiting Payment" : "Order Placed") :
                  status === "confirmed" ? "Order Confirmed" :
                  status === "processing" ? "Processing" :
                  status === "shipped" ? "Shipped" : "Delivered",
          date: index === 0 
            ? new Date(order.createdAt).toLocaleString("en-IN", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : index === deliveredIndex && order.deliveredAt
            ? new Date(order.deliveredAt).toLocaleString("en-IN", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Completed",
          completed: true,
        })
      })

      // Return Requested
      steps.push({
        status: "Return Requested",
        date: order.returnRequest.requestedAt
          ? new Date(order.returnRequest.requestedAt).toLocaleString("en-IN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Pending",
        completed: true,
      })

      // Return Accepted or Rejected
      if (isReturnAccepted) {
        steps.push({
          status: "Return Accepted",
          date: order.returnRequest.reviewedAt
            ? new Date(order.returnRequest.reviewedAt).toLocaleString("en-IN", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Pending",
          completed: true,
        })

        // Return Pickup Pending (only if not picked up yet)
        if (!isReturnPickedUp) {
          steps.push({
            status: "Return Pickup Pending",
            date: "Pending",
            completed: false,
          })
        } else {
          // Picked Up
          steps.push({
            status: "Picked Up",
            date: new Date(order.updatedAt).toLocaleString("en-IN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            completed: true,
          })

          // Refunded Successfully (only if refunded)
          if (isRefunded) {
            steps.push({
              status: "Refunded Successfully",
              date: "Completed",
              completed: true,
            })
          } else {
            steps.push({
              status: "Refund Pending",
              date: "In progress",
              completed: false,
            })
          }
        }
      } else if (isReturnRejected) {
        steps.push({
          status: "Return Rejected",
          date: order.returnRequest.reviewedAt
            ? new Date(order.returnRequest.reviewedAt).toLocaleString("en-IN", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Pending",
          completed: true,
          isRejected: true,
        })
      } else {
        // Return request is pending
        steps.push({
          status: "Return Under Review",
          date: "Pending",
          completed: false,
        })
      }

      return steps
    }

    // Normal order flow (no cancellation, no return)
    const statusOrder = ["pending", "confirmed", "processing", "picked_up", "shipped", "delivered"]
    const currentStatusIndex = Math.max(statusOrder.indexOf(effectiveStatus), statusOrder.indexOf(orderStatus))

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
        } else if (status === "delivered" && orderStatus === "delivered" && order.deliveredAt) {
          date = new Date(order.deliveredAt).toLocaleString("en-IN", {
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
        status: status === "pending" ? (isPaymentPending ? "Awaiting Payment" : "Order Placed") :
                status === "confirmed" ? "Order Confirmed" :
                status === "processing" ? "Processing" :
                status === "picked_up" ? "Picked Up" :
                status === "shipped" ? "Shipped" : "Delivered",
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
  const effectiveStatusForBadge = getEffectiveOrderStatus(order)

  // Check if order can be cancelled
  const isPaymentPending = order.paymentStatus?.toLowerCase() === "pending"
  const canCancel = ["pending", "confirmed", "processing"].includes(order.status.toLowerCase()) && !isPaymentPending
  const isShipped = order.status.toLowerCase() === "shipped" || order.status.toLowerCase() === "delivered"

  const handleCancelOrder = async () => {
    if (!canCancel || isShipped) {
      return
    }

    if (!confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
      return
    }

    setCancelling(true)
    try {
      const token = localStorage.getItem("customerToken")
      if (!token) {
        alert("Please login to cancel order")
        return
      }

      const response = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel order")
      }

      if (data.success) {
        // Refresh order data
        const orderResponse = await fetch(`${API_URL}/api/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (orderResponse.ok) {
          const orderData = await orderResponse.json()
          if (orderData.success) {
            setOrder(orderData.data)
          }
        }

        alert(
          data.data.refund
            ? "Order cancelled successfully. Refund has been initiated and will be processed shortly."
            : data.data.refundError
              ? "Order cancelled. However, refund failed. Please contact support."
              : "Order cancelled successfully."
        )
      }
    } catch (err: any) {
      console.error("Error cancelling order:", err)
      alert(err.message || "Failed to cancel order. Please try again.")
    } finally {
      setCancelling(false)
    }
  }

  const handleReturnRequest = async () => {
    if (!returnReason.trim()) {
      alert("Please provide a reason for return")
      return
    }

    setSubmittingReturn(true)
    try {
      const token = localStorage.getItem("customerToken")
      if (!token) {
        alert("Please login to request return")
        return
      }

      const formData = new FormData()
      formData.append("reason", returnReason.trim())
      returnAttachments.forEach((file) => formData.append("attachments", file))

      const response = await fetch(`${API_URL}/api/orders/${orderId}/return`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit return request")
      }

      if (data.success) {
        // Refresh order data
        const orderResponse = await fetch(`${API_URL}/api/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (orderResponse.ok) {
          const orderData = await orderResponse.json()
          if (orderData.success) {
            setOrder(orderData.data)
          }
        }

        setReturnDialogOpen(false)
        setReturnReason("")
        setReturnAttachments([])
        alert("Return request submitted successfully. Our team will review it shortly.")
      }
    } catch (err: any) {
      console.error("Error submitting return request:", err)
      alert(err.message || "Failed to submit return request. Please try again.")
    } finally {
      setSubmittingReturn(false)
    }
  }

  const isDelivered = order?.status.toLowerCase() === "delivered"
  const hasReturnRequest = order?.returnRequest && order.returnRequest.type
  const returnStatus = order?.returnRequest?.type
  const deliveredAt = isDelivered
    ? order?.deliveredAt
      ? new Date(order.deliveredAt)
      : new Date(order.updatedAt)
    : null
  const returnDeadline = deliveredAt
    ? new Date(deliveredAt.getTime() + 3 * 24 * 60 * 60 * 1000)
    : null
  const isReturnWindowOpen =
    isDelivered && returnDeadline ? Date.now() <= returnDeadline.getTime() : false
  const returnDeadlineText = returnDeadline
    ? returnDeadline.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""
  
  // Check if invoice is available (3 days after delivery)
  const invoiceAvailable = deliveredAt
    ? Date.now() >= deliveredAt.getTime() + 3 * 24 * 60 * 60 * 1000
    : false

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
          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-xs sm:text-sm bg-transparent"
              disabled={!invoiceAvailable}
              onClick={async () => {
                if (!invoiceAvailable) return
                
                try {
                  const token = localStorage.getItem("customerToken")
                  if (!token) {
                    alert("Please login to download invoice")
                    return
                  }

                  const response = await fetch(`${API_URL}/api/invoices/${orderId}/download`, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  })

                  if (!response.ok) {
                    throw new Error("Failed to download invoice")
                  }

                  const blob = await response.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `Invoice_${order?.invoiceNumber || order?.orderNumber || "invoice"}.pdf`
                  document.body.appendChild(a)
                  a.click()
                  window.URL.revokeObjectURL(url)
                  document.body.removeChild(a)
                } catch (err) {
                  console.error("Error downloading invoice:", err)
                  alert("Failed to download invoice. Please try again.")
                }
              }}
              title={!invoiceAvailable ? "Invoice will be available when return period gets over" : "Download Invoice"}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Invoice
            </Button>
            {!invoiceAvailable && isDelivered && (
              <p className="text-xs text-muted-foreground text-center sm:text-left">
                Invoice will be available when return period gets over
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <p className="text-sm sm:text-base text-muted-foreground">
            Order Number: <span className="font-semibold text-foreground">{order.orderNumber}</span>
          </p>
          <Badge className={`${getStatusColor(effectiveStatusForBadge)} w-fit text-xs`}>
            {formatStatus(effectiveStatusForBadge)}
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
                {trackingSteps.map((track, idx) => {
                  const isCancelledStep = track.isCancelled
                  const isRejectedStep = track.isRejected
                  const iconColorClass = isCancelledStep || isRejectedStep 
                    ? "bg-red-500 text-white" 
                    : track.completed 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  
                  return (
                    <div key={idx} className="relative flex gap-3 sm:gap-4">
                      <div className="relative flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full ${iconColorClass}`}
                        >
                          {track.completed ? (
                            isCancelledStep || isRejectedStep ? (
                              <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            )
                          ) : (
                            <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-current" />
                          )}
                        </div>
                        {idx < trackingSteps.length - 1 && (
                          <div
                            className={`absolute top-10 h-full w-0.5 ${
                              isCancelledStep || isRejectedStep 
                                ? "bg-red-500" 
                                : track.completed 
                                  ? "bg-primary" 
                                  : "bg-muted"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pb-6 sm:pb-8">
                        <p
                          className={`font-semibold text-sm sm:text-base ${
                            isCancelledStep || isRejectedStep 
                              ? "text-red-600 dark:text-red-400" 
                              : track.completed 
                                ? "" 
                                : "text-muted-foreground"
                          }`}
                        >
                          {track.status}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">{track.date}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* DTDC Tracking Information */}
          {order.awbNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipment Tracking (DTDC)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">AWB Number</Label>
                    <p className="text-sm font-medium mt-1">{order.awbNumber}</p>
                  </div>
                  <a
                    href={getDTDCTrackingUrl(order.awbNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Track on DTDC Website
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {/* DTDC Return (Reverse Pickup) Tracking Information */}
          {order.returnAwbNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Return Pickup Tracking (DTDC)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Return AWB Number</Label>
                    <p className="text-sm font-medium mt-1">{order.returnAwbNumber}</p>
                  </div>
                  <a
                    href={getDTDCTrackingUrl(order.returnAwbNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Track Return on DTDC Website
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

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
              
              {/* GST Breakdown */}
              {order.cgst !== undefined || order.igst !== undefined ? (
                <>
                  <Separator />
                  {order.cgst && order.sgst ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">CGST (9%)</span>
                        <span className="font-medium">₹{order.cgst.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">SGST (9%)</span>
                        <span className="font-medium">₹{order.sgst.toLocaleString()}</span>
                      </div>
                    </>
                  ) : order.igst ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IGST (18%)</span>
                      <span className="font-medium">₹{order.igst.toLocaleString()}</span>
                    </div>
                  ) : null}
                </>
              ) : null}
              
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
              {canCancel && !isShipped && (
                <Button
                  variant="destructive"
                  className="w-full text-sm"
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel Order
                    </>
                  )}
                </Button>
              )}
              {isShipped && (
                <Alert className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    This order cannot be cancelled as it has been shipped.
                  </AlertDescription>
                </Alert>
              )}
              <Link href="/dashboard/support">
                <Button variant="outline" className="w-full text-sm bg-transparent">
                  Contact Support
                </Button>
              </Link>
              
              {/* Return Request Section */}
              {isDelivered && (
                <>
                  {!hasReturnRequest ? (
                    <div className="space-y-1">
                      <Dialog
                        open={returnDialogOpen}
                        onOpenChange={(open) => {
                          setReturnDialogOpen(open)
                          if (!open) {
                            setReturnReason("")
                            setReturnAttachments([])
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full text-sm bg-transparent"
                            disabled={!isReturnWindowOpen}
                            title={
                              isReturnWindowOpen
                                ? "Request a return"
                                : "Order cannot be return return window is over"
                            }
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Request Return
                          </Button>
                        </DialogTrigger>
                        {isReturnWindowOpen && (
                        <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Request Return</DialogTitle>
                          <DialogDescription>
                            Please provide a reason for returning this order. Our team will review your request.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="returnReason">Return Reason *</Label>
                            <Textarea
                              id="returnReason"
                              placeholder="Please explain why you want to return this order..."
                              value={returnReason}
                              onChange={(e) => setReturnReason(e.target.value)}
                              rows={5}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="returnAttachments">Photos / Videos / Documents (optional)</Label>
                            <Input
                              id="returnAttachments"
                              type="file"
                              multiple
                              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                              className="mt-2"
                              onChange={handleReturnFilesChange}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              You can add up to 5 files, 25MB each.
                            </p>
                            {returnAttachments.length > 0 && (
                              <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                                {returnAttachments.map((file) => (
                                  <li key={`${file.name}-${file.lastModified}`}>
                                    {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setReturnDialogOpen(false)
                                setReturnReason("")
                                setReturnAttachments([])
                              }}
                              disabled={submittingReturn}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleReturnRequest}
                              disabled={submittingReturn || !returnReason.trim()}
                            >
                              {submittingReturn ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                "Submit Request"
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                      )}
                    </Dialog>
                    {!isReturnWindowOpen && (
                      <p className="text-xs text-muted-foreground text-center">
                        Order cannot be return return window is over
                      </p>
                    )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Alert className={returnStatus === "accepted" ? "border-green-500" : returnStatus === "denied" ? "border-red-500" : "border-yellow-500"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <div className="font-semibold mb-1">
                            Return Request: {returnStatus === "pending" ? "Under Review" : returnStatus === "accepted" ? "Accepted" : "Denied"}
                          </div>
                          {order.returnRequest?.reason && (
                            <div className="mb-1">
                              <span className="font-medium">Your reason:</span> {order.returnRequest.reason}
                            </div>
                          )}
                          {order.returnRequest?.adminNotes && (
                            <div className="mt-1">
                              <span className="font-medium">Admin response:</span> {order.returnRequest.adminNotes}
                            </div>
                          )}
                          {returnStatus === "accepted" && order.returnRequest?.refundStatus === "completed" && (
                            <div className="mt-1 text-green-600">
                              Refund has been processed.
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
