"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Filter, Download } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const orders = [
  {
    id: "ORD1001",
    customerContact: "+91 98765 43210",
    sku: "TV-PCB-LG-001",
    brand: "LG",
    paymentType: "COD",
    assignedSeller: "Tech Vendors Ltd",
    sellerAddress: "Mumbai, Maharashtra",
    status: "Pending",
    awb: "AWB123456789",
    agValue: "₹2,500",
    date: "2025-01-20",
  },
  {
    id: "ORD1002",
    customerContact: "+91 87654 32109",
    sku: "TV-PCB-SONY-045",
    brand: "Sony",
    paymentType: "Online",
    assignedSeller: "Electronics Hub",
    sellerAddress: "Delhi, NCR",
    status: "Processing",
    awb: "AWB987654321",
    agValue: "₹3,200",
    date: "2025-01-20",
  },
  {
    id: "ORD1003",
    customerContact: "+91 76543 21098",
    sku: "TV-PCB-SAMSUNG-032",
    brand: "Samsung",
    paymentType: "COD",
    assignedSeller: "PCB Solutions",
    sellerAddress: "Bangalore, Karnataka",
    status: "Shipped",
    awb: "AWB456789123",
    agValue: "₹4,100",
    date: "2025-01-19",
  },
  {
    id: "ORD1004",
    customerContact: "+91 65432 10987",
    sku: "TV-PCB-SHARP-018",
    brand: "Sharp",
    paymentType: "Online",
    assignedSeller: "Tech Vendors Ltd",
    sellerAddress: "Mumbai, Maharashtra",
    status: "Delivered",
    awb: "AWB789123456",
    agValue: "NULL",
    date: "2025-01-18",
  },
  {
    id: "ORD1005",
    customerContact: "+91 54321 09876",
    sku: "TV-PCB-LG-045",
    brand: "LG",
    paymentType: "COD",
    assignedSeller: "Electronics Hub",
    sellerAddress: "Chennai, Tamil Nadu",
    status: "Processing",
    awb: "AWB321654987",
    agValue: "₹2,850",
    date: "2025-01-19",
  },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "Processing":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "Shipped":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "Delivered":
      return "bg-green-100 text-green-800 border-green-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export function AdminOrdersList() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders Management</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all customer orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by Order ID, Customer Contact, SKU..." className="pl-10" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Payment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="cod">COD</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-t-4 border-t-primary">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
          <CardTitle className="text-lg">All Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Order ID</TableHead>
                  <TableHead className="font-semibold">Customer Contact</TableHead>
                  <TableHead className="font-semibold">SKU Details</TableHead>
                  <TableHead className="font-semibold">Brand</TableHead>
                  <TableHead className="font-semibold">Payment</TableHead>
                  <TableHead className="font-semibold">Seller</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">AWB Number</TableHead>
                  <TableHead className="font-semibold">AG Value</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-primary">
                      <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                        {order.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{order.customerContact}</TableCell>
                    <TableCell className="text-sm font-mono">{order.sku}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {order.brand}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.paymentType === "COD" ? "secondary" : "default"} className="text-xs">
                        {order.paymentType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="max-w-[150px]">
                        <p className="font-medium truncate">{order.assignedSeller}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.sellerAddress}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{order.awb}</TableCell>
                    <TableCell>
                      <span
                        className={`font-semibold ${
                          order.agValue === "NULL" ? "text-muted-foreground" : "text-green-600"
                        }`}
                      >
                        {order.agValue}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-border">
            {orders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Link href={`/admin/orders/${order.id}`}>
                      <h3 className="font-semibold text-primary hover:underline">{order.id}</h3>
                    </Link>
                    <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Contact:</span>
                      <p className="font-medium">{order.customerContact}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Brand:</span>
                      <p className="font-medium">{order.brand}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">SKU:</span>
                      <p className="font-mono text-xs">{order.sku}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">AG Value:</span>
                      <p
                        className={`font-semibold ${
                          order.agValue === "NULL" ? "text-muted-foreground" : "text-green-600"
                        }`}
                      >
                        {order.agValue}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t">
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
