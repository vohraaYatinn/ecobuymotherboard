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
  ordersByStatusOverTime: Array<{
    date: string
    processing: number
    shipped: number
    delivered_return_open: number
    delivered_return_over: number
    cancelled: number
    return_accepted: number
  }>
  ordersByStatus: {
    processing: number
    shipped: number
    delivered_return_open: number
    delivered_return_over: number
    cancelled: number
    return_accepted: number
  }
  revenueByStatus: {
    processing: number
    shipped: number
    delivered_return_open: number
    delivered_return_over: number
    cancelled: number
    return_accepted: number
  }
}

interface Order {
  subtotal?: number
  total?: number
  status?: string
}

export default function ReportsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [period, setPeriod] = useState("30d")
  const [vendorCommission, setVendorCommission] = useState<number | null>(null)
  const [manualReturnAcceptedRevenue, setManualReturnAcceptedRevenue] = useState(0)

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const toNumber = (value: any) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
  }

  const normalizeOrdersByStatus = (raw: any = {}) => ({
    processing: toNumber(raw.processing ?? raw.processing_count),
    shipped: toNumber(raw.shipped ?? raw.shipped_count),
    delivered_return_open: toNumber(raw.delivered_return_open ?? raw.deliveredReturnOpen),
    delivered_return_over: toNumber(raw.delivered_return_over ?? raw.deliveredReturnOver),
    cancelled: toNumber(raw.cancelled ?? raw.cancelled_count),
    return_accepted: toNumber(raw.return_accepted ?? raw.returnAccepted ?? raw.return_accepted_count ?? raw.returnAcceptedCount),
  })

  const normalizeRevenueByStatus = (raw: any = {}) => ({
    processing: toNumber(raw.processing ?? raw.processing_amount),
    shipped: toNumber(raw.shipped ?? raw.shipped_amount),
    delivered_return_open: toNumber(raw.delivered_return_open ?? raw.deliveredReturnOpen),
    delivered_return_over: toNumber(raw.delivered_return_over ?? raw.deliveredReturnOver),
    cancelled: toNumber(raw.cancelled ?? raw.cancelled_amount),
    return_accepted: toNumber(raw.return_accepted ?? raw.returnAccepted ?? raw.return_accepted_amount ?? raw.returnAcceptedAmount),
  })

  const normalizeOrdersByStatusOverTime = (list: any[] = []) =>
    list.map((entry) => ({
      date: entry.date,
      processing: toNumber(entry.processing ?? entry.processing_count),
      shipped: toNumber(entry.shipped ?? entry.shipped_count),
      delivered_return_open: toNumber(entry.delivered_return_open ?? entry.deliveredReturnOpen),
      delivered_return_over: toNumber(entry.delivered_return_over ?? entry.deliveredReturnOver),
      cancelled: toNumber(entry.cancelled ?? entry.cancelled_count),
      return_accepted: toNumber(entry.return_accepted ?? entry.returnAccepted ?? entry.return_accepted_count ?? entry.returnAcceptedCount),
    }))

  const normalizeOverTimeSeries = (list: any[] = [], valueKey: string) =>
    list.map((entry) => ({
      date: entry.date,
      [valueKey]: toNumber(entry[valueKey]),
    }))

  const getCommissionRate = (commissionValue?: number | null) => {
    if (typeof commissionValue === "number") return commissionValue
    return 0
  }

  const calculateNetPayout = (order: Order, commissionValue?: number | null) => {
    const PAYMENT_GATEWAY_RATE = 2
    const commissionRate = getCommissionRate(commissionValue)
    const productTotal = toNumber(typeof order.subtotal === "number" ? order.subtotal : order.total)
    const commissionAmount = Math.max(0, (commissionRate / 100) * productTotal)
    const payoutBeforeGateway = Math.max(productTotal - commissionAmount, 0)
    const gatewayFees = Math.max(0, (PAYMENT_GATEWAY_RATE / 100) * payoutBeforeGateway)
    const netPayout = Math.max(payoutBeforeGateway - gatewayFees, 0)
    return netPayout
  }

  const fetchVendorProfile = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/vendor-auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const commissionValue = data.data?.vendor?.commission
        if (typeof commissionValue === "number") {
          setVendorCommission(commissionValue)
          return commissionValue
        }
      }
    } catch (err) {
      console.error("Error fetching vendor profile:", err)
    }
    setVendorCommission(null)
    return null
  }

  const fetchReturnAcceptedRevenue = async (token: string, commissionValue?: number | null) => {
    try {
      let total = 0

      // Fetch orders with status "return_accepted"
      const paramsAccepted = new URLSearchParams({
        status: "return_accepted",
        page: "1",
        limit: "200",
      })

      const responseAccepted = await fetch(`${API_URL}/api/vendor/orders?${paramsAccepted.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const dataAccepted = await responseAccepted.json()
      if (responseAccepted.ok && dataAccepted.success) {
        const orders: Order[] = dataAccepted.data || []
        total += orders.reduce((sum, order) => sum + calculateNetPayout(order, commissionValue), 0)
      }

      // Fetch orders with status "return_picked_up"
      const paramsPickedUp = new URLSearchParams({
        status: "return_picked_up",
        page: "1",
        limit: "200",
      })

      const responsePickedUp = await fetch(`${API_URL}/api/vendor/orders?${paramsPickedUp.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const dataPickedUp = await responsePickedUp.json()
      if (responsePickedUp.ok && dataPickedUp.success) {
        const orders: Order[] = dataPickedUp.data || []
        total += orders.reduce((sum, order) => sum + calculateNetPayout(order, commissionValue), 0)
      }

      return total
    } catch (err) {
      console.error("Error fetching return accepted revenue:", err)
      return 0
    }
  }

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      // Get commission first for accurate payout calculation
      const commissionValue = await fetchVendorProfile(token)
      const returnAcceptedRevenue = await fetchReturnAcceptedRevenue(token, commissionValue)

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

      const normalizedRevenueByStatus = normalizeRevenueByStatus(data.data?.revenueByStatus)
      const normalizedOrdersByStatus = normalizeOrdersByStatus(data.data?.ordersByStatus)
      const normalizedOrdersByStatusOverTime = normalizeOrdersByStatusOverTime(data.data?.ordersByStatusOverTime)
      const normalizedRevenueOverTime = normalizeOverTimeSeries(data.data?.revenueOverTime, "revenue")
      const normalizedOrdersOverTime = normalizeOverTimeSeries(data.data?.ordersOverTime, "orders")

      const mergedRevenueByStatus = {
        ...normalizedRevenueByStatus,
        return_accepted: Math.max(normalizedRevenueByStatus.return_accepted, returnAcceptedRevenue),
      }

      setManualReturnAcceptedRevenue(returnAcceptedRevenue)

      setAnalytics({
        period: data.data?.period ?? period,
        summary: {
          totalRevenue: toNumber(data.data?.summary?.totalRevenue),
          totalOrders: toNumber(data.data?.summary?.totalOrders),
          avgOrderValue: toNumber(data.data?.summary?.avgOrderValue),
        },
        revenueOverTime: normalizedRevenueOverTime,
        ordersOverTime: normalizedOrdersOverTime,
        ordersByStatusOverTime: normalizedOrdersByStatusOverTime,
        ordersByStatus: normalizedOrdersByStatus,
        revenueByStatus: mergedRevenueByStatus,
      })
    } catch (err) {
      console.error("Error fetching analytics:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
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
    processing: "#f59e0b", // Orange - Processing/Accepted
    shipped: "#3b82f6", // Blue - Shipped/Packed
    delivered_return_open: "#fbbf24", // Yellow - Delivered but return period open
    delivered_return_over: "#10b981", // Green - Delivered return period over
    cancelled: "#ef4444", // Red - Cancelled
    return_accepted: "#8b5cf6", // Purple - Return accepted
  }

  const statusLabels = {
    processing: "Processing/Accepted",
    shipped: "Shipped/Packed",
    delivered_return_open: "Delivered (Return Open)",
    delivered_return_over: "Delivered (Return Over)",
    cancelled: "Cancelled",
    return_accepted: "Return Accepted",
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

  // Prepare data for pie chart with all detailed statuses
  const statusData = [
    { name: statusLabels.processing, value: analytics.ordersByStatus.processing, color: statusColors.processing, key: "processing" },
    { name: statusLabels.shipped, value: analytics.ordersByStatus.shipped, color: statusColors.shipped, key: "shipped" },
    { name: statusLabels.delivered_return_open, value: analytics.ordersByStatus.delivered_return_open, color: statusColors.delivered_return_open, key: "delivered_return_open" },
    { name: statusLabels.delivered_return_over, value: analytics.ordersByStatus.delivered_return_over, color: statusColors.delivered_return_over, key: "delivered_return_over" },
    { name: statusLabels.cancelled, value: analytics.ordersByStatus.cancelled, color: statusColors.cancelled, key: "cancelled" },
    { name: statusLabels.return_accepted, value: analytics.ordersByStatus.return_accepted, color: statusColors.return_accepted, key: "return_accepted" },
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

         {/* Revenue by Status - Detailed Cards */}
         <div>
           <h2 className="text-base font-bold mb-3 px-1">Revenue by Status</h2>
           <div className="grid grid-cols-2 gap-3">
             <Card className="border-2 border-border/50 bg-card shadow-md">
               <CardContent className="p-4">
                 <div className="flex items-center gap-2 mb-2">
                   <div className="h-4 w-4 rounded-full" style={{ backgroundColor: statusColors.processing }} />
                   <span className="text-xs font-medium text-muted-foreground">{statusLabels.processing}</span>
                 </div>
                 <p className="text-lg font-bold text-foreground">{formatCurrency(analytics.revenueByStatus.processing)}</p>
               </CardContent>
             </Card>
             <Card className="border-2 border-border/50 bg-card shadow-md">
               <CardContent className="p-4">
                 <div className="flex items-center gap-2 mb-2">
                   <div className="h-4 w-4 rounded-full" style={{ backgroundColor: statusColors.shipped }} />
                   <span className="text-xs font-medium text-muted-foreground">{statusLabels.shipped}</span>
                 </div>
                 <p className="text-lg font-bold text-foreground">{formatCurrency(analytics.revenueByStatus.shipped)}</p>
               </CardContent>
             </Card>
             <Card className="border-2 border-border/50 bg-card shadow-md">
               <CardContent className="p-4">
                 <div className="flex items-center gap-2 mb-2">
                   <div className="h-4 w-4 rounded-full" style={{ backgroundColor: statusColors.delivered_return_open }} />
                   <span className="text-xs font-medium text-muted-foreground">{statusLabels.delivered_return_open}</span>
                 </div>
                 <p className="text-lg font-bold text-foreground">{formatCurrency(analytics.revenueByStatus.delivered_return_open)}</p>
               </CardContent>
             </Card>
             <Card className="border-2 border-chart-3/50 bg-card shadow-md" style={{ borderColor: statusColors.delivered_return_over }}>
               <CardContent className="p-4">
                 <div className="flex items-center gap-2 mb-2">
                   <div className="h-4 w-4 rounded-full" style={{ backgroundColor: statusColors.delivered_return_over }} />
                   <span className="text-xs font-medium text-muted-foreground">{statusLabels.delivered_return_over}</span>
                 </div>
                 <p className="text-lg font-bold text-chart-3">{formatCurrency(analytics.revenueByStatus.delivered_return_over)}</p>
               </CardContent>
             </Card>
             <Card className="border-2 border-border/50 bg-card shadow-md">
               <CardContent className="p-4">
                 <div className="flex items-center gap-2 mb-2">
                   <div className="h-4 w-4 rounded-full" style={{ backgroundColor: statusColors.cancelled }} />
                   <span className="text-xs font-medium text-muted-foreground">{statusLabels.cancelled}</span>
                 </div>
                 <p className="text-lg font-bold text-foreground">{formatCurrency(analytics.revenueByStatus.cancelled)}</p>
               </CardContent>
             </Card>
             <Card className="border-2 border-border/50 bg-card shadow-md">
               <CardContent className="p-4">
                 <div className="flex items-center gap-2 mb-2">
                   <div className="h-4 w-4 rounded-full" style={{ backgroundColor: statusColors.return_accepted }} />
                   <span className="text-xs font-medium text-muted-foreground">{statusLabels.return_accepted}</span>
                 </div>
                 <p className="text-lg font-bold text-foreground">{formatCurrency(analytics.revenueByStatus.return_accepted)}</p>
               </CardContent>
             </Card>
           </div>
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

        {/* Orders Over Time - Stacked by Status */}
        <Card className="border-2 border-border/50 bg-card shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Orders Over Time (By Status)</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.ordersByStatusOverTime && analytics.ordersByStatusOverTime.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p className="text-sm">No data available for this period</p>
              </div>
            ) : (
              <ChartContainer config={ordersConfig} className="h-[300px] w-full">
                <BarChart 
                  data={analytics.ordersByStatusOverTime?.map((item) => ({ ...item, date: formatDate(item.date) })) || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--border))"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--border))"
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: any, name: string) => {
                      const label = statusLabels[name as keyof typeof statusLabels] || name
                      return [value, label]
                    }}
                  />
                  <Legend 
                    formatter={(value: string) => statusLabels[value as keyof typeof statusLabels] || value}
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                    iconType="square"
                  />
                  <Bar dataKey="processing" stackId="a" fill={statusColors.processing} />
                  <Bar dataKey="shipped" stackId="a" fill={statusColors.shipped} />
                  <Bar dataKey="delivered_return_open" stackId="a" fill={statusColors.delivered_return_open} />
                  <Bar dataKey="delivered_return_over" stackId="a" fill={statusColors.delivered_return_over} />
                  <Bar dataKey="cancelled" stackId="a" fill={statusColors.cancelled} />
                  <Bar dataKey="return_accepted" stackId="a" fill={statusColors.return_accepted} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status - Detailed Breakdown */}
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
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value: any, name: string) => [value, statusLabels[name as keyof typeof statusLabels] || name]}
                    />
                    <Legend 
                      formatter={(value: string) => statusLabels[value as keyof typeof statusLabels] || value}
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-2">
                  {statusData.map((item) => (
                    <div key={item.key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <p className="text-sm font-bold">{item.value} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      <BottomNav />
    </div>
  )
}

