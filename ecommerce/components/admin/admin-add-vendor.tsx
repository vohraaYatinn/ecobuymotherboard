"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Store, MapPin } from "lucide-react"

export function AdminAddVendor() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/vendors">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Add New Vendor</h1>
          <p className="text-sm text-muted-foreground mt-1">Register a new vendor to the platform</p>
        </div>
      </div>

      {/* Vendor Form */}
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
              <Label htmlFor="vendorName">Vendor Name *</Label>
              <Input id="vendorName" placeholder="Enter vendor name" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input id="username" placeholder="Enter username" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="vendor@example.com" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="phone">Store Phone *</Label>
              <Input id="phone" placeholder="+91 XXXXX XXXXX" className="mt-1.5" />
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
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" placeholder="First name" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" placeholder="Last name" className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address1">Address 1 *</Label>
                <Input id="address1" placeholder="Street address" className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address2">Address 2</Label>
                <Input id="address2" placeholder="Apartment, suite, etc." className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="country">Country *</Label>
                <Select>
                  <SelectTrigger id="country" className="mt-1.5">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="india">India</SelectItem>
                    <SelectItem value="usa">USA</SelectItem>
                    <SelectItem value="uk">UK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="city">City/Town *</Label>
                <Input id="city" placeholder="City" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="state">State/County *</Label>
                <Input id="state" placeholder="State" className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="postcode">Postcode/Zip *</Label>
                <Input id="postcode" placeholder="Postal code" className="mt-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3">
        <Link href="/admin/vendors">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Add Vendor
        </Button>
      </div>
    </div>
  )
}
