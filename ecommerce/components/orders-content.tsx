"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Package } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function OrdersContent() {
  const orders = [
    {
      id: "ORD-2024-001",
      date: "Jan 15, 2024",
      status: "Delivered",
      total: "Rs. 3,450.00",
      items: [
        { name: "Sony LED TV PCB Model 49W672E", qty: 1, price: "Rs. 2,100.00" },
        { name: "Sharp LED TV PCB Model LC50UA6500X", qty: 1, price: "Rs. 1,350.00" },
      ],
    },
    {
      id: "ORD-2024-002",
      date: "Jan 20, 2024",
      status: "In Transit",
      total: "Rs. 5,670.00",
      items: [{ name: "Television Motherboard Universal PCB", qty: 2, price: "Rs. 2,835.00" }],
    },
    {
      id: "ORD-2024-003",
      date: "Jan 22, 2024",
      status: "Processing",
      total: "Rs. 2,340.00",
      items: [
        { name: "TV T-Con Board for Samsung", qty: 1, price: "Rs. 890.00" },
        { name: "LED TV Panel PCB Board", qty: 2, price: "Rs. 725.00" },
      ],
    },
    {
      id: "ORD-2024-004",
      date: "Jan 10, 2024",
      status: "Delivered",
      total: "Rs. 4,200.00",
      items: [{ name: "Television Power Supply Board", qty: 3, price: "Rs. 1,400.00" }],
    },
    {
      id: "ORD-2024-005",
      date: "Jan 5, 2024",
      status: "Cancelled",
      total: "Rs. 1,890.00",
      items: [{ name: "TV Inverter Board", qty: 1, price: "Rs. 1,890.00" }],
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-500"
      case "In Transit":
        return "bg-blue-500"
      case "Processing":
        return "bg-yellow-500"
      case "Cancelled":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const filterOrders = (status: string) => {
    if (status === "all") return orders
    return orders.filter((order) => order.status.toLowerCase() === status.toLowerCase())
  }

  const OrderCard = ({ order }: { order: (typeof orders)[0] }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="border-b border-border bg-muted/30 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base sm:text-lg">{order.id}</h3>
                <Badge className={`${getStatusColor(order.status)} text-xs`}>{order.status}</Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Order placed on {order.date}</p>
            </div>
            <div className="flex flex-col sm:items-end gap-1">
              <p className="text-base sm:text-lg font-bold">{order.total}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{order.items.length} item(s)</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base line-clamp-2">{item.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Qty: {item.qty} • {item.price}
                </p>
              </div>
            </div>
          ))}

          <div className="flex flex-col sm:flex-row gap-2 pt-3">
            <Link href={`/dashboard/orders/${order.id}`} className="flex-1">
              <Button variant="outline" className="w-full text-xs sm:text-sm bg-transparent">
                View Details
              </Button>
            </Link>
            {order.status === "Delivered" && (
              <Button variant="outline" className="flex-1 text-xs sm:text-sm bg-transparent">
                Reorder
              </Button>
            )}
            {order.status === "In Transit" && (
              <Button variant="outline" className="flex-1 text-xs sm:text-sm bg-transparent">
                Track Order
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Track and manage all your orders</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search orders by ID or product name" className="pl-10" />
        </div>
      </div>

      {/* Filters */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="all" className="text-xs sm:text-sm whitespace-nowrap">
            All Orders
          </TabsTrigger>
          <TabsTrigger value="processing" className="text-xs sm:text-sm whitespace-nowrap">
            Processing
          </TabsTrigger>
          <TabsTrigger value="in transit" className="text-xs sm:text-sm whitespace-nowrap">
            In Transit
          </TabsTrigger>
          <TabsTrigger value="delivered" className="text-xs sm:text-sm whitespace-nowrap">
            Delivered
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs sm:text-sm whitespace-nowrap">
            Cancelled
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          {filterOrders("processing").map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </TabsContent>

        <TabsContent value="in transit" className="space-y-4">
          {filterOrders("in transit").map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </TabsContent>

        <TabsContent value="delivered" className="space-y-4">
          {filterOrders("delivered").map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {filterOrders("cancelled").map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
