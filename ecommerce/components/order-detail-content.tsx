"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Package, CheckCircle2, MapPin, Phone, Mail, ArrowLeft, Download } from "lucide-react"

export function OrderDetailContent({ orderId }: { orderId: string }) {
  const orderData = {
    id: orderId,
    date: "January 20, 2024",
    time: "10:30 AM",
    status: "In Transit",
    total: "Rs. 5,670.00",
    items: [
      {
        name: "Sony LED TV PCB Model 49W672E",
        qty: 1,
        price: "Rs. 2,100.00",
        discount: "Rs. 200.00",
      },
      {
        name: "Sharp LED TV PCB Model LC50UA6500X",
        qty: 1,
        price: "Rs. 1,350.00",
        discount: "Rs. 0.00",
      },
    ],
    subtotal: "Rs. 3,450.00",
    shipping: "Rs. 100.00",
    tax: "Rs. 120.00",
    discount: "Rs. 200.00",
    shippingAddress: {
      name: "John Doe",
      phone: "+91 98765 43210",
      email: "john.doe@example.com",
      address: "123, MG Road, Koramangala",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560034",
    },
    tracking: [
      { status: "Order Placed", date: "Jan 20, 10:30 AM", completed: true },
      { status: "Order Confirmed", date: "Jan 20, 11:00 AM", completed: true },
      { status: "Processing", date: "Jan 20, 02:15 PM", completed: true },
      { status: "Shipped", date: "Jan 21, 09:00 AM", completed: true },
      { status: "Out for Delivery", date: "Expected Jan 23", completed: false },
      { status: "Delivered", date: "Expected Jan 23", completed: false },
    ],
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-500"
      case "In Transit":
        return "bg-blue-500"
      case "Processing":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

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
            Order ID: <span className="font-semibold text-foreground">{orderData.id}</span>
          </p>
          <Badge className={`${getStatusColor(orderData.status)} w-fit text-xs`}>{orderData.status}</Badge>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Placed on {orderData.date} at {orderData.time}
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
                {orderData.tracking.map((track, idx) => (
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
                      {idx < orderData.tracking.length - 1 && (
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
              {orderData.items.map((item, idx) => (
                <div key={idx} className="flex gap-3 sm:gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base line-clamp-2">{item.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Quantity: {item.qty}</p>
                    {item.discount !== "Rs. 0.00" && (
                      <p className="text-xs text-green-600 mt-1">Discount: {item.discount}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm sm:text-base">{item.price}</p>
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
                <span className="font-medium">{orderData.subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">{orderData.shipping}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">{orderData.tax}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span className="font-medium">-{orderData.discount}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base sm:text-lg font-bold">
                <span>Total</span>
                <span>{orderData.total}</span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-semibold">{orderData.shippingAddress.name}</p>
                  <p className="text-muted-foreground mt-1">{orderData.shippingAddress.address}</p>
                  <p className="text-muted-foreground">
                    {orderData.shippingAddress.city}, {orderData.shippingAddress.state}
                  </p>
                  <p className="text-muted-foreground">{orderData.shippingAddress.pincode}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{orderData.shippingAddress.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="break-all">{orderData.shippingAddress.email}</span>
                </div>
              </div>
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
                disabled={orderData.status !== "Delivered"}
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
