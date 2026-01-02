"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Check, Download } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { API_URL } from "@/lib/api-config"
import { useNavigation } from "@/contexts/navigation-context"
import { useNotificationSoundContext } from "@/contexts/notification-sound-context"
import { Capacitor } from "@capacitor/core"
import { Filesystem, Directory } from "@capacitor/filesystem"

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
  awbNumber?: string | null
  createdAt: string
}

export default function OrderDetailPage() {
  const router = useRouter()
  const { selectedOrderId } = useNavigation()
  const { stopSound } = useNotificationSoundContext()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [accepting, setAccepting] = useState(false)
  const [downloadingLabel, setDownloadingLabel] = useState(false)
  const [vendorCommission, setVendorCommission] = useState<number | null>(null)

  useEffect(() => {
    if (!selectedOrderId) {
      router.push("/orders")
      return
    }
    fetchOrderDetails(selectedOrderId)
    fetchVendorProfile()
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
      await stopSound(order._id, true)
      
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

  const maskPhoneNumber = (phone: string): string => {
    if (!phone || phone === "N/A") return "N/A"
    // Remove any non-digit characters (like country codes, spaces, etc.)
    const digits = phone.replace(/\D/g, "")
    if (digits.length === 0) return "N/A"
    // Show first digit, mask the rest
    const firstDigit = digits[0]
    const masked = "x".repeat(Math.max(0, digits.length - 1))
    return `${firstDigit}${masked}`
  }

  const getCustomerInfo = () => {
    if (!order) return { name: "N/A", mobile: "N/A", email: "N/A" }
    if (typeof order.customerId === "object" && order.customerId !== null) {
      const mobile = order.customerId.mobile || "N/A"
      return {
        name: order.customerId.name || "N/A",
        mobile: maskPhoneNumber(mobile),
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

  const getPayoutBreakdown = (order: Order) => {
    const PAYMENT_GATEWAY_RATE = 2
    const commissionRate = getCommissionRate()
    const productTotal = typeof order.subtotal === "number" ? order.subtotal : order.total
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

  const shouldShowPayout = (status: string) => {
    return ["processing", "shipped", "delivered"].includes(status)
  }

  const handleDownloadLabel = async () => {
    if (!order || !order.awbNumber) {
      alert("Order does not have an AWB number. Please create a shipment first.")
      return
    }

    try {
      setDownloadingLabel(true)
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/vendor/orders/${order._id}/label`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.message || "Failed to download shipping label")
        return
      }

      // Get the PDF blob
      const blob = await response.blob()
      const filename = `shipping-label-${order.orderNumber}-${order.awbNumber}.pdf`

      // Check if running in Capacitor native app
      if (Capacitor.isNativePlatform()) {
        try {
          const platform = Capacitor.getPlatform()
          
          // Convert blob to base64 for Filesystem API
          const reader = new FileReader()
          reader.onloadend = async () => {
            try {
              const base64Data = (reader.result as string).split(",")[1] // Remove data:application/pdf;base64, prefix
              
              // Use Documents directory - works on both Android and iOS
              // For PDF files, we write the base64 data directly
              await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Documents,
              })

              const folderName = platform === "android" 
                ? "Documents folder (accessible via file manager)" 
                : "Documents folder (accessible via Files app)"
              
              alert(`Shipping label saved successfully!\n\nFile: ${filename}\nLocation: ${folderName}`)
            } catch (filesystemError) {
              console.error("Error saving file with Filesystem API:", filesystemError)
              alert("Error saving file. Please check app permissions or try again.")
            } finally {
              setDownloadingLabel(false)
            }
          }
          
          reader.onerror = () => {
            console.error("Error reading blob")
            alert("Error processing file. Please try again.")
            setDownloadingLabel(false)
          }
          
          reader.readAsDataURL(blob)
        } catch (error) {
          console.error("Error in native download:", error)
          
          // Fallback: Try browser download method
          try {
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            alert("File download initiated")
          } catch (fallbackError) {
            console.error("Error with fallback download:", fallbackError)
            alert("Unable to save file. Please check app permissions or try again.")
          } finally {
            setDownloadingLabel(false)
          }
        }
      } else {
        // Use browser download for web
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setDownloadingLabel(false)
      }
    } catch (err) {
      console.error("Error downloading label:", err)
      alert("Network error. Please try again.")
      setDownloadingLabel(false)
    }
  }

  const canAccept = order && !order.vendorId && (order.status === "pending" || order.status === "confirmed")
  const isAssigned = order && order.vendorId
  const hasAWB = order && order.awbNumber

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
  const payout = order ? getPayoutBreakdown(order) : null

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
          {hasAWB && (
            <Button
              onClick={handleDownloadLabel}
              disabled={downloadingLabel}
              variant="outline"
              className="w-full h-10"
            >
              {downloadingLabel ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Shipping Label
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
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        {shouldShowPayout(order.status) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-chart-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h2 className="text-sm font-bold text-foreground">You Will Receive</h2>
                </div>
                {payout && (
                  <span className="text-2xl font-bold text-chart-3">
                    ₹{payout.netPayout.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

