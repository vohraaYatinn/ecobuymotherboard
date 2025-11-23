"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { API_URL } from "@/lib/api-config"
import { useNavigation } from "@/contexts/navigation-context"

interface Notification {
  _id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  orderId?: {
    _id: string
    orderNumber: string
  }
  orderNumber?: string
}

// Icon components for different notification types
const getNotificationIcon = (type: string) => {
  const iconClass = "h-5 w-5"
  switch (type) {
    case "order_placed":
    case "new_order_available":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    case "order_accepted":
    case "order_processing":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case "order_shipped":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      )
    case "order_delivered":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
  }
}

const getNotificationColor = (type: string) => {
  switch (type) {
    case "order_placed":
    case "new_order_available":
      return "primary"
    case "order_accepted":
    case "order_processing":
      return "chart-3"
    case "order_shipped":
      return "chart-2"
    case "order_delivered":
      return "chart-4"
    default:
      return "primary"
  }
}

export default function NotificationsPage() {
  const router = useRouter()
  const { setSelectedOrderId } = useNavigation()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/notifications/vendor`, {
        headers: {
          Authorization: `Bearer ${token}`,
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
        setError(data.message || "Failed to load notifications")
        return
      }

      setNotifications(data.data.notifications || [])
      setUnreadCount(data.data.unreadCount || 0)
    } catch (err) {
      console.error("Error fetching notifications:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem("vendorToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/notifications/vendor/${notificationId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("vendorToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/notifications/vendor/mark-all-read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error("Error marking all as read:", err)
    }
  }

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-card/98 backdrop-blur-xl shadow-sm safe-top" style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))` }}>
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
            <button 
              onClick={markAllAsRead}
              className="text-xs font-semibold text-primary hover:text-primary/80"
              disabled={unreadCount === 0}
            >
              Mark all read {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchNotifications} className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="border-2 border-border/50 bg-card">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <svg className="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">No notifications</h3>
                  <p className="text-xs text-muted-foreground">You're all caught up!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification, index) => {
            const color = getNotificationColor(notification.type)
            const icon = getNotificationIcon(notification.type)
            const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })

            return (
              <Card
                key={notification._id}
                onClick={() => {
                  if (!notification.isRead) {
                    markAsRead(notification._id)
                  }
                  // Navigate based on notification type
                  if (notification.type === "new_order_available") {
                    router.push("/accept-orders")
                  } else if (notification.orderId?._id) {
                    setSelectedOrderId(notification.orderId._id)
                    router.push("/order-detail")
                  }
                }}
                className={`border-2 ${notification.isRead ? "border-border/50 bg-card" : "border-primary/20 bg-primary/5"} hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer animate-fade-in`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-${color}/10 text-${color}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-sm font-bold text-foreground">{notification.title}</h3>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{notification.message}</p>
                      <div className="flex items-center gap-2">
                        <svg className="h-3 w-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-muted-foreground">{timeAgo}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <BottomNav />
    </div>
  )
}
