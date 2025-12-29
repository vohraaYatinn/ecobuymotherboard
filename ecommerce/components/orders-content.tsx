"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { Search, Package } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://10.204.150.75:5000"

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

interface Order {
  _id: string
  orderNumber: string
  status: string
  total: number
  items: OrderItem[]
  createdAt: string
}

export function OrdersContent() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("customerToken")
        if (!token) {
          router.push("/login")
          return
        }

        const response = await fetch(`${API_URL}/api/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch orders")
        }

        const data = await response.json()
        if (data.success) {
          setOrders(data.data)
        }
      } catch (err: any) {
        console.error("Error fetching orders:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [router])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-500"
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
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const filterOrders = (status: string) => {
    let filtered = orders

    if (status !== "all") {
      filtered = filtered.filter((order) => order.status.toLowerCase() === status.toLowerCase())
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(query) ||
          order.items.some((item) => item.name.toLowerCase().includes(query))
      )
    }

    return filtered
  }

  const filteredOrders = filterOrders(activeTab)

  const OrderCard = ({ order }: { order: Order }) => {
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="border-b border-border bg-muted/30 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base sm:text-lg">{order.orderNumber}</h3>
                  <Badge className={`${getStatusColor(order.status)} text-xs`}>
                    {formatStatus(order.status)}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Order placed on {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-1">
                <p className="text-base sm:text-lg font-bold">₹{order.total.toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{itemCount} item(s)</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                <div className="relative h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
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
                      <Package className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base line-clamp-2">{item.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Qty: {item.quantity} • ₹{item.price.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-2 pt-3">
              <Link href={`/dashboard/orders/${order._id}`} className="flex-1">
                <Button variant="outline" className="w-full h-9 sm:h-10 text-xs sm:text-sm bg-transparent touch-manipulation">
                  View Details
                </Button>
              </Link>
              {order.status === "delivered" && (
                <Button variant="outline" className="flex-1 h-9 sm:h-10 text-xs sm:text-sm bg-transparent touch-manipulation">
                  Reorder
                </Button>
              )}
              {(order.status === "shipped" || order.status === "packed") && (
                <Link href={`/dashboard/orders/${order._id}`} className="flex-1">
                  <Button variant="outline" className="w-full h-9 sm:h-10 text-xs sm:text-sm bg-transparent touch-manipulation">
                    Track Order
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Track and manage all your orders</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="mb-4 sm:mb-6">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders by ID or product name"
                className="pl-10 h-10 sm:h-11 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filters */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1">
              <TabsTrigger value="all" className="text-xs sm:text-sm whitespace-nowrap h-9 sm:h-10 px-2 sm:px-3 touch-manipulation">
                All ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm whitespace-nowrap h-9 sm:h-10 px-2 sm:px-3 touch-manipulation">
                Pending ({orders.filter((o) => o.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="processing" className="text-xs sm:text-sm whitespace-nowrap h-9 sm:h-10 px-2 sm:px-3 touch-manipulation">
                Processing ({orders.filter((o) => o.status === "processing").length})
              </TabsTrigger>
              <TabsTrigger value="shipped" className="text-xs sm:text-sm whitespace-nowrap h-9 sm:h-10 px-2 sm:px-3 touch-manipulation">
                Shipped ({orders.filter((o) => o.status === "shipped").length})
              </TabsTrigger>
              <TabsTrigger value="delivered" className="text-xs sm:text-sm whitespace-nowrap h-9 sm:h-10 px-2 sm:px-3 touch-manipulation">
                Delivered ({orders.filter((o) => o.status === "delivered").length})
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs sm:text-sm whitespace-nowrap h-9 sm:h-10 px-2 sm:px-3 touch-manipulation">
                Cancelled ({orders.filter((o) => o.status === "cancelled").length})
              </TabsTrigger>
            </TabsList>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No orders found</p>
                <Link href="/products">
                  <Button variant="outline">Start Shopping</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <OrderCard key={order._id} order={order} />
                ))}
              </div>
            )}
          </Tabs>
        </>
      )}
    </div>
  )
}
