"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Eye, Download, Filter } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const customers = [
  {
    id: "CUST001",
    name: "Rajesh Kumar",
    email: "rajesh.kumar@email.com",
    phone: "+91 98765 43210",
    totalOrders: 12,
    totalSpent: "₹45,600",
    status: "Active",
    city: "Mumbai",
    joinedDate: "2024-08-15",
  },
  {
    id: "CUST002",
    name: "Priya Sharma",
    email: "priya.sharma@email.com",
    phone: "+91 87654 32109",
    totalOrders: 8,
    totalSpent: "₹32,400",
    status: "Active",
    city: "Delhi",
    joinedDate: "2024-09-22",
  },
  {
    id: "CUST003",
    name: "Amit Patel",
    email: "amit.patel@email.com",
    phone: "+91 76543 21098",
    totalOrders: 5,
    totalSpent: "₹18,900",
    status: "Active",
    city: "Bangalore",
    joinedDate: "2024-10-10",
  },
  {
    id: "CUST004",
    name: "Sneha Reddy",
    email: "sneha.reddy@email.com",
    phone: "+91 65432 10987",
    totalOrders: 15,
    totalSpent: "₹58,200",
    status: "Active",
    city: "Hyderabad",
    joinedDate: "2024-07-05",
  },
  {
    id: "CUST005",
    name: "Vikram Singh",
    email: "vikram.singh@email.com",
    phone: "+91 54321 09876",
    totalOrders: 3,
    totalSpent: "₹12,500",
    status: "Inactive",
    city: "Jaipur",
    joinedDate: "2024-11-12",
  },
]

export function AdminCustomersList() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customers Management</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all registered customers</p>
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

      {/* Search */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, email, phone, or customer ID..." className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-t-4 border-t-accent">
        <CardHeader className="bg-gradient-to-r from-accent/5 to-primary/5">
          <CardTitle className="text-lg">All Customers ({customers.length})</CardTitle>
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
                {customers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-primary">
                      <Link href={`/admin/customers/${customer.id}`} className="hover:underline">
                        {customer.id}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{customer.email}</TableCell>
                    <TableCell className="text-sm">{customer.phone}</TableCell>
                    <TableCell className="text-sm">{customer.city}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-semibold">
                        {customer.totalOrders}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">{customer.totalSpent}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          customer.status === "Active"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-gray-100 text-gray-800 border-gray-200"
                        }
                      >
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{customer.joinedDate}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/customers/${customer.id}`}>
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
            {customers.map((customer) => (
              <div key={customer.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/admin/customers/${customer.id}`}>
                        <h3 className="font-semibold text-primary hover:underline">{customer.name}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">{customer.email}</p>
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    </div>
                    <Badge
                      className={
                        customer.status === "Active"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      }
                    >
                      {customer.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Customer ID:</span>
                      <p className="font-medium">{customer.id}</p>
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
                      <p className="font-semibold text-green-600">{customer.totalSpent}</p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t">
                    <Link href={`/admin/customers/${customer.id}`}>
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
