"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { Input } from "@/components/ui/input"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { API_URL } from "@/lib/api-config"
import { useNavigation } from "@/contexts/navigation-context"

interface Customer {
  _id: string
  name: string
  email: string
  mobile: string
  totalOrders: number
  totalSpent: number
  lastOrderDate: string | null
  lastOrderId: string | null
}

export default function CustomersPage() {
  const router = useRouter()
  const { setSelectedCustomerId } = useNavigation()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/vendor/orders/customers`, {
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
        setError(data.message || "Failed to load customers")
        return
      }

      setCustomers(data.data || [])
    } catch (err) {
      console.error("Error fetching customers:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "No orders"
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return `${Math.floor(diffDays / 7)}w ago`
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`
    }
    return `₹${amount.toLocaleString("en-IN")}`
  }

  const formatPhone = (mobile: string) => {
    if (mobile.length === 12 && mobile.startsWith("91")) {
      return `+91 ${mobile.slice(2, 7)} ${mobile.slice(7)}`
    }
    return mobile
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.mobile.includes(searchQuery)
  )

  const stats = [
    {
      label: "Total Customers",
      value: customers.length.toString(),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      color: "primary",
    },
    {
      label: "Active",
      value: customers.filter((c) => c.totalOrders > 0).length.toString(),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: "chart-3",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(customers.reduce((sum, c) => sum + c.totalSpent, 0)),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: "chart-2",
    },
  ]

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/10 via-primary/5 to-background">
      {/* Header - Fixed at top */}
      <div className="flex-none bg-white shadow-md safe-top sticky top-0 z-10" style={{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Customers</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your customer base</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground z-10"
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
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-gradient-to-r from-muted/60 to-muted/40 border-border/50 rounded-2xl shadow-sm focus:shadow-md transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 space-y-5" style={{ paddingBottom: `calc(7rem + env(safe-area-inset-bottom, 0px))` }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-gradient-to-br from-destructive/10 to-destructive/5 border-2 border-destructive/20 shadow-xl p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive flex-1">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchCustomers} className="ml-auto rounded-full">
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {stats.map((stat, index) => {
                const colorMap: Record<string, { bg: string; icon: string; gradient: string }> = {
                  primary: { bg: "bg-primary/10", icon: "text-primary", gradient: "from-primary/20 to-primary/10" },
                  "chart-3": { bg: "bg-chart-3/10", icon: "text-chart-3", gradient: "from-chart-3/20 to-chart-3/10" },
                  "chart-2": { bg: "bg-chart-2/10", icon: "text-chart-2", gradient: "from-chart-2/20 to-chart-2/10" },
                }
                const colors = colorMap[stat.color] || colorMap.primary
                return (
                  <div
                    key={index}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-card/95 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-border/30"
                  >
                    {/* Decorative gradient overlay */}
                    <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-20 ${colors.bg.replace('/10', '')}`}></div>
                    <CardContent className="p-4 text-center relative z-10">
                      <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${colors.bg} shadow-lg`}>
                        <span className={colors.icon}>{stat.icon}</span>
                      </div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 truncate">{stat.label}</p>
                      <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    </CardContent>
                  </div>
                )
              })}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                    <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  All Customers
                </h2>
                <span className="text-xs font-semibold text-muted-foreground px-3 py-1.5 rounded-full bg-muted/30">
                  {filteredCustomers.length} total
                </span>
              </div>
              {filteredCustomers.length === 0 ? (
                <div className="rounded-3xl bg-gradient-to-br from-card via-card to-card/95 shadow-xl border border-border/30 overflow-hidden p-12 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/30">
                    <svg className="h-10 w-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No customers found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCustomers.map((customer, index) => (
                    <button
                      key={customer._id}
                      onClick={() => {
                        setSelectedCustomerId(customer._id)
                        router.push("/customer-detail")
                      }}
                      className="w-full text-left"
                    >
                      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-card/95 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-border/30 group">
                        {/* Decorative gradient overlay */}
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 bg-primary/20"></div>
                        <CardContent className="p-5 relative z-10">
                          <div className="flex items-start gap-4">
                            <div className="relative flex-shrink-0">
                              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white text-lg font-bold shadow-xl shadow-primary/40 group-hover:scale-110 transition-transform">
                                {customer.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </div>
                              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-3 border-white bg-gradient-to-br from-chart-3 to-chart-3/80 shadow-lg" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="mb-3">
                                <p className="text-base font-bold text-foreground truncate mb-1">{customer.name}</p>
                                <p className="text-xs text-muted-foreground truncate mb-0.5">{customer.email}</p>
                                <p className="text-xs font-medium text-muted-foreground truncate">{formatPhone(customer.mobile)}</p>
                              </div>
                              <div className="flex items-center justify-between pt-3 border-t border-border/30">
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                      />
                                    </svg>
                                    <span>{customer.totalOrders}</span>
                                  </span>
                                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                                  <span className="text-xs text-muted-foreground font-medium">{formatTimeAgo(customer.lastOrderDate)}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-base font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                                    {formatCurrency(customer.totalSpent)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
