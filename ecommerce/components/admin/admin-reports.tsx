"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle, FileText, Calendar, TrendingUp, Package, Truck, CheckCircle, Clock, Download } from "lucide-react"
import { AdminVendorAnalytics } from "./admin-vendor-analytics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.safartax.com"

interface YesterdaySummary {
  ordersReceived: number
  ordersDispatched: number
  ordersPending: number
  ordersDelivered: number
  ordersDeliveredYesterday: number
  date: string
}

interface DailyOrder {
  date: string
  orders: number
  revenue: number
}

interface WeeklyOrder {
  week: string
  weekNumber: number
  year: number
  orders: number
  revenue: number
  startDate: string
}

interface MonthlyOrder {
  month: string
  monthNumber: number
  year: number
  orders: number
  revenue: number
}

interface Order {
  _id: string
  orderNumber: string
  customerId: {
    _id: string
    name?: string
    mobile: string
    email?: string
  }
  subtotal?: number
  shipping?: number
  total: number
  status: string
  paymentStatus: string
  paymentMethod?: string
  createdAt: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
}

export function AdminReports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [yesterdaySummary, setYesterdaySummary] = useState<YesterdaySummary | null>(null)
  const [dailyOrders, setDailyOrders] = useState<DailyOrder[]>([])
  const [weeklyOrders, setWeeklyOrders] = useState<WeeklyOrder[]>([])
  const [monthlyOrders, setMonthlyOrders] = useState<MonthlyOrder[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [dateRangeApplied, setDateRangeApplied] = useState(false)

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    fetchOrdersReport()
  }, [ordersPage, startDate, endDate])

  const fetchAllData = async (useDateRange = false) => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("adminToken")
      if (!token) {
        setError("Authentication required")
        return
      }

      // Build query params
      const params = new URLSearchParams()
      if (useDateRange && startDate && endDate) {
        // Calculate days/weeks/months based on date range
        const start = new Date(startDate)
        const end = new Date(endDate)
        const diffTime = Math.abs(end.getTime() - start.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        params.append("startDate", startDate)
        params.append("endDate", endDate)
      } else {
        // Default values
        params.append("days", "30")
        params.append("weeks", "12")
        params.append("months", "12")
      }

      // Fetch all data in parallel
      const [summaryRes, dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/reports/yesterday-summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/reports/daily-orders?${useDateRange && startDate && endDate ? `startDate=${startDate}&endDate=${endDate}` : "days=30"}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/reports/weekly-orders?${useDateRange && startDate && endDate ? `startDate=${startDate}&endDate=${endDate}` : "weeks=12"}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/reports/monthly-orders?${useDateRange && startDate && endDate ? `startDate=${startDate}&endDate=${endDate}` : "months=12"}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const [summaryData, dailyData, weeklyData, monthlyData] = await Promise.all([
        summaryRes.json(),
        dailyRes.json(),
        weeklyRes.json(),
        monthlyRes.json(),
      ])

      if (summaryData.success) {
        setYesterdaySummary(summaryData.data)
      }

      if (dailyData.success) {
        setDailyOrders(dailyData.data)
      }

      if (weeklyData.success) {
        setWeeklyOrders(weeklyData.data)
      }

      if (monthlyData.success) {
        setMonthlyOrders(monthlyData.data)
      }
    } catch (err) {
      console.error("Error fetching reports data:", err)
      setError("Failed to load reports data")
    } finally {
      setLoading(false)
    }
  }

  const applyDateRange = () => {
    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        setError("Start date must be before end date")
        return
      }
      setDateRangeApplied(true)
      fetchAllData(true)
      setOrdersPage(1)
      fetchOrdersReport()
    } else {
      setError("Please select both start and end dates")
    }
  }

  const clearDateRange = () => {
    setStartDate("")
    setEndDate("")
    setDateRangeApplied(false)
    fetchAllData(false)
    setOrdersPage(1)
    fetchOrdersReport()
  }

  const fetchOrdersReport = async () => {
    try {
      setOrdersLoading(true)
      const token = localStorage.getItem("adminToken")
      if (!token) return

      let url = `${API_URL}/api/admin/reports/orders?page=${ordersPage}&limit=50`
      if (dateRangeApplied && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()

      if (data.success) {
        setAllOrders(data.data)
        setTotalOrders(data.pagination.total)
      }
    } catch (err) {
      console.error("Error fetching orders report:", err)
    } finally {
      setOrdersLoading(false)
    }
  }

  const handleExportOrders = async (format: "csv" | "json" = "csv") => {
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) return

      // Fetch all orders for export (not paginated)
      let url = `${API_URL}/api/admin/reports/orders?limit=10000`
      if (dateRangeApplied && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()

      if (!data.success) {
        setError("Failed to fetch orders for export")
        return
      }

      const orders = data.data

      if (format === "csv") {
        // Generate CSV
        const csvRows = []
        
        // Header
        csvRows.push([
          "Order Number",
          "Date",
          "Customer Name",
          "Customer Email",
          "Customer Mobile",
          "Status",
          "Payment Status",
          "Payment Method",
          "Subtotal",
          "Shipping",
          "Total",
          "Items",
        ].join(","))

        // Data rows
        orders.forEach((order: Order) => {
          const customer = typeof order.customerId === "object" ? order.customerId : null
          const items = order.items?.map((item) => `${item.name} (x${item.quantity})`).join("; ") || ""
          csvRows.push([
            order.orderNumber || "",
            new Date(order.createdAt).toISOString().split("T")[0],
            customer?.name || "",
            customer?.email || "",
            customer?.mobile || "",
            order.status || "",
            order.paymentStatus || "",
            order.paymentMethod || "N/A",
            order.subtotal || 0,
            order.shipping || 0,
            order.total || 0,
            `"${items}"`,
          ].join(","))
        })

        const csv = csvRows.join("\n")

        // Download CSV
        const blob = new Blob([csv], { type: "text/csv" })
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = downloadUrl
        link.download = `orders-report-${dateRangeApplied ? `${startDate}-to-${endDate}-` : ""}${Date.now()}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
      } else {
        // JSON format
        const jsonStr = JSON.stringify(orders, null, 2)
        const blob = new Blob([jsonStr], { type: "application/json" })
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = downloadUrl
        link.download = `orders-report-${dateRangeApplied ? `${startDate}-to-${endDate}-` : ""}${Date.now()}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
      }
    } catch (err) {
      console.error("Error exporting orders:", err)
      setError("Failed to export orders")
    }
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "processing":
        return "bg-purple-100 text-purple-800"
      case "shipped":
        return "bg-indigo-100 text-indigo-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Order analytics and insights</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Order analytics and insights</p>
        </div>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Order analytics and insights</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Date Range</CardTitle>
          <CardDescription>Filter reports by date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setError("")
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setError("")
                }}
                min={startDate}
              />
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
                <Button onClick={applyDateRange} disabled={!startDate || !endDate}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Apply Filter
                </Button>
                {dateRangeApplied && (
                  <Button variant="outline" onClick={clearDateRange}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              {dateRangeApplied && (
                <div className="text-sm text-muted-foreground pt-2">
                  Filtered: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive mt-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yesterday's Summary */}
      {yesterdaySummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders Received</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{yesterdaySummary.ordersReceived}</div>
              <p className="text-xs text-muted-foreground">Yesterday ({yesterdaySummary.date})</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders Dispatched</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{yesterdaySummary.ordersDispatched}</div>
              <p className="text-xs text-muted-foreground">Shipped yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{yesterdaySummary.ordersPending}</div>
              <p className="text-xs text-muted-foreground">Currently pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{yesterdaySummary.ordersDelivered}</div>
              <p className="text-xs text-muted-foreground">
                {yesterdaySummary.ordersDeliveredYesterday} delivered yesterday
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="vendor-analytics">Vendor Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Daily Orders
                {dateRangeApplied && startDate && endDate
                  ? ` (${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()})`
                  : " (Last 30 Days)"}
              </CardTitle>
              <CardDescription>Order volume and revenue trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={dailyOrders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    stroke="#8884d8"
                    name="Orders"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#82ca9d"
                    name="Revenue (₹)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Orders Bar Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dailyOrders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#8884d8" name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Weekly Orders
                {dateRangeApplied && startDate && endDate
                  ? ` (${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()})`
                  : " (Last 12 Weeks)"}
              </CardTitle>
              <CardDescription>Weekly order volume and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={weeklyOrders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    stroke="#8884d8"
                    name="Orders"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#82ca9d"
                    name="Revenue (₹)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Orders Bar Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={weeklyOrders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#8884d8" name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Monthly Orders
                {dateRangeApplied && startDate && endDate
                  ? ` (${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()})`
                  : " (Last 12 Months)"}
              </CardTitle>
              <CardDescription>Monthly order volume and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlyOrders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    stroke="#8884d8"
                    name="Orders"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#82ca9d"
                    name="Revenue (₹)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Orders Bar Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyOrders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#8884d8" name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendor-analytics" className="space-y-4">
          <AdminVendorAnalytics />
        </TabsContent>
      </Tabs>

      {/* Full Orders Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Full Orders Report</CardTitle>
              <CardDescription>
                Complete list of all orders ({totalOrders.toLocaleString()} total)
                {dateRangeApplied && startDate && endDate && (
                  <span className="ml-2 text-xs">
                    (Filtered: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()})
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExportOrders("csv")}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportOrders("json")}>
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : allOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No orders found</p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 text-sm font-medium">Order #</th>
                      <th className="text-left p-2 text-sm font-medium">Customer</th>
                      <th className="text-left p-2 text-sm font-medium">Date</th>
                      <th className="text-left p-2 text-sm font-medium">Total</th>
                      <th className="text-left p-2 text-sm font-medium">Status</th>
                      <th className="text-left p-2 text-sm font-medium">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrders.map((order) => {
                      const customer = typeof order.customerId === "object" ? order.customerId : null
                      return (
                        <tr key={order._id} className="border-b border-border hover:bg-muted/50">
                          <td className="p-2 text-sm font-medium">{order.orderNumber}</td>
                          <td className="p-2 text-sm">
                            {customer?.name || "N/A"}
                            <br />
                            <span className="text-xs text-muted-foreground">{customer?.mobile || "N/A"}</span>
                          </td>
                          <td className="p-2 text-sm">{formatDate(order.createdAt)}</td>
                          <td className="p-2 text-sm font-medium">{formatCurrency(order.total)}</td>
                          <td className="p-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="p-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                order.paymentStatus === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : order.paymentStatus === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalOrders > 50 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {Math.min((ordersPage - 1) * 50 + 1, totalOrders)} -{" "}
                    {Math.min(ordersPage * 50, totalOrders)} of {totalOrders} orders
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                      disabled={ordersPage === 1}
                      className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setOrdersPage((p) => p + 1)}
                      disabled={ordersPage * 50 >= totalOrders}
                      className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}











