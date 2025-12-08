"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Loader2,
  AlertCircle,
  Download,
  Store,
  TrendingUp,
  Package,
  DollarSign,
  Users,
  Calendar,
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.34:5000"

interface Vendor {
  _id: string
  name: string
  email: string
  phone: string
  status: string
}

interface VendorAnalytics {
  vendor: Vendor
  summary: {
    totalOrders: number
    totalRevenue: number
    totalIncome: number
    avgOrderValue: number
    productCount: number
    uniqueCustomers: number
  }
  ordersByStatus: {
    pending: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
  }
  revenueByStatus: {
    pending: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
  }
  revenueOverTime: Array<{ date: string; revenue: number }>
  ordersOverTime: Array<{ date: string; orders: number }>
  paymentMethodBreakdown: {
    cod: number
    online: number
    wallet: number
  }
  orders: Array<{
    _id: string
    orderNumber: string
    customer: {
      name: string
      mobile: string
      email: string
    } | null
    total: number
    status: string
    paymentStatus: string
    paymentMethod: string
    createdAt: string
    items: Array<{
      name: string
      brand: string
      quantity: number
      price: number
    }>
  }>
}

interface TopVendor {
  vendorId: string
  vendorName: string
  vendorEmail: string
  vendorPhone: string
  vendorStatus: string
  totalProducts: number
  totalOrders: number
  deliveredOrders: number
  pendingOrders: number
  processingOrders: number
  shippedOrders: number
  totalRevenue: number
  totalIncome: number
  avgOrderValue: number
  deliveryRate: number
}

