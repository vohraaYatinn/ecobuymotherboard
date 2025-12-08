"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Eye, Download, Filter, Loader2, AlertCircle, ChevronLeft, ChevronRight, FileDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

interface Customer {
  _id: string
  name?: string
  email?: string
  mobile: string
  totalOrders: number
  totalSpent: number
  city: string
  createdAt: string
}

export function AdminCustomersList() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [page, search])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("adminToken")
      if (!token) return

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
      })

      const response = await fetch(`${API_URL}/api/admin/customers?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || "Failed to load customers")
        return
      }

      setCustomers(data.data || [])
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 0 })
    } catch (err) {
      console.error("Error fetching customers:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatPhone = (mobile: string) => {
    if (mobile.length === 12 && mobile.startsWith("91")) {
      return `+91 ${mobile.slice(2, 7)} ${mobile.slice(7)}`
    }
    return mobile
  }

  const getCustomerId = (customer: Customer) => {
    return customer._id.slice(-6).toUpperCase()
  }

  const handleExportCustomers = async () => {
    try {
      setExporting(true)
      const token = localStorage.getItem("adminToken")
      if (!token) {
        alert("Please login to export customers")
        return
      }

      // Fetch all customers matching current filters (without pagination)
      const params = new URLSearchParams({
        page: "1",
        limit: "10000", // Large limit to get all customers
        ...(search && { search }),
      })

      const response = await fetch(`${API_URL}/api/admin/customers?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch customers for export")
      }

      const data = await response.json()
      if (!data.success || !data.data) {
        throw new Error("No customers data available")
      }

      const customers = data.data

      // Convert customers to CSV
      const csvHeaders = [
        "Customer ID",
        "Name",
        "Email",
        "Phone",
        "City",
        "Total Orders",
        "Total Spent (₹)",
        "Status",
        "Joined Date",
      ]

      const csvRows = customers.map((customer: Customer) => {
        return [
          `CUST${getCustomerId(customer)}`,
          customer.name || "",
          customer.email || "",
          customer.mobile || "",
          customer.city || "",
          customer.totalOrders.toString(),
          customer.totalSpent.toString(),
          "Active",
          new Date(customer.createdAt).toLocaleDateString("en-IN"),
        ]
      })

      // Create CSV content
      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n")

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      const timestamp = new Date().toISOString().split("T")[0]
      a.href = url
      a.download = `customers_export_${timestamp}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting customers:", error)
      alert("Failed to export customers. Please try again.")
    } finally {
      setExporting(false)
    }
  }
  if (loading && customers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customers Management</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all registered customers</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customers Management</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all registered customers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
            onClick={handleExportCustomers}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Exporting...</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or customer ID..."
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchCustomers} className="ml-auto">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-md border-t-4 border-t-accent">
        <CardHeader className="bg-gradient-to-r from-accent/5 to-primary/5">
          <CardTitle className="text-lg">
            All Customers ({pagination.total.toLocaleString()})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Customer ID</TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">City</TableHead>
                  <TableHead className="font-semibold text-center">Total Orders</TableHead>
                  <TableHead className="font-semibold">Total Spent</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Joined Date</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer._id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-primary">
                        <Link href={`/admin/customers/${customer._id}`} className="hover:underline">
                          CUST{getCustomerId(customer)}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">{customer.name || "N/A"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{customer.email || "N/A"}</TableCell>
                      <TableCell className="text-sm">{formatPhone(customer.mobile)}</TableCell>
                      <TableCell className="text-sm">{customer.city}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-semibold">
                          {customer.totalOrders}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(customer.totalSpent)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(customer.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/customers/${customer._id}`}>
                          <Button variant="ghost" size="sm" className="gap-2">
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-border">
            {customers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No customers found</div>
            ) : (
              customers.map((customer) => (
                <div key={customer._id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/admin/customers/${customer._id}`}>
                          <h3 className="font-semibold text-primary hover:underline">{customer.name || "N/A"}</h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">{customer.email || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">{formatPhone(customer.mobile)}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Customer ID:</span>
                        <p className="font-medium">CUST{getCustomerId(customer)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">City:</span>
                        <p className="font-medium">{customer.city}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Orders:</span>
                        <p className="font-semibold">{customer.totalOrders}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Spent:</span>
                        <p className="font-semibold text-green-600">{formatCurrency(customer.totalSpent)}</p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t">
                      <Link href={`/admin/customers/${customer._id}`}>
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} customers
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.pages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
