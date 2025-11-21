"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function VendorRegistrationForm() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    country: "",
    city: "",
    state: "",
    postcode: "",
    storePhone: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Vendor registration:", formData)
    // Handle form submission
  }

  return (
    <div className="rounded-lg border border-border bg-card p-8">
      <h2 className="text-2xl font-bold mb-6">Vendor Registration</h2>
      <p className="text-muted-foreground mb-8">
        Fill in the details below to register as a seller on EcoBuy. All fields marked with * are required.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              className="mt-2"
              placeholder="Choose a unique username"
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="mt-2"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
              className="mt-2"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="address1">Address 1 *</Label>
            <Input
              id="address1"
              value={formData.address1}
              onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
              required
              className="mt-2"
              placeholder="Street address"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="address2">Address 2</Label>
            <Input
              id="address2"
              value={formData.address2}
              onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
              className="mt-2"
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>

          <div>
            <Label htmlFor="country">Country *</Label>
            <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="india">India</SelectItem>
                <SelectItem value="usa">United States</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="canada">Canada</SelectItem>
                <SelectItem value="australia">Australia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="city">City/Town *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="state">State/County *</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="postcode">Postcode/Zip *</Label>
            <Input
              id="postcode"
              value={formData.postcode}
              onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
              required
              className="mt-2"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="storePhone">Store Phone *</Label>
            <Input
              id="storePhone"
              type="tel"
              value={formData.storePhone}
              onChange={(e) => setFormData({ ...formData, storePhone: e.target.value })}
              required
              className="mt-2"
              placeholder="+91 1234567890"
            />
          </div>
        </div>

        <div className="pt-6">
          <Button type="submit" size="lg" className="w-full md:w-auto">
            Register as Seller
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            By registering, you agree to our Terms and Conditions and Privacy Policy.
          </p>
        </div>
      </form>
    </div>
  )
}
