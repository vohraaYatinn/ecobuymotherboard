"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Plus, Store, MapPin, Loader2, Smartphone } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

interface PushToken {
  token: string
  platform: string
  deviceModel: string
  appVersion: string
  lastSeenAt: string
  createdAt: string
}

interface Vendor {
  _id: string
  name: string
  email: string
  phone: string
  username: string
  status: string
  address: {
    city: string
    state: string
    country: string
  }
  totalProducts: number
  createdAt: string
  pushTokens?: PushToken[]
}

const getStatusColor = (status: string) => {
  const statusMap: Record<string, string> = {
    approved: "bg-green-100 text-green-800",
    pending: "bg-orange-100 text-orange-800",
    rejected: "bg-red-100 text-red-800",
    suspended: "bg-gray-100 text-gray-800",
  }
  return statusMap[status] || "bg-gray-100 text-gray-800"
}

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    approved: "Approved",
    pending: "Pending",
    rejected: "Rejected",
    suspended: "Suspended",
  }
  return statusMap[status] || status
}

export function AdminVendorsList() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true)
      setError("")
      try {
        const params = new URLSearchParams()
        if (search) params.append("search", search)
        if (statusFilter && statusFilter !== "all") params.append("status", statusFilter)
        params.append("limit", "50")

        const response = await fetch(`${API_URL}/api/vendors?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setVendors(data.data)
        } else {
          setError("Failed to load vendors")
        }
      } catch (err) {
        console.error("Error fetching vendors:", err)
        setError("Error loading vendors. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchVendors()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [search, statusFilter])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

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
          <Input
            placeholder="Search by vendor name, email, or phone..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Vendors Grid */}
      {!loading && !error && (
        <>
          {vendors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No vendors found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {vendors.map((vendor) => (
                <Card key={vendor._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                            <Store className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link href={`/admin/vendors/${vendor._id}`}>
                              <h3 className="text-lg font-semibold text-foreground hover:text-primary truncate">
                                {vendor.name}
                              </h3>
                            </Link>
                            <p className="text-sm text-muted-foreground truncate">{vendor.email}</p>
                            <p className="text-sm text-muted-foreground">{vendor.phone}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(vendor.status)}>{getStatusLabel(vendor.status)}</Badge>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Vendor ID</p>
                          <p className="font-medium text-xs">{vendor._id.slice(-8)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Products</p>
                          <p className="font-medium">{vendor.totalProducts}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Location
                          </p>
                          <p className="font-medium">
                            {vendor.address.city}, {vendor.address.state}
                          </p>
                        </div>
                      </div>

                      {/* FCM Tokens */}
                      {vendor.pushTokens && vendor.pushTokens.length > 0 && (
                        <div className="border-t border-border pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Smartphone className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold text-foreground">
                              FCM Tokens ({vendor.pushTokens.length})
                            </p>
                          </div>
                          <div className="space-y-2">
                            {vendor.pushTokens.slice(0, 3).map((token, idx) => (
                              <div
                                key={idx}
                                className="bg-muted/50 p-2 rounded border border-border/50 text-xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-mono text-[10px] break-all text-foreground mb-1">
                                      {token.token}
                                    </p>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {token.platform}
                                      </Badge>
                                      <span className="text-[10px]">
                                        {token.deviceModel.length > 20
                                          ? token.deviceModel.substring(0, 20) + "..."
                                          : token.deviceModel}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      Last seen: {new Date(token.lastSeenAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {vendor.pushTokens.length > 3 && (
                              <p className="text-xs text-muted-foreground text-center">
                                +{vendor.pushTokens.length - 3} more token(s)
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {(!vendor.pushTokens || vendor.pushTokens.length === 0) && (
                        <div className="border-t border-border pt-4">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">No FCM tokens registered</p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-between items-center pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">Joined: {formatDate(vendor.createdAt)}</p>
                        <Link href={`/admin/vendors/${vendor._id}`}>
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
          )}
        </>
      )}
    </div>
  )
}
