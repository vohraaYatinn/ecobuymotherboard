"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, MapPin, Phone, Mail, Calendar, ShoppingBag, TrendingUp } from "lucide-react"

export function AdminCustomerDetail({ customerId }: { customerId: string }) {
  const addresses = [
    {
      id: "ADDR001",
      type: "Home",
      address: "123, MG Road, Sector 15",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      isDefault: true,
    },
    {
      id: "ADDR002",
      type: "Office",
      address: "456, Tech Park, Building B",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400002",
      isDefault: false,
    },
  ]

  const recentOrders = [
    { id: "ORD1001", date: "2025-01-20", amount: "₹2,500", status: "Pending" },
    { id: "ORD0987", date: "2025-01-15", amount: "₹3,800", status: "Delivered" },
    { id: "ORD0954", date: "2025-01-10", amount: "₹1,900", status: "Delivered" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Customer Details</h1>
            <p className="text-sm text-muted-foreground mt-1">{customerId}</p>
          </div>
        </div>
        <Badge className="bg-green-100 text-green-800 w-fit">Active</Badge>
      </div>

      {/* Customer Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="text-base font-medium mt-1">Rajesh Kumar</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </p>
                <p className="text-base font-medium mt-1">rajesh.kumar@email.com</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </p>
                <p className="text-base font-medium mt-1">+91 98765 43210</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Member Since
                </p>
                <p className="text-base font-medium mt-1">August 15, 2024</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="h-4 w-4" />
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">12</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">₹45,600</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Addresses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Saved Addresses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div key={addr.id} className="border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">{addr.type}</h4>
                  {addr.isDefault && (
                    <Badge variant="outline" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {addr.address}
                  <br />
                  {addr.city}, {addr.state}
                  <br />
                  Pincode: {addr.pincode}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border last:border-0"
              >
                <div>
                  <Link href={`/admin/orders/${order.id}`}>
                    <p className="font-medium hover:text-primary">{order.id}</p>
                  </Link>
                  <p className="text-sm text-muted-foreground">{order.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold">{order.amount}</p>
                  <Badge
                    className={
                      order.status === "Delivered" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
