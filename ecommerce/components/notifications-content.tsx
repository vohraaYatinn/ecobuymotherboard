"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Bell } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.36:5000"

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

const getNotificationIcon = (type: string) => {
  const iconClass = "h-5 w-5"
  switch (type) {
    case "order_placed":
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
      return <Bell className={iconClass} />
  }
}

const getNotificationColor = (type: string) => {
  switch (type) {
    case "order_placed":
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

export function NotificationsContent() {
  const router = useRouter()
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
      const token = localStorage.getItem("customerToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/notifications/customer`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        if (response.status === 401) {
          localStorage.removeItem("customerToken")
          localStorage.removeItem("customerData")
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
      const token = localStorage.getItem("customerToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/notifications/customer/${notificationId}/read`, {
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
      const token = localStorage.getItem("customerToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/notifications/customer/mark-all-read`, {
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Stay updated with your orders</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead} size="sm">
            Mark all as read ({unreadCount})
          </Button>
        )}
      </div>

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
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No notifications</h3>
            <p className="text-sm text-muted-foreground">You're all caught up!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
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
                  if (notification.orderId?._id) {
                    router.push(`/dashboard/orders/${notification.orderId._id}`)
                  }
                }}
                className={`cursor-pointer transition-all hover:shadow-md ${notification.isRead ? "border-border/50" : "border-primary/20 bg-primary/5"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-${color}/10 text-${color}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-semibold text-foreground">{notification.title}</h3>
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 ml-2 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{timeAgo}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}



