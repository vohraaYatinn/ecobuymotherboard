"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Package, User, CreditCard, Truck } from "lucide-react"

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{orderId}</h1>
            <p className="text-sm text-muted-foreground mt-1">Order placed on January 20, 2025</p>
          </div>
        </div>
        <Badge className="bg-yellow-100 text-yellow-800 w-fit">Pending</Badge>
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
              <Label htmlFor="customerContact">Customer Contact Number</Label>
              <Input id="customerContact" defaultValue="+91 98765 43210" className="mt-1.5" />
            </div>
            <div>
              <Label>Customer Name</Label>
              <p className="mt-1.5 text-sm font-medium">Rajesh Kumar</p>
            </div>
            <div>
              <Label>Delivery Address</Label>
              <p className="mt-1.5 text-sm">
                123, MG Road, Sector 15
                <br />
                Mumbai, Maharashtra - 400001
              </p>
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
            <div>
              <Label htmlFor="sku">SKU Details</Label>
              <Input id="sku" defaultValue="TV-PCB-LG-001" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" defaultValue="LG" className="mt-1.5" />
            </div>
            <div>
              <Label>Product Name</Label>
              <p className="mt-1.5 text-sm font-medium">LG 43 inch LED TV PCB Board</p>
            </div>
            <div>
              <Label>Quantity</Label>
              <p className="mt-1.5 text-sm font-medium">1 Unit</p>
            </div>
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
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select defaultValue="cod">
                <SelectTrigger id="paymentType" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">Cash on Delivery</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="agValue">AG Value</Label>
              <Input id="agValue" defaultValue="₹2,500" className="mt-1.5" />
            </div>
            <div>
              <Label>Order Total</Label>
              <p className="mt-1.5 text-lg font-bold text-green-600">₹2,500</p>
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
              <Label htmlFor="assignedSeller">Assigned Seller</Label>
              <Select defaultValue="seller1">
                <SelectTrigger id="assignedSeller" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seller1">Tech Vendors Ltd</SelectItem>
                  <SelectItem value="seller2">Electronics Hub</SelectItem>
                  <SelectItem value="seller3">PCB Solutions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sellerAddress">Seller Address</Label>
              <Input id="sellerAddress" defaultValue="Mumbai, Maharashtra" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="orderStatus">Order Status</Label>
              <Select defaultValue="pending">
                <SelectTrigger id="orderStatus" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="awb">AWB Number</Label>
              <Input id="awb" defaultValue="AWB123456789" className="mt-1.5" />
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
                <p className="text-sm text-muted-foreground">January 20, 2025 at 10:30 AM</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                  <div className="h-3 w-3 rounded-full bg-yellow-600" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-medium">Pending Confirmation</p>
                <p className="text-sm text-muted-foreground">Awaiting seller confirmation</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancel</Button>
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
