"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { ChevronDown, ChevronUp, Check } from "lucide-react"

export default function AcceptOrdersPage() {
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({})

  const pendingOrders = [
    {
      id: "#ORD-1234",
      customer: "Rajesh Kumar",
      items: [
        { name: "PCB Board", quantity: 50 },
        { name: "Motherboard", quantity: 25 },
        { name: "Circuit Components", quantity: 100 },
      ],
      amount: 20417,
      time: "2 min ago",
      address: "MG Road, Bangalore",
    },
    {
      id: "#ORD-1235",
      customer: "Priya Sharma",
      items: [
        { name: "Motherboard", quantity: 30 },
        { name: "PCB Board", quantity: 20 },
      ],
      amount: 15320,
      time: "5 min ago",
      address: "Koramangala, Bangalore",
    },
    {
      id: "#ORD-1236",
      customer: "Amit Patel",
      items: [
        { name: "Circuit Components", quantity: 200 },
        { name: "Motherboard", quantity: 40 },
        { name: "PCB Board", quantity: 60 },
        { name: "Connectors", quantity: 150 },
        { name: "Resistors", quantity: 500 },
      ],
      amount: 32666,
      time: "8 min ago",
      address: "Indiranagar, Bangalore",
    },
    {
      id: "#ORD-1237",
      customer: "Sneha Reddy",
      items: [
        { name: "PCB Board", quantity: 35 },
        { name: "Motherboard", quantity: 15 },
      ],
      amount: 18750,
      time: "12 min ago",
      address: "Whitefield, Bangalore",
    },
  ]

  const handleAccept = (orderId: string) => {
    console.log("[v0] Accepting order:", orderId)
    // Handle accept logic
  }

  const toggleItems = (orderId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }))
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="sticky top-0 z-10 border-b-2 border-border/50 bg-card/98 backdrop-blur-xl shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Accept Orders</h1>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary">{pendingOrders.length} pending</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 space-y-4">
        {pendingOrders.map((order, index) => (
          <Card
            key={order.id}
            className="border-2 border-border/50 bg-card shadow-lg hover:shadow-xl transition-shadow"
            style={{
              animation: `slideUp 0.3s ease-out ${index * 0.1}s both`,
            }}
          >
            <CardContent className="p-4">
              {/* Order ID & Time */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{order.id}</h2>
                  <p className="text-xs text-muted-foreground">Received {order.time}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-3 p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-white font-bold text-sm shadow-md">
                    {order.customer
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{order.customer}</p>
                    <p className="text-xs text-muted-foreground">Customer</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <p className="text-xs text-foreground">{order.address}</p>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="rounded-lg bg-primary/5 overflow-hidden border border-primary/10">
                  <button
                    onClick={() => toggleItems(order.id)}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-primary/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-foreground">Items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{order.items.length}</span>
                      {expandedItems[order.id] ? (
                        <ChevronUp className="h-4 w-4 text-primary" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </button>

                  {expandedItems[order.id] && (
                    <div className="px-2.5 pb-2.5 space-y-1.5 animate-in slide-in-from-top-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-md bg-background/50 border border-border/30"
                        >
                          <span className="text-xs text-foreground">{item.name}</span>
                          <span className="text-xs font-semibold text-primary">Qty: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order Value */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-chart-3/5 border border-chart-3/20">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-chart-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-foreground">Order Value</span>
                  </div>
                  <span className="text-lg font-bold text-chart-3">₹{order.amount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <button
                onClick={() => handleAccept(order.id)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]"
              >
                <Check className="h-5 w-5 text-white" strokeWidth={3} />
                <span className="text-base font-bold text-white">Accept Order</span>
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <BottomNav />

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
