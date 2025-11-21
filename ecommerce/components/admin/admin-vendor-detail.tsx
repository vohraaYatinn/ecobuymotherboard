"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Store, MapPin, Package, CheckCircle, XCircle } from "lucide-react"

export function AdminVendorDetail({ vendorId }: { vendorId: string }) {
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
            <p className="text-sm text-muted-foreground mt-1">{vendorId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800">Approved</Badge>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <XCircle className="h-4 w-4" />
            Suspend
          </Button>
        </div>
      </div>

      {/* Vendor Information */}
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
              <Input id="vendorName" defaultValue="Tech Vendors Ltd" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" defaultValue="techvendors" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="contact@techvendors.com" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="phone">Store Phone</Label>
              <Input id="phone" defaultValue="+91 98765 43210" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="status">Vendor Status</Label>
              <Select defaultValue="approved">
                <SelectTrigger id="status" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Request</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
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
                <Input id="firstName" defaultValue="Rajesh" className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" defaultValue="Kumar" className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address1">Address 1</Label>
                <Input id="address1" defaultValue="123, Tech Park, Building A" className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address2">Address 2</Label>
                <Input id="address2" defaultValue="Sector 15" className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="country">Country</Label>
                <Select defaultValue="india">
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
                <Input id="city" defaultValue="Mumbai" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="state">State/County</Label>
                <Input id="state" defaultValue="Maharashtra" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="postcode">Postcode/Zip</Label>
                <Input id="postcode" defaultValue="400001" className="mt-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">45</p>
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
            <p className="text-3xl font-bold">324</p>
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
            <p className="text-3xl font-bold">June</p>
            <p className="text-xs text-muted-foreground mt-1">2024</p>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancel</Button>
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
