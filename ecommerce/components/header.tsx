"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { Menu, ShoppingCart, Heart, MapPin, User, Globe, Package, LogOut, LayoutDashboard, Bell, Home, Info, Mail, Store, X } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { SearchBar } from "@/components/search-bar"

interface Category {
  _id: string
  name: string
  slug: string
  isActive: boolean
}

export function Header() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const { cartCount } = useCart()
  const { wishlistCount } = useWishlist()

  useEffect(() => {
    // Check if user is logged in and get customer name
    const checkAuth = async () => {
      const token = localStorage.getItem("customerToken")
      const customerData = localStorage.getItem("customerData")
      setIsLoggedIn(!!token)
      
      if (token && customerData) {
        try {
          const customer = JSON.parse(customerData)
          // Check for name with proper trimming to handle empty strings
          const storedName = customer.name?.trim()
          
          if (storedName) {
            setCustomerName(storedName)
          } else {
            // If name is not in localStorage, fetch from API to get latest data
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"}/api/customer-auth/profile`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
              
              if (response.ok) {
                const data = await response.json()
                if (data.success && data.data?.name?.trim()) {
                  setCustomerName(data.data.name.trim())
                  // Update localStorage with fresh data
                  localStorage.setItem("customerData", JSON.stringify({
                    ...customer,
                    name: data.data.name,
                    email: data.data.email,
                  }))
                } else {
                  setCustomerName(null)
                }
              } else {
                setCustomerName(null)
              }
            } catch (fetchErr) {
              console.error("Error fetching customer profile:", fetchErr)
              setCustomerName(null)
            }
          }
        } catch (err) {
          console.error("Error parsing customer data:", err)
          setCustomerName(null)
        }
      } else {
        setCustomerName(null)
      }
    }

    // Initial check
    checkAuth()

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = () => {
      checkAuth()
    }

    // Listen for custom auth events (same-tab login/logout)
    const handleAuthChange = () => {
      checkAuth()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("auth-change", handleAuthChange)
    
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("auth-change", handleAuthChange)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      fetchUnreadNotifications()
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchUnreadNotifications, 30000)
      return () => clearInterval(interval)
    } else {
      setUnreadNotifications(0)
    }
  }, [isLoggedIn])

  // Fetch categories for dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"}/api/categories`)
        const data = await response.json()
        if (data.success) {
          setCategories(data.data.filter((cat: Category) => cat.isActive))
        }
      } catch (err) {
        console.error("Error fetching categories:", err)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  const fetchUnreadNotifications = async () => {
    try {
      const token = localStorage.getItem("customerToken")
      if (!token) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"}/api/notifications/customer?unreadOnly=true&limit=1`, {
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

  const handleLogout = () => {
    localStorage.removeItem("customerToken")
    localStorage.removeItem("customerData")
    setIsLoggedIn(false)
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event("auth-change"))
    router.push("/")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="border-b border-border bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-10 items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2 sm:gap-4">
              <a
                href="tel:18001239336"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <span className="hidden sm:inline">1800 123 9336</span>
                <span className="sm:hidden">Call Us</span>
              </a>
              <span className="hidden text-muted-foreground md:inline">|</span>
              <a
                href="mailto:SUPPORT@ELECOBUY.COM"
                className="hidden text-muted-foreground hover:text-foreground md:inline"
              >
                SUPPORT@ELECOBUY.COM
              </a>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* <Link
                href="/store-location"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <MapPin className="h-3 w-3" />
                <span className="hidden sm:inline">Store Location</span>
              </Link> */}
              {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                      <User className="h-3 w-3" />
                      <span className="hidden sm:inline">{customerName || "My Account"}</span>
                      <span className="sm:hidden">Account</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 border-b border-border">
                      <p className="text-sm font-semibold text-foreground">{customerName || "My Account"}</p>
                      <p className="text-xs text-muted-foreground">Customer Account</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/orders" className="flex items-center gap-2 cursor-pointer">
                        <Package className="h-4 w-4" />
                        Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/addresses" className="flex items-center gap-2 cursor-pointer">
                        <MapPin className="h-4 w-4" />
                        Address
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" />
                        Account Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/support" className="flex items-center gap-2 cursor-pointer">
                        <Info className="h-4 w-4" />
                        Support Tickets
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <User className="h-3 w-3" />
                  <span className="hidden sm:inline">Sign in or Register</span>
                  <span className="sm:hidden">Account</span>
                </Link>
              )}
              <button className="text-muted-foreground hover:text-foreground">
                <Globe className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Elecobuy"
              width={160}
              height={48}
              className="h-10 sm:h-12 w-auto"
              priority
            />
          </Link>

          <div className="hidden flex-1 max-w-2xl md:block">
            <SearchBar />
          </div>

          <div className="flex items-center gap-1 sm:gap-4">
            {isLoggedIn && (
              <Link href="/dashboard/notifications">
                <Button variant="ghost" size="icon" className="relative text-foreground h-9 w-9 sm:h-10 sm:w-10">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  {unreadNotifications > 0 && (
                    <Badge className="absolute -right-1 -top-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-destructive">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}
            <Link href="/wishlist">
              <Button variant="ghost" size="icon" className="relative text-foreground h-9 w-9 sm:h-10 sm:w-10">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                {wishlistCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                    {wishlistCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative text-foreground h-9 w-9 sm:h-10 sm:w-10">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                <Badge className="absolute -right-1 -top-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {cartCount}
                </Badge>
              </Button>
            </Link>
            {/* <div className="hidden sm:block text-sm font-medium whitespace-nowrap">Rs. 0.00</div> */}

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[380px] p-0 flex flex-col">
                {/* Header Section */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
                  <div className="flex items-center">
                    <Image
                      src="/logo.png"
                      alt="Elecobuy"
                      width={140}
                      height={42}
                      className="h-10 w-auto"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 rounded-full hover:bg-primary/10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Navigation Content */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                  {/* Main Navigation */}
                  <div className="space-y-1 mb-6">
                    <Link
                      href="/"
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors group"
                      onClick={() => setIsOpen(false)}
                    >
                      <Home className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span>Home</span>
                    </Link>
                    <Link
                      href="/products"
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors group"
                      onClick={() => setIsOpen(false)}
                    >
                      <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span>Products</span>
                    </Link>
                    <Link
                      href="/contact"
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors group"
                      onClick={() => setIsOpen(false)}
                    >
                      <Mail className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span>Contact</span>
                    </Link>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-border my-4" />

                  {/* User Section */}
                  {isLoggedIn ? (
                    <div className="space-y-1 mb-6">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors group"
                        onClick={() => setIsOpen(false)}
                      >
                        <LayoutDashboard className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span>My Dashboard</span>
                      </Link>
                      <Link
                        href="/dashboard/orders"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors group"
                        onClick={() => setIsOpen(false)}
                      >
                        <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span>My Orders</span>
                      </Link>
                      <Link
                        href="/dashboard/notifications"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors group relative"
                        onClick={() => setIsOpen(false)}
                      >
                        <Bell className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span>Notifications</span>
                        {unreadNotifications > 0 && (
                          <Badge className="ml-auto h-5 min-w-5 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center px-1.5">
                            {unreadNotifications > 9 ? "9+" : unreadNotifications}
                          </Badge>
                        )}
                      </Link>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <Link
                        href="/login"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors group"
                        onClick={() => setIsOpen(false)}
                      >
                        <User className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span>Sign in / Sign up</span>
                      </Link>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="h-px bg-border my-4" />

                  {/* Additional Links */}
                  <div className="space-y-1">
                    <Link
                      href="/learning-center"
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors group"
                      onClick={() => setIsOpen(false)}
                    >
                      <Info className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span>Learning Center</span>
                    </Link>
                    <Link
                      href="/become-seller"
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors group"
                      onClick={() => setIsOpen(false)}
                    >
                      <Store className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span>Become a Seller</span>
                    </Link>
                  </div>

                  {/* Logout Button (if logged in) */}
                  {isLoggedIn && (
                    <>
                      <div className="h-px bg-border my-4" />
                      <button
                        onClick={() => {
                          handleLogout()
                          setIsOpen(false)
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-destructive hover:bg-destructive/10 transition-colors w-full group"
                      >
                        <LogOut className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                        <span>Logout</span>
                      </button>
                    </>
                  )}
                </nav>

                {/* Footer Section */}
                <div className="p-4 border-t border-border bg-muted/30">
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <a
                      href="tel:18001239336"
                      className="flex items-center gap-2 hover:text-foreground transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <span>📞</span>
                      <span>1800 123 9336</span>
                    </a>
                    <a
                      href="mailto:SUPPORT@ELECOBUY.COM"
                      className="flex items-center gap-2 hover:text-foreground transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <span>✉️</span>
                      <span>SUPPORT@ELECOBUY.COM</span>
                    </a>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <SearchBar mobile={true} />
        </div>
      </div>

      <div className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex h-10 sm:h-12 items-center justify-between overflow-x-auto">
            <div className="hidden items-center gap-4 lg:gap-6 md:flex">
              <Link href="/" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                Home
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="text-sm font-medium hover:text-primary whitespace-nowrap flex items-center gap-1 outline-none">
                  Products
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/products" className="cursor-pointer">
                      All Products
                    </Link>
                  </DropdownMenuItem>
                  {categories.length > 0 && <DropdownMenuSeparator />}
                  {loadingCategories ? (
                    <DropdownMenuItem disabled>
                      <span className="text-sm text-muted-foreground">Loading categories...</span>
                    </DropdownMenuItem>
                  ) : (
                    categories.map((category) => (
                      <DropdownMenuItem key={category._id} asChild>
                        <Link href={`/products?category=${category.slug}`} className="cursor-pointer">
                          {category.name}
                        </Link>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {isLoggedIn && (
                <Link href="/dashboard/orders" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                  My Orders
                </Link>
              )}
              <Link href="/learning-center" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                Learning Center
              </Link>
              <Link href="/contact" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                Contact Us
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