export function AdminVendorAnalytics() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendorId, setSelectedVendorId] = useState<string>("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null)
  const [topVendors, setTopVendors] = useState<TopVendor[]>([])
  const [topVendorsPeriod, setTopVendorsPeriod] = useState("all")
  const [topVendorsLoading, setTopVendorsLoading] = useState(false)

  useEffect(() => {
    fetchVendors()
    fetchTopVendors()
  }, [])

  useEffect(() => {
    if (topVendorsPeriod) {
      fetchTopVendors()
    }
  }, [topVendorsPeriod])

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/vendors?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setVendors(data.data || [])
      }
    } catch (err) {
      console.error("Error fetching vendors:", err)
    }
  }

  const fetchVendorAnalytics = async () => {
    if (!selectedVendorId) {
      setError("Please select a vendor")
      return
    }

    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("adminToken")
      if (!token) {
        setError("Authentication required")
        return
      }

      let url = `${API_URL}/api/admin/reports/vendor/${selectedVendorId}`
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)
      if (params.toString()) url += `?${params.toString()}`

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setAnalytics(data.data)
      } else {
        setError(data.message || "Failed to fetch vendor analytics")
      }
    } catch (err) {
      console.error("Error fetching vendor analytics:", err)
      setError("Failed to load vendor analytics")
    } finally {
      setLoading(false)
    }
  }

  const fetchTopVendors = async () => {
    try {
      setTopVendorsLoading(true)
      const token = localStorage.getItem("adminToken")
      if (!token) return

      const response = await fetch(
        `${API_URL}/api/admin/reports/vendors/top-10?period=${topVendorsPeriod}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const data = await response.json()
      if (data.success) {
        setTopVendors(data.data.vendors || [])
      }
    } catch (err) {
      console.error("Error fetching top vendors:", err)
    } finally {
      setTopVendorsLoading(false)
    }
  }

  const handleExport = async (format: "csv" | "json" = "csv") => {
    if (!selectedVendorId) {
      setError("Please select a vendor to export")
      return
    }

    try {
      const token = localStorage.getItem("adminToken")
      if (!token) return

      let url = `${API_URL}/api/admin/reports/vendor/${selectedVendorId}/export?format=${format}`
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)
      if (params.toString()) url += `&${params.toString()}`

      if (format === "csv") {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = downloadUrl
        link.download = `vendor-analytics-${Date.now()}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
      } else {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (data.success) {
          const jsonStr = JSON.stringify(data.data, null, 2)
          const blob = new Blob([jsonStr], { type: "application/json" })
          const downloadUrl = window.URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = downloadUrl
          link.download = `vendor-analytics-${Date.now()}.json`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(downloadUrl)
        }
      }
    } catch (err) {
      console.error("Error exporting data:", err)
      setError("Failed to export data")
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

  return (
    <div className="space-y-6">
      {/* Top 10 Vendors Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top 10 Vendors Performance</CardTitle>
              <CardDescription>Best performing vendors by revenue</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={topVendorsPeriod} onValueChange={setTopVendorsPeriod}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {topVendorsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : topVendors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No vendor data available</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Avg Order Value</TableHead>
                    <TableHead>Delivery Rate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topVendors.map((vendor, index) => (
                    <TableRow key={vendor.vendorId}>
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell>{vendor.vendorName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{vendor.vendorEmail}</TableCell>
                      <TableCell>{vendor.totalOrders}</TableCell>
                      <TableCell>{vendor.deliveredOrders}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(vendor.totalRevenue)}</TableCell>
                      <TableCell>{formatCurrency(vendor.avgOrderValue)}</TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{vendor.deliveryRate}%</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            vendor.vendorStatus === "approved"
                              ? "bg-green-100 text-green-800"
                              : vendor.vendorStatus === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {vendor.vendorStatus}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor Selection and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Analytics</CardTitle>
          <CardDescription>Select a vendor to view detailed analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Select Vendor</Label>
                <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                  <SelectTrigger id="vendor">
                    <SelectValue placeholder="Choose a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor._id} value={vendor._id}>
                        {vendor.name} ({vendor.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchVendorAnalytics} disabled={!selectedVendorId || loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Analytics
                  </>
                )}
              </Button>
              {analytics && (
                <>
                  <Button variant="outline" onClick={() => handleExport("csv")}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button variant="outline" onClick={() => handleExport("json")}>
                    <Download className="mr-2 h-4 w-4" />
                    Export JSON
                  </Button>
                </>
              )}
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Results */}
      {analytics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics.summary.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">From delivered orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics.summary.totalIncome)}</div>
                <p className="text-xs text-muted-foreground">All orders combined</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.summary.totalOrders}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.summary.uniqueCustomers} unique customers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics.summary.avgOrderValue)}</div>
                <p className="text-xs text-muted-foreground">{analytics.summary.productCount} products</p>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Delivered</span>
                    <span className="font-medium">{analytics.ordersByStatus.delivered}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Shipped</span>
                    <span className="font-medium">{analytics.ordersByStatus.shipped}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Processing</span>
                    <span className="font-medium">{analytics.ordersByStatus.processing}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pending</span>
                    <span className="font-medium">{analytics.ordersByStatus.pending}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cancelled</span>
                    <span className="font-medium">{analytics.ordersByStatus.cancelled}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Delivered</span>
                    <span className="font-medium">{formatCurrency(analytics.revenueByStatus.delivered)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Shipped</span>
                    <span className="font-medium">{formatCurrency(analytics.revenueByStatus.shipped)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Processing</span>
                    <span className="font-medium">{formatCurrency(analytics.revenueByStatus.processing)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pending</span>
                    <span className="font-medium">{formatCurrency(analytics.revenueByStatus.pending)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          {analytics.revenueOverTime.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
                <CardDescription>Daily revenue trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={analytics.revenueOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
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
          )}

          {analytics.ordersOverTime.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Orders Over Time</CardTitle>
                <CardDescription>Daily order volume</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analytics.ordersOverTime}>
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
          )}

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
              <CardDescription>Complete list of orders ({analytics.orders.length} total)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.orders.map((order) => (
                      <TableRow key={order._id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>
                          {order.customer ? (
                            <>
                              <div>{order.customer.name}</div>
                              <div className="text-xs text-muted-foreground">{order.customer.mobile}</div>
                            </>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

