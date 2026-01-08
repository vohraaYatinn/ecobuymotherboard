"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCart } from "@/lib/cart-context"
import { MapPin, Plus, Loader2, Check, CheckCircle, Sparkles, Clock } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.safartax.com"

// All Indian States and Union Territories
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
]

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
  country: string
  isDefault: boolean
}

declare global {
  interface Window {
    Razorpay?: any
  }
}

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not available"))
      return
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existingScript) {
      resolve(true)
      return
    }

    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"))
    document.body.appendChild(script)
  })

export function CheckoutContent() {
  const router = useRouter()
  const { cartItems, loading: cartLoading } = useCart()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>("")
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fetchingAddresses, setFetchingAddresses] = useState(true)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [shippingCharges, setShippingCharges] = useState<number>(150)
  const [fetchingShippingCharges, setFetchingShippingCharges] = useState(true)

  // Form state for new address
  const [formData, setFormData] = useState({
    type: "home",
    firstName: "",
    lastName: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postcode: "",
    country: "India",
    isDefault: false,
  })

  useEffect(() => {
    const token = localStorage.getItem("customerToken")
    if (!token) {
      router.push("/login")
      return
    }

    fetchAddresses()
    fetchShippingCharges()
  }, [router])

  const fetchShippingCharges = async () => {
    try {
      setFetchingShippingCharges(true)
      const response = await fetch(`${API_URL}/api/settings/shipping-charges`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch shipping charges")
      }

      const data = await response.json()
      if (data.success && data.data) {
        setShippingCharges(data.data.shippingCharges || 150)
      }
    } catch (error) {
      console.error("Error fetching shipping charges:", error)
      // Keep default value of 150 if fetch fails
      setShippingCharges(150)
    } finally {
      setFetchingShippingCharges(false)
    }
  }

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem("customerToken")
      const response = await fetch(`${API_URL}/api/addresses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setAddresses(data.data)
        // Select default address if available
        const defaultAddress = data.data.find((addr: Address) => addr.isDefault)
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress._id)
        } else if (data.data.length > 0) {
          setSelectedAddressId(data.data[0]._id)
        }
      }
    } catch (err) {
      console.error("Error fetching addresses:", err)
    } finally {
      setFetchingAddresses(false)
    }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("customerToken")
      const response = await fetch(`${API_URL}/api/addresses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (data.success) {
        await fetchAddresses()
        setSelectedAddressId(data.data._id)
        setShowAddAddress(false)
        setFormData({
          type: "home",
          firstName: "",
          lastName: "",
          phone: "",
          address1: "",
          address2: "",
          city: "",
          state: "",
          postcode: "",
          country: "India",
          isDefault: false,
        })
      } else {
        setError(data.message || "Failed to add address")
      }
    } catch (err) {
      console.error("Error adding address:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const verifyPaymentOnBackend = async (payload: {
    orderId: string
    razorpayOrderId: string
    razorpayPaymentId: string
    razorpaySignature: string
  }) => {
    // Show verification overlay immediately
    setVerifyingPayment(true)
    setError("")
    
    try {
      const token = localStorage.getItem("customerToken")
      if (!token) {
        setVerifyingPayment(false)
        setError("Please log in again to verify your payment.")
        return
      }

      const response = await fetch(`${API_URL}/api/orders/razorpay/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        // Hide verification overlay and show success animation
        setVerifyingPayment(false)
        setShowSuccessAnimation(true)
        setTimeout(() => {
          router.push(`/order-confirmation/${payload.orderId}?payment=razorpay&txn=${payload.razorpayPaymentId}`)
        }, 1500)
      } else {
        setVerifyingPayment(false)
        setError(data.message || "Unable to confirm payment. Please contact support.")
      }
    } catch (err) {
      console.error("Error verifying payment:", err)
      setVerifyingPayment(false)
      setError("Payment verification failed. Please contact support with your payment ID.")
    }
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError("Please select or add a delivery address")
      return
    }

    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("customerToken")
      const response = await fetch(`${API_URL}/api/orders/razorpay/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          addressId: selectedAddressId,
        }),
      })

      const data = await response.json()

      if (data.success && data.data?.razorpayOrderId) {
        const selectedAddress = addresses.find((addr) => addr._id === selectedAddressId)

        await loadRazorpayScript()

        if (!window.Razorpay) {
          throw new Error("Razorpay SDK not available")
        }

        const razorpay = new window.Razorpay({
          key: data.data.keyId,
          amount: data.data.amount,
          currency: data.data.currency || "INR",
          name: "Elecobuy",
          description: `Order ${data.data.orderNumber}`,
          order_id: data.data.razorpayOrderId,
          prefill: {
            name: selectedAddress
              ? `${selectedAddress.firstName} ${selectedAddress.lastName}`.trim()
              : data.data.customer?.name,
            contact: selectedAddress?.phone || data.data.customer?.contact,
          },
          notes: {
            orderId: data.data.orderId,
            orderNumber: data.data.orderNumber,
          },
          handler: async (response: {
            razorpay_payment_id: string
            razorpay_order_id: string
            razorpay_signature: string
          }) => {
            await verifyPaymentOnBackend({
              orderId: data.data.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
          },
        })

        razorpay.on("payment.failed", (response: any) => {
          setVerifyingPayment(false)
          setError(response?.error?.description || "Payment failed. Please try again.")
        })

        razorpay.open()
        setLoading(false)
        return
      }

      setError(data.message || "Failed to initiate payment")
    } catch (err) {
      console.error("Error placing order:", err)
      setError("Network error. Please try again.")
    }
    setLoading(false)
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = shippingCharges // Shipping charges fetched from backend
  
  // Calculate GST preview based on selected address
  const selectedAddress = addresses.find((addr) => addr._id === selectedAddressId)
  const shippingState = selectedAddress?.state?.trim().toUpperCase() || ""
  const isTelangana = shippingState === "TELANGANA" || shippingState === "TS"
  
  // GST is calculated on (subtotal + shipping)
  const taxableAmount = subtotal + shipping
  let cgst = 0
  let sgst = 0
  let igst = 0
  
  if (selectedAddress) {
    if (isTelangana) {
      // Intra-State: CGST 9% + SGST 9%
      cgst = Math.round((taxableAmount * 9) / 100)
      sgst = Math.round((taxableAmount * 9) / 100)
    } else {
      // Inter-State: IGST 18%
      igst = Math.round((taxableAmount * 18) / 100)
    }
  }
  
  const gstTotal = cgst + sgst + igst
  const total = subtotal + shipping + gstTotal

  if (cartLoading || fetchingAddresses || fetchingShippingCharges) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8">Add items to your cart to proceed to checkout.</p>
          <Link href="/products">
            <Button size="lg">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Payment Verification Overlay */}
      {verifyingPayment && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center animate-in fade-in-0 duration-300 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 animate-in zoom-in-95 duration-500 shadow-2xl">
            <div className="flex flex-col items-center">
              {/* Animated Spinner */}
              <div className="relative mb-4 sm:mb-6">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-spin" />
                </div>
                {/* Pulsing Ring */}
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
                Payment Successful!
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 text-center">
                Confirming your order...
              </p>
              <div className="flex items-center gap-2 text-primary">
                <Clock className="h-4 w-4 animate-pulse" />
                <span className="text-xs sm:text-sm">Please wait</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-in fade-in-0 duration-300 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 animate-in zoom-in-95 duration-500 shadow-2xl">
            <div className="flex flex-col items-center">
              {/* Animated Check Circle */}
              <div className="relative mb-4 sm:mb-6">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in-95 duration-500">
                  <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-600 animate-in zoom-in-95 duration-700" />
                </div>
                {/* Sparkles Animation */}
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 absolute -bottom-1 -left-1 animate-pulse delay-300" />
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 absolute top-1/2 -left-3 animate-pulse delay-700" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
                Order Confirmed!
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 text-center">
                Your order has been confirmed. Redirecting to order details...
              </p>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full animate-progress" style={{ animation: "progress 1.5s linear forwards" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 lg:mb-8">Checkout</h1>

      {error && (
        <div className="mb-6 rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Left Column - Address Selection */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
              {!showAddAddress ? (
                <>
                  {addresses.length > 0 ? (
                    <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId}>
                      {addresses.map((address) => (
                        <div key={address._id} className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 border rounded-lg">
                          <RadioGroupItem value={address._id} id={address._id} className="mt-1 h-4 w-4 sm:h-5 sm:w-5" />
                          <Label htmlFor={address._id} className="flex-1 cursor-pointer">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-semibold text-sm sm:text-base">
                                  {address.firstName} {address.lastName}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground">{address.phone}</p>
                                <p className="text-xs sm:text-sm mt-1">
                                  {address.address1}
                                  {address.address2 && `, ${address.address2}`}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {address.city}, {address.state} {address.postcode}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground">{address.country}</p>
                              </div>
                              {address.isDefault && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded self-start">Default</span>
                              )}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <p className="text-sm sm:text-base text-muted-foreground text-center py-4">No saved addresses</p>
                  )}

                  <Button variant="outline" className="w-full h-10 sm:h-11 text-sm sm:text-base touch-manipulation" onClick={() => setShowAddAddress(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Address
                  </Button>
                </>
              ) : (
                <form onSubmit={handleAddAddress} className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-sm">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                        className="h-10 sm:h-11 text-sm mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-sm">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                        className="h-10 sm:h-11 text-sm mt-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      required
                      className="h-10 sm:h-11 text-sm mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address1" className="text-sm">Address Line 1 *</Label>
                    <Input
                      id="address1"
                      value={formData.address1}
                      onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                      required
                      className="h-10 sm:h-11 text-sm mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address2" className="text-sm">Address Line 2</Label>
                    <Input
                      id="address2"
                      value={formData.address2}
                      onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                      className="h-10 sm:h-11 text-sm mt-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="city" className="text-sm">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                        className="h-10 sm:h-11 text-sm mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-sm">State *</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => setFormData({ ...formData, state: value })}
                        required
                      >
                        <SelectTrigger id="state" className="h-10 sm:h-11 text-sm mt-1.5 w-full">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="postcode" className="text-sm">Postcode *</Label>
                      <Input
                        id="postcode"
                        type="tel"
                        inputMode="numeric"
                        value={formData.postcode}
                        onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                        required
                        className="h-10 sm:h-11 text-sm mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="rounded h-4 w-4 sm:h-5 sm:w-5"
                    />
                    <Label htmlFor="isDefault" className="cursor-pointer text-sm touch-manipulation">
                      Set as default address
                    </Label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="submit" disabled={loading} className="h-10 sm:h-11 text-sm sm:text-base touch-manipulation flex-1">
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                      Save Address
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddAddress(false)} className="h-10 sm:h-11 text-sm sm:text-base touch-manipulation">
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20 sm:top-24">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
              <div className="space-y-2.5 sm:space-y-3">
                {cartItems.map((item) => (
                  <div key={item.product._id} className="flex gap-2 sm:gap-3">
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={item.product.images?.[0] ? `${API_URL}${item.product.images[0]}` : "/placeholder.svg"}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 56px, 64px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      <p className="text-xs sm:text-sm font-semibold">₹{item.price * item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 sm:pt-4 space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Shipping/Handling Charges</span>
                  <span className="font-semibold">₹{shipping.toLocaleString()}</span>
                </div>
                
                {/* GST Breakdown */}
                {selectedAddress && (
                  <>
                    {isTelangana ? (
                      <>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">CGST (9%)</span>
                          <span className="font-semibold">₹{cgst.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">SGST (9%)</span>
                          <span className="font-semibold">₹{sgst.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">IGST (18%)</span>
                        <span className="font-semibold">₹{igst.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
                
                {!selectedAddress && (
                  <div className="text-xs text-muted-foreground italic">
                    Select address to see GST breakdown
                  </div>
                )}
                
                <div className="flex justify-between text-base sm:text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">₹{total.toLocaleString()}</span>
                </div>
              </div>

              <Button className="w-full h-11 sm:h-12 text-sm sm:text-base touch-manipulation" size="lg" onClick={handlePlaceOrder} disabled={loading || !selectedAddressId}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  "Pay with Razorpay"
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Prepaid only — you will be redirected to PhonePe to complete payment.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

