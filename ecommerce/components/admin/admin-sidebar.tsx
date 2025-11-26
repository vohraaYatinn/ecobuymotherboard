"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LayoutDashboard, ShoppingBag, Users, Store, Package, Settings, Menu, LogOut, UserCircle, Bell, Send, BookOpen, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.safartax.com"

const menuItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/learning-resources", label: "Learning Resources", icon: BookOpen },
  { href: "/admin/push-notifications", label: "Push Notifications", icon: Send },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, hasBadge: true },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [adminData, setAdminData] = useState<{ email?: string } | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    // Load admin data from localStorage
    const storedAdminData = localStorage.getItem("adminData")
    if (storedAdminData) {
      try {
        setAdminData(JSON.parse(storedAdminData))
      } catch (error) {
        console.error("Error parsing admin data:", error)
      }
    }
    fetchUnreadNotifications()
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchUnreadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUnreadNotifications = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/notifications/admin?unreadOnly=true&limit=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUnreadNotifications(data.data.unreadCount || 0)
      }
    } catch (err) {
      console.error("Error fetching unread notifications:", err)
    }
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      
      // Call logout endpoint (optional, but good practice)
      if (token) {
        try {
          await fetch(`${API_URL}/api/auth/admin/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          })
        } catch (error) {
          // Continue with logout even if API call fails
          console.error("Logout API error:", error)
        }
      }

      // Clear localStorage
      localStorage.removeItem("adminToken")
      localStorage.removeItem("adminData")

      // Redirect to login page
      router.push("/admin-login")
    } catch (error) {
      console.error("Logout error:", error)
      // Still clear localStorage and redirect even if there's an error
      localStorage.removeItem("adminToken")
      localStorage.removeItem("adminData")
      router.push("/admin-login")
    }
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-primary-foreground">E</span>
        </div>
        <div>
          <span className="text-lg font-bold text-foreground">Elecobuy</span>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>

      {/* Admin Info */}
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <UserCircle className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Admin User</p>
            <p className="text-xs text-muted-foreground truncate">
              {adminData?.email || "admin@ecobuy.com"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className="relative">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
              {item.hasBadge && unreadNotifications > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-border p-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Sidebar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[100] flex h-16 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">E</span>
          </div>
          <span className="text-lg font-bold text-foreground">Elecobuy Admin</span>
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:z-[100] border-r border-border bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile Spacer */}
      <div className="h-16 lg:hidden" />
    </>
  )
}
