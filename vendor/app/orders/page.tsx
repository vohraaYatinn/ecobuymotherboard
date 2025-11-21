"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { Input } from "@/components/ui/input"

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const orders = [
    {
      id: "#ORD-1234",
      customer: "Rajesh Kumar",
      items: 3,
      amount: "₹20,417",
      status: "delivered",
      date: "18 Dec, 2024",
      time: "2 hours ago",
    },
    {
      id: "#ORD-1233",
      customer: "Priya Sharma",
      items: 2,
      amount: "₹10,708",
      status: "processing",
      date: "18 Dec, 2024",
      time: "5 hours ago",
    },
    {
      id: "#ORD-1232",
      customer: "Amit Patel",
      items: 5,
      amount: "₹32,666",
      status: "pending",
      date: "17 Dec, 2024",
      time: "1 day ago",
    },
    {
      id: "#ORD-1231",
      customer: "Sneha Reddy",
      items: 1,
      amount: "₹7,499",
      status: "delivered",
      date: "17 Dec, 2024",
      time: "1 day ago",
    },
    {
      id: "#ORD-1230",
      customer: "Vikram Singh",
      items: 4,
      amount: "₹47,291",
      status: "cancelled",
      date: "16 Dec, 2024",
      time: "2 days ago",
    },
  ]

  const tabs = [
    { id: "all", label: "All", count: orders.length },
    { id: "pending", label: "Pending", count: orders.filter((o) => o.status === "pending").length },
    { id: "processing", label: "Processing", count: orders.filter((o) => o.status === "processing").length },
    { id: "delivered", label: "Delivered", count: orders.filter((o) => o.status === "delivered").length },
  ]

  const filteredOrders = orders.filter((order) => {
    const matchesTab = activeTab === "all" || order.status === activeTab
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-chart-3/10 text-chart-3 border-chart-3/20"
      case "processing":
        return "bg-primary/10 text-primary border-primary/20"
      case "pending":
        return "bg-chart-5/10 text-chart-5 border-chart-5/20"
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case "processing":
        return (
          <svg className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )
      case "pending":
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 border-b-2 border-border/50 bg-card/98 backdrop-blur-xl shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Orders</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your order history</p>
            </div>
            <button className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/90 px-4 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 transition-all">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New
            </button>
          </div>

          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              type="search"
              placeholder="Search by order ID or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:scale-105"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-background text-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted/50">
              <svg className="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">No orders found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredOrders.map((order, index) => (
            <Link key={order.id} href={`/orders/${order.id.replace("#ORD-", "")}`}>
              <Card
                className="border-2 border-border/50 bg-card hover:border-primary/50 hover:shadow-lg transition-all hover:-translate-y-0.5 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${getStatusColor(order.status).replace("text-", "bg-").replace("bg-", "bg-").split(" ")[0]}`}
                    >
                      <div className={getStatusColor(order.status).split(" ")[1]}>{getStatusIcon(order.status)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-foreground">{order.id}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{order.customer}</p>
                        </div>
                        <span
                          className={`rounded-lg border px-3 py-1 text-xs font-semibold ${getStatusColor(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                        <span className="font-medium">{order.items} items</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {order.time}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-primary">{order.amount}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}
