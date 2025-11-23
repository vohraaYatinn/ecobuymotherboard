"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, AlertCircle, TrendingUp, ShoppingBag, DollarSign, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { API_URL } from "@/lib/api-config"

interface AnalyticsData {
  period: string
  summary: {
    totalRevenue: number
    totalOrders: number
    avgOrderValue: number
  }
  revenueOverTime: Array<{ date: string; revenue: number }>
  ordersOverTime: Array<{ date: string; orders: number }>
  ordersByStatus: {
    processing: number
    shipped: number
    delivered: number
    cancelled: number
  }
  revenueByStatus: {
    processing: number
    shipped: number
    delivered: number
  }
}

export default function ReportsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [period, setPeriod] = useState("30d")

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/vendor/orders/analytics?period=${period}`, {
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
        setError(data.message || "Failed to load analytics data")
        return
      }

      setAnalytics(data.data)
    } catch (err) {
      console.error("Error fetching analytics:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`
    }
    return `₹${amount.toLocaleString("en-IN")}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleDateString("en-IN", { month: "short" })
    return `${day} ${month}`
  }

  const revenueConfig = {
    revenue: {
      label: "Revenue",
      color: "oklch(0.7 0.2 150)",
    },
  }

  const ordersConfig = {
    orders: {
      label: "Orders",
      color: "oklch(0.7 0.15 250)",
    },
  }

  const statusColors = {
    processing: "#f59e0b", // chart-5 equivalent
    shipped: "#3b82f6", // primary equivalent
    delivered: "#10b981", // chart-3 equivalent
    cancelled: "#ef4444", // destructive equivalent
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col" style={{ paddingBottom: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}>
        <div className="sticky top-0 z-10 border-b border-border/50 bg-card/95 backdrop-blur-xl shadow-sm safe-top" style={{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }}>
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <svg className="h-4 w-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Reports & Analytics</h1>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col" style={{ paddingBottom: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}>
        <div className="sticky top-0 z-10 border-b border-border/50 bg-card/95 backdrop-blur-xl shadow-sm safe-top" style={{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }}>
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <svg className="h-4 w-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Reports & Analytics</h1>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="border-destructive/50 bg-destructive/10 w-full max-w-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchAnalytics} className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!analytics) return null

  // Prepare data for pie chart
  const statusData = [
    { name: "Processing", value: analytics.ordersByStatus.processing, color: statusColors.processing },
    { name: "Shipped", value: analytics.ordersByStatus.shipped, color: statusColors.shipped },
    { name: "Delivered", value: analytics.ordersByStatus.delivered, color: statusColors.delivered },
    { name: "Cancelled", value: analytics.ordersByStatus.cancelled, color: statusColors.cancelled },
  ].filter((item) => item.value > 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col" style={{ paddingBottom: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-card/95 backdrop-blur-xl shadow-sm safe-top" style={{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }}>
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <svg className="h-4 w-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Reports & Analytics</h1>
              <p className="text-xs text-muted-foreground">Performance insights</p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full max-w-[200px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-2 border-border/50 bg-card shadow-md">
            <CardContent className="p-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-3/10 mx-auto mb-2">
                <DollarSign className="h-5 w-5 text-chart-3" />
              </div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(analytics.summary.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-border/50 bg-card shadow-md">
            <CardContent className="p-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Orders</p>
              <p className="mt-1 text-lg font-bold text-foreground">{analytics.summary.totalOrders}</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-border/50 bg-card shadow-md">
            <CardContent className="p-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10 mx-auto mb-2">
                <TrendingUp className="h-5 w-5 text-chart-2" />
              </div>
              <p className="text-xs text-muted-foreground">Avg. Value</p>
              <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(analytics.summary.avgOrderValue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Over Time */}
        <Card className="border-2 border-border/50 bg-card shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.revenueOverTime.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p className="text-sm">No data available for this period</p>
              </div>
            ) : (
              <ChartContainer config={revenueConfig} className="h-[250px] w-full">
                <AreaChart data={analytics.revenueOverTime.map((item) => ({ ...item, date: formatDate(item.date) }))}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.7 0.2 150)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.7 0.2 150)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--border))"
                    tickFormatter={(value) => `₹${value / 1000}K`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="oklch(0.7 0.2 150)"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders Over Time */}
        <Card className="border-2 border-border/50 bg-card shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.ordersOverTime.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p className="text-sm">No data available for this period</p>
              </div>
            ) : (
              <ChartContainer config={ordersConfig} className="h-[250px] w-full">
                <BarChart data={analytics.ordersOverTime.map((item) => ({ ...item, date: formatDate(item.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--border))"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="orders" fill="oklch(0.7 0.15 250)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card className="border-2 border-border/50 bg-card shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p className="text-sm">No orders in this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                <ChartContainer config={ordersConfig} className="h-[250px] w-full">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-2">
                  {statusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="flex-1">
                        <p className="text-xs font-medium">{item.name}</p>
                        <p className="text-sm font-bold">{item.value} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Status */}
        <Card className="border-2 border-border/50 bg-card shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Revenue by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: statusColors.processing }} />
                  <span className="text-sm font-medium">Processing</span>
                </div>
                <span className="text-sm font-bold">{formatCurrency(analytics.revenueByStatus.processing)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: statusColors.shipped }} />
                  <span className="text-sm font-medium">Shipped</span>
                </div>
                <span className="text-sm font-bold">{formatCurrency(analytics.revenueByStatus.shipped)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: statusColors.delivered }} />
                  <span className="text-sm font-medium">Delivered</span>
                </div>
                <span className="text-sm font-bold text-chart-3">{formatCurrency(analytics.revenueByStatus.delivered)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}

