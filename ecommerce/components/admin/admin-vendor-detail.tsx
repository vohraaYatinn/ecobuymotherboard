"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Store, MapPin, Package, CheckCircle, Loader2, Smartphone } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.34:5000"

interface AdminVendorDetailProps {
  vendorId: string
}

interface Vendor {
  _id: string
  name: string
  username: string
  email: string
  phone: string
  status: string
  address: {
    firstName: string
    lastName: string
    address1: string
    address2: string
    city: string
    state: string
    postcode: string
    country: string
  }
  totalProducts: number
  ordersFulfilled: number
  createdAt: string
  pushTokens?: Array<{
    token: string
    platform: string
    deviceModel: string
    appVersion: string
    lastSeenAt: string
    createdAt: string
  }>
}

export function AdminVendorDetail({ vendorId }: AdminVendorDetailProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [vendor, setVendor] = useState<Vendor | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    status: "pending",
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postcode: "",
    country: "india",
  })

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const response = await fetch(`${API_URL}/api/vendors/${vendorId}`)
        const data = await response.json()

        if (data.success) {
          const vendorData = data.data
          setVendor(vendorData)
          setFormData({
            name: vendorData.name || "",
            username: vendorData.username || "",
            email: vendorData.email || "",
            phone: vendorData.phone || "",
            status: vendorData.status || "pending",
            firstName: vendorData.address?.firstName || "",
            lastName: vendorData.address?.lastName || "",
            address1: vendorData.address?.address1 || "",
            address2: vendorData.address?.address2 || "",
            city: vendorData.address?.city || "",
            state: vendorData.address?.state || "",
            postcode: vendorData.address?.postcode || "",
            country: vendorData.address?.country || "india",
          })
        } else {
          setError(data.message || "Vendor not found")
        }
      } catch (err) {
        console.error("Error fetching vendor:", err)
        setError("Error loading vendor")
      } finally {
        setLoading(false)
      }
    }

    fetchVendor()
  }, [vendorId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin-login")
        return
      }

      const payload = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        status: formData.status,
        address: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          address1: formData.address1,
          address2: formData.address2,
          city: formData.city,
          state: formData.state,
          postcode: formData.postcode,
          country: formData.country,
        },
      }

      const response = await fetch(`${API_URL}/api/vendors/${vendorId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Failed to update vendor")
        setSaving(false)
        return
      }

      // Refresh vendor data
      const refreshResponse = await fetch(`${API_URL}/api/vendors/${vendorId}`)
      const refreshData = await refreshResponse.json()
      if (refreshData.success) {
        setVendor(refreshData.data)
        setFormData({
          name: refreshData.data.name || "",
          username: refreshData.data.username || "",
          email: refreshData.data.email || "",
          phone: refreshData.data.phone || "",
          status: refreshData.data.status || "pending",
          firstName: refreshData.data.address?.firstName || "",
          lastName: refreshData.data.address?.lastName || "",
          address1: refreshData.data.address?.address1 || "",
          address2: refreshData.data.address?.address2 || "",
          city: refreshData.data.address?.city || "",
          state: refreshData.data.address?.state || "",
          postcode: refreshData.data.address?.postcode || "",
          country: refreshData.data.address?.country || "india",
        })
      }

      setSaving(false)
    } catch (err) {
      console.error("Error updating vendor:", err)
      setError("Error updating vendor. Please try again.")
      setSaving(false)
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !vendor) {
    return (
      <div className="space-y-6">
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
        <Link href="/admin/vendors">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Vendors
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/vendors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Vendor Details</h1>
            <p className="text-sm text-muted-foreground mt-1">{vendor?._id.slice(-8)}</p>
          </div>
        </div>
        {vendor && (
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(vendor.status)}>{getStatusLabel(vendor.status)}</Badge>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Vendor Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Vendor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="vendorName">Vendor Name</Label>
                <Input
                  id="vendorName"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Store Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Vendor Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange("status", value)}
                >
                  <SelectTrigger id="status" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Request</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address1">Address 1</Label>
                  <Input
                    id="address1"
                    name="address1"
                    value={formData.address1}
                    onChange={handleChange}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address2">Address 2</Label>
                  <Input
                    id="address2"
                    name="address2"
                    value={formData.address2}
                    onChange={handleChange}
                    className="mt-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => handleSelectChange("country", value)}
                  >
                    <SelectTrigger id="country" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="india">India</SelectItem>
                      <SelectItem value="usa">USA</SelectItem>
                      <SelectItem value="uk">UK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="city">City/Town</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State/County</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="postcode">Postcode/Zip</Label>
                  <Input
                    id="postcode"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleChange}
                    className="mt-1.5"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vendor Stats */}
        {vendor && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  Total Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{vendor.totalProducts}</p>
                <p className="text-xs text-muted-foreground mt-1">Active listings</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-4 w-4" />
                  Orders Fulfilled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{vendor.ordersFulfilled}</p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Store className="h-4 w-4" />
                  Member Since
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatDate(vendor.createdAt)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(vendor.createdAt).getFullYear()}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FCM Tokens Section */}
        {vendor && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                FCM Tokens ({vendor.pushTokens?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vendor.pushTokens && vendor.pushTokens.length > 0 ? (
                <div className="space-y-3">
                  {vendor.pushTokens.map((token, idx) => (
                    <div
                      key={idx}
                      className="bg-muted/50 p-3 rounded-lg border border-border/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs break-all text-foreground mb-2">
                            {token.token}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-xs">
                              {token.platform}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {token.deviceModel.length > 30
                                ? token.deviceModel.substring(0, 30) + "..."
                                : token.deviceModel}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              v{token.appVersion}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p>Created: {new Date(token.createdAt).toLocaleString()}</p>
                            <p>Last seen: {new Date(token.lastSeenAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No FCM tokens registered</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tokens will appear here when the vendor logs in via the mobile app
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Link href="/admin/vendors">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="gap-2" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
