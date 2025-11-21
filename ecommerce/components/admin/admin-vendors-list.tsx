"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Plus, Store, MapPin } from "lucide-react"

const vendors = [
  {
    id: "VEND001",
    name: "Tech Vendors Ltd",
    email: "contact@techvendors.com",
    phone: "+91 98765 43210",
    address: "Mumbai, Maharashtra",
    status: "Approved",
    totalProducts: 45,
    joinedDate: "2024-06-10",
  },
  {
    id: "VEND002",
    name: "Electronics Hub",
    email: "info@electronichub.com",
    phone: "+91 87654 32109",
    address: "Delhi, NCR",
    status: "Pending",
    totalProducts: 0,
    joinedDate: "2025-01-18",
  },
  {
    id: "VEND003",
    name: "PCB Solutions",
    email: "sales@pcbsolutions.com",
    phone: "+91 76543 21098",
    address: "Bangalore, Karnataka",
    status: "Approved",
    totalProducts: 32,
    joinedDate: "2024-08-22",
  },
  {
    id: "VEND004",
    name: "Component Store",
    email: "support@componentstore.com",
    phone: "+91 65432 10987",
    address: "Chennai, Tamil Nadu",
    status: "Rejected",
    totalProducts: 0,
    joinedDate: "2025-01-10",
  },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-green-100 text-green-800"
    case "Pending":
      return "bg-orange-100 text-orange-800"
    case "Rejected":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function AdminVendorsList() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Vendors Management</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all vendors</p>
        </div>
        <Link href="/admin/vendors/add">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Vendor
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by vendor name, email, or phone..." className="pl-10" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 gap-4">
        {vendors.map((vendor) => (
          <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                      <Store className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/admin/vendors/${vendor.id}`}>
                        <h3 className="text-lg font-semibold text-foreground hover:text-primary truncate">
                          {vendor.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">{vendor.email}</p>
                      <p className="text-sm text-muted-foreground">{vendor.phone}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(vendor.status)}>{vendor.status}</Badge>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Vendor ID</p>
                    <p className="font-medium">{vendor.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Products</p>
                    <p className="font-medium">{vendor.totalProducts}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Location
                    </p>
                    <p className="font-medium">{vendor.address}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Joined: {vendor.joinedDate}</p>
                  <Link href={`/admin/vendors/${vendor.id}`}>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
