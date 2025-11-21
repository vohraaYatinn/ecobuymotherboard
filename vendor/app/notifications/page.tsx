"use client"

import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { useRouter } from "next/navigation"

export default function NotificationsPage() {
  const router = useRouter()

  const notifications = [
    {
      id: 1,
      type: "order",
      title: "New Order Received",
      message: "Order #ORD-1234 from Rajesh Kumar",
      time: "2 min ago",
      read: false,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
      color: "primary",
    },
    {
      id: 2,
      type: "payment",
      title: "Payment Received",
      message: "₹20,417 received for Order #ORD-1233",
      time: "1 hour ago",
      read: false,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: "chart-3",
    },
    {
      id: 3,
      type: "customer",
      title: "New Customer Message",
      message: "Priya Sharma sent you a message",
      time: "3 hours ago",
      read: true,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      ),
      color: "chart-2",
    },
    {
      id: 4,
      type: "delivery",
      title: "Order Delivered",
      message: "Order #ORD-1230 has been delivered",
      time: "5 hours ago",
      read: true,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
      ),
      color: "chart-4",
    },
    {
      id: 5,
      type: "inventory",
      title: "Low Stock Alert",
      message: "Wireless Headphones stock is running low",
      time: "1 day ago",
      read: true,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      color: "chart-5",
    },
  ]

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-card/98 backdrop-blur-xl shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
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
              <div>
                <h1 className="text-lg font-bold tracking-tight text-foreground leading-tight">Notifications</h1>
                <p className="text-xs text-muted-foreground leading-tight">Stay updated</p>
              </div>
            </div>
            <button className="text-xs font-semibold text-primary hover:text-primary/80">Mark all read</button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="px-4 py-4 space-y-2">
        {notifications.map((notification, index) => (
          <Card
            key={notification.id}
            className={`border-2 ${notification.read ? "border-border/50 bg-card" : "border-primary/20 bg-primary/5"} hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer animate-fade-in`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-${notification.color}/10 text-${notification.color}`}
                >
                  {notification.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-sm font-bold text-foreground">{notification.title}</h3>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0 ml-2" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{notification.message}</p>
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-3 w-3 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-xs text-muted-foreground">{notification.time}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
