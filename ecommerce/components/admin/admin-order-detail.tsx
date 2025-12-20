"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Package, User, CreditCard, Truck, Loader2, AlertCircle, MapPin, Download, ExternalLink, RotateCcw, CheckCircle, XCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

interface OrderItem {
  name: string
  quantity: number
  price: number
  productId?: {
    _id: string
    name: string
    brand?: string
    sku?: string
    images?: string[]
    category?: string
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

interface Vendor {
  _id: string
  name: string
  email?: string
  phone?: string
  address?: {
    city?: string
    state?: string
  }
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
  reviewedBy?: string | { _id: string; name: string; email: string }
  adminNotes?: string
  refundStatus?: "pending" | "processing" | "completed" | "failed" | null
  refundTransactionId?: string
  attachments?: ReturnAttachment[]
}

interface Order {
  _id: string
  orderNumber: string
  customerId: Customer | string
  shippingAddress: ShippingAddress | string
  vendorId?: Vendor | string | null
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  cgst?: number
  sgst?: number
  igst?: number
  status: string
  paymentMethod: string
  paymentStatus: string
  awbNumber?: string
  returnRequest?: ReturnRequest
  createdAt: string
  updatedAt: string
}

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedVendor, setSelectedVendor] = useState("")
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [awbNumber, setAwbNumber] = useState("")
  const [awbSaving, setAwbSaving] = useState(false)
  const [returnActionLoading, setReturnActionLoading] = useState(false)
  const [returnAdminNotes, setReturnAdminNotes] = useState("")

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    const mb = bytes / 1024 / 1024
    if (mb >= 1) return `${mb.toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  const getFileUrl = (url: string) => {
    if (!url) return ""
    return url.startsWith("http") ? url : `${API_URL}${url}`
  }

  useEffect(() => {
    fetchOrder()
    fetchVendors()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("adminToken")
      if (!token) {
        setError("Not authenticated. Please login again.")
        setLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // Try to parse error message
        let errorMessage = "Failed to load order"
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || `Error ${response.status}`
        }
        setError(errorMessage)
        setLoading(false)
        return
      }

      const data = await response.json()

      if (!data.success) {
        setError(data.message || "Failed to load order")
        setLoading(false)
        return
      }

      setOrder(data.data)
      setSelectedStatus(data.data.status)
      setAwbNumber(data.data.awbNumber || "")
      if (data.data.vendorId && typeof data.data.vendorId === "object") {
        setSelectedVendor(data.data.vendorId._id)
      }
    } catch (err) {
      console.error("Error fetching order:", err)
      const errorMessage = err instanceof Error ? err.message : "Network error. Please check your connection and try again."
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/admin/vendors?status=approved`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setVendors(data.data || [])
      }
    } catch (err) {
      console.error("Error fetching vendors:", err)
    }
  }

  const handleSave = async () => {
    if (!order) return

    try {
      setSaving(true)
      const token = localStorage.getItem("adminToken")
      if (!token) return

      // Update status
      if (selectedStatus !== order.status) {
        const statusResponse = await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: selectedStatus }),
        })
        
        if (!statusResponse.ok) {
          const errorData = await statusResponse.json()
          throw new Error(errorData.message || "Failed to update status")
        }
      }

      // Assign vendor if changed
      const currentVendorId = typeof order.vendorId === "object" && order.vendorId ? order.vendorId._id : order.vendorId
      if (selectedVendor !== currentVendorId) {
        const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/assign-vendor`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ vendorId: selectedVendor || null }),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to assign vendor")
        }
      }

      // Refresh order data
      await fetchOrder()
      alert("Order updated successfully!")
    } catch (err) {
      console.error("Error saving order:", err)
      alert("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAWB = async () => {
    if (!order || !awbNumber.trim()) {
      alert("Please enter a valid AWB number")
      return
    }

    // Validate AWB format (1 alphabet + 8 digits)
    const cleanAWB = awbNumber.trim().toUpperCase()
    if (!/^[A-Z]\d{8}$/.test(cleanAWB)) {
      alert("Invalid AWB number format. Expected format: 1 alphabet followed by 8 digits (e.g., V01197967)")
      return
    }

    try {
      setAwbSaving(true)
      const token = localStorage.getItem("adminToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/dtdc/order/${orderId}/awb`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ awbNumber: cleanAWB }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update AWB number")
      }

      await fetchOrder()
      alert("AWB number updated successfully!")
    } catch (err) {
      console.error("Error saving AWB:", err)
      alert(err instanceof Error ? err.message : "Failed to save AWB number")
    } finally {
      setAwbSaving(false)
    }
  }

  const getDTDCTrackingUrl = (awb: string) => {
    // DTDC tracking URL format
    return `https://www.dtdc.com/track-your-shipment/?awb=${encodeURIComponent(awb)}`
  }

  // Helper functions to get data
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

  const getShippingAddress = () => {
    if (!order) return null
    if (typeof order.shippingAddress === "object" && order.shippingAddress !== null) {
      return order.shippingAddress
    }
    return null
  }

  const getVendorInfo = () => {
    if (!order || !order.vendorId) return null
    if (typeof order.vendorId === "object" && order.vendorId !== null) {
      return order.vendorId
    }
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "processing":
        return "bg-purple-100 text-purple-800"
      case "shipped":
        return "bg-indigo-100 text-indigo-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "return_requested":
        return "bg-orange-100 text-orange-800"
      case "return_accepted":
        return "bg-green-100 text-green-800"
      case "return_rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleAcceptReturn = async () => {
    if (!order) return

    setReturnActionLoading(true)
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        alert("Please login again")
        return
      }

      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/return/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminNotes: returnAdminNotes.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setReturnAdminNotes("")
        await fetchOrder()
        alert("Return request accepted successfully")
      } else {
        alert(data.message || "Failed to accept return request")
      }
    } catch (error) {
      console.error("Error accepting return request:", error)
      alert("Network error. Please try again.")
    } finally {
      setReturnActionLoading(false)
    }
  }

  const handleDenyReturn = async () => {
    if (!order) return

    if (!returnAdminNotes.trim()) {
      alert("Please provide a reason for denying the return request")
      return
    }

    setReturnActionLoading(true)
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        alert("Please login again")
        return
      }

      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/return/deny`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminNotes: returnAdminNotes.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setReturnAdminNotes("")
        await fetchOrder()
        alert("Return request denied successfully")
      } else {
        alert(data.message || "Failed to deny return request")
      }
    } catch (error) {
      console.error("Error denying return request:", error)
      alert("Network error. Please try again.")
    } finally {
      setReturnActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Order Details</h1>
        </div>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">{error || "Order not found"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const customer = getCustomerInfo()
  const shippingAddress = getShippingAddress()
  const vendor = getVendorInfo()

  // GST & payout helpers
  const gstTotal = (order.cgst || 0) + (order.sgst || 0) + (order.igst || 0)
  const isIntraState = (order.cgst || 0) > 0 || (order.sgst || 0) > 0
  const shippingCgst = isIntraState ? order.shipping * 0.09 : 0
  const shippingSgst = isIntraState ? order.shipping * 0.09 : 0
  const shippingIgst = !isIntraState ? order.shipping * 0.18 : 0
  const platformCommission = order.subtotal * 0.2
  const payoutBeforeGateway = order.subtotal * 0.8
  const paymentGatewayCharges = order.total * 0.02
  const netVendorPayout = payoutBeforeGateway - paymentGatewayCharges

  const isReturnRequested = order.status === "return_requested" && order.returnRequest && order.returnRequest.type === "pending"

  return (
    <div className="space-y-6">
      {/* Return Request Alert - Show at top if return is requested */}
      {isReturnRequested && (
        <Alert className="border-orange-500 bg-orange-50">
          <RotateCcw className="h-5 w-5 text-orange-600" />
          <AlertDescription>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Return Requested</h3>
                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <Label className="text-sm font-medium text-muted-foreground">Customer Reason:</Label>
                  <p className="mt-1 text-sm">{order.returnRequest.reason}</p>
                  {order.returnRequest.requestedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Requested on: {new Date(order.returnRequest.requestedAt).toLocaleString("en-IN")}
                    </p>
                  )}
                  {order.returnRequest.attachments && order.returnRequest.attachments.length > 0 && (
                    <div className="mt-3">
                      <Label className="text-xs font-medium text-muted-foreground">Customer Uploads:</Label>
                      <ul className="mt-1 space-y-1 text-sm">
                        {order.returnRequest.attachments.map((file, idx) => (
                          <li key={`${file.url}-${idx}`} className="flex items-center justify-between gap-2">
                            <a
                              href={getFileUrl(file.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline"
                            >
                              {file.originalName || file.url?.split("/").pop()}
                            </a>
                            <span className="text-xs text-muted-foreground">
                              {(file.mimeType?.split("/")?.[0] || "file").toUpperCase()} {formatFileSize(file.size)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="returnAdminNotes" className="text-sm font-medium">
                  Admin Notes {order.returnRequest.type === "pending" && "(Required for rejection)"}
                </Label>
                <Textarea
                  id="returnAdminNotes"
                  placeholder="Add notes about your decision..."
                  value={returnAdminNotes}
                  onChange={(e) => setReturnAdminNotes(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleAcceptReturn}
                  disabled={returnActionLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {returnActionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Return
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDenyReturn}
                  disabled={returnActionLoading}
                  variant="destructive"
                  className="flex-1"
                >
                  {returnActionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Return
                    </>
                  )}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Return Status Alert - Show if return was already processed */}
      {order.returnRequest && order.returnRequest.type && order.returnRequest.type !== "pending" && (
        <Alert
          className={
            order.returnRequest.type === "accepted"
              ? "border-green-500 bg-green-50"
              : "border-red-500 bg-red-50"
          }
        >
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>
            <div>
              <h3 className="font-semibold mb-2">
                Return {order.returnRequest.type === "accepted" ? "Accepted" : "Rejected"}
              </h3>
              {order.returnRequest.reason && (
                <div className="mb-2">
                  <span className="font-medium text-sm">Customer Reason:</span>
                  <p className="text-sm mt-1">{order.returnRequest.reason}</p>
                </div>
              )}
              {order.returnRequest.attachments && order.returnRequest.attachments.length > 0 && (
                <div className="mb-2">
                  <span className="font-medium text-sm">Customer Uploads:</span>
                  <ul className="mt-1 space-y-1 text-sm">
                    {order.returnRequest.attachments.map((file, idx) => (
                      <li key={`${file.url}-${idx}`} className="flex items-center justify-between gap-2">
                        <a
                          href={getFileUrl(file.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {file.originalName || file.url?.split("/").pop()}
                        </a>
                        <span className="text-xs text-muted-foreground">
                          {(file.mimeType?.split("/")?.[0] || "file").toUpperCase()} {formatFileSize(file.size)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {order.returnRequest.adminNotes && (
                <div className="mb-2">
                  <span className="font-medium text-sm">Admin Notes:</span>
                  <p className="text-sm mt-1">{order.returnRequest.adminNotes}</p>
                </div>
              )}
              {order.returnRequest.reviewedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Reviewed on: {new Date(order.returnRequest.reviewedAt).toLocaleString("en-IN")}
                </p>
              )}
              {order.returnRequest.type === "accepted" && order.returnRequest.refundStatus && (
                <div className="mt-2">
                  <span className="font-medium text-sm">Refund Status:</span>
                  <Badge
                    variant={order.returnRequest.refundStatus === "completed" ? "default" : "secondary"}
                    className="ml-2"
                  >
                    {order.returnRequest.refundStatus}
                  </Badge>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Order placed on {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
            </p>
          </div>
        </div>
        <Badge className={`${getStatusColor(order.status)} w-fit capitalize`}>
          {order.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Order Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Customer Name</Label>
              <p className="mt-1.5 text-sm font-medium">{customer.name}</p>
            </div>
            <div>
              <Label>Contact Number</Label>
              <p className="mt-1.5 text-sm font-medium">{customer.mobile}</p>
            </div>
            {customer.email !== "N/A" && (
              <div>
                <Label>Email</Label>
                <p className="mt-1.5 text-sm font-medium">{customer.email}</p>
              </div>
            )}
            <div>
              <Label>Delivery Address</Label>
              {shippingAddress ? (
                <p className="mt-1.5 text-sm">
                  {shippingAddress.firstName} {shippingAddress.lastName}
                  <br />
                  {shippingAddress.address1}
                  {shippingAddress.address2 && <><br />{shippingAddress.address2}</>}
                  <br />
                  {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postcode}
                  <br />
                  Phone: {shippingAddress.phone}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">No address available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item, index) => {
              const product = item.productId
              return (
                <div key={index} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex gap-3">
                    {product?.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0].startsWith("http") ? product.images[0] : `${API_URL}${product.images[0]}`}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover bg-muted"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {product?.brand && <p className="text-xs text-muted-foreground">Brand: {product.brand}</p>}
                      {product?.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
                      <div className="flex justify-between mt-1">
                        <span className="text-sm">Qty: {item.quantity}</span>
                        <span className="text-sm font-medium">₹{item.price.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Payment Method</Label>
              <p className="mt-1.5 text-sm font-medium capitalize">
                {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod}
              </p>
            </div>
            <div>
              <Label>Payment Status</Label>
              <Badge className={`mt-1.5 capitalize ${order.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                {order.paymentStatus}
              </Badge>
            </div>
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{order.subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>₹{order.shipping.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Shipping GST {isIntraState ? "(CGST + SGST @ 9%)" : "(IGST @ 18%)"}
                </span>
                <span>
                  ₹
                  {isIntraState
                    ? (shippingCgst + shippingSgst).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : shippingIgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST on Order</span>
                <span>
                  ₹
                  {gstTotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-green-600">₹{order.total.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Payout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Vendor Payout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product Total</span>
              <span>₹{order.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Commission (20%)</span>
              <span>- ₹{platformCommission.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-medium pt-1">
              <span>Payout before Gateway</span>
              <span>₹{payoutBeforeGateway.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Gateway Charges (~2% of order total)</span>
              <span>- ₹{paymentGatewayCharges.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Net Payout to Vendor</span>
              <span>₹{netVendorPayout.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="assignedSeller">Assigned Vendor</Label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger id="assignedSeller" className="mt-1.5">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vendor && (
                <p className="text-xs text-muted-foreground mt-1">
                  Currently: {vendor.name}
                  {vendor.address && ` (${vendor.address.city}, ${vendor.address.state})`}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="orderStatus">Order Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="orderStatus" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="return_requested">Return Requested</SelectItem>
                  <SelectItem value="return_accepted">Return Accepted</SelectItem>
                  <SelectItem value="return_rejected">Return Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="awbNumber">AWB Number (DTDC)</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="awbNumber"
                  placeholder="e.g., V01197967"
                  value={awbNumber}
                  onChange={(e) => setAwbNumber(e.target.value.toUpperCase())}
                  maxLength={9}
                  className="flex-1"
                />
                <Button
                  onClick={handleSaveAWB}
                  disabled={awbSaving || !awbNumber.trim()}
                  size="sm"
                >
                  {awbSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
              {order.awbNumber && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Current: {order.awbNumber}
                  </p>
                  <a
                    href={getDTDCTrackingUrl(order.awbNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Track on DTDC Website
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Order Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Order Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <div className="h-3 w-3 rounded-full bg-green-600" />
                </div>
                <div className="h-full w-0.5 bg-border" />
              </div>
              <div className="flex-1 pb-8">
                <p className="font-medium">Order Placed</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
                </p>
              </div>
            </div>
            {order.status !== "pending" && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${order.status === "cancelled" ? "bg-red-100" : "bg-blue-100"}`}>
                    <div className={`h-3 w-3 rounded-full ${order.status === "cancelled" ? "bg-red-600" : "bg-blue-600"}`} />
                  </div>
                  {["processing", "shipped", "delivered"].includes(order.status) && (
                    <div className="h-full w-0.5 bg-border" />
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <p className="font-medium capitalize">{order.status === "cancelled" ? "Order Cancelled" : order.status}</p>
                  <p className="text-sm text-muted-foreground">
                    Updated on {formatDate(order.updatedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center gap-3">
        <Button
          variant="outline"
          onClick={async () => {
            try {
              const token = localStorage.getItem("adminToken")
              if (!token) {
                alert("Please login to download invoice")
                return
              }

              const response = await fetch(`${API_URL}/api/invoices/${orderId}/download/admin`, {
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
        >
          <Download className="h-4 w-4 mr-2" />
          Download Invoice
        </Button>
        
        <div className="flex gap-3">
          <Link href="/admin/orders">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button className="gap-2" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}



