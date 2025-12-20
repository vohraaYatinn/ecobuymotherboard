"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, SettingsIcon, Phone, Building, Truck, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

export function AdminSettings() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [shippingCharges, setShippingCharges] = useState<number>(150)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem("adminToken")
    if (!token) {
      router.push("/admin-login")
      return
    }
    fetchShippingCharges()
  }

  const fetchShippingCharges = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) return

      const response = await fetch(`${API_URL}/api/settings/admin/shipping-charges`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch shipping charges")
      }

      const data = await response.json()
      if (data.success && data.data) {
        setShippingCharges(data.data.value || 150)
      }
    } catch (error) {
      console.error("Error fetching shipping charges:", error)
      toast({
        title: "Error",
        description: "Failed to load shipping charges",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveShippingCharges = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin-login")
        return
      }

      const response = await fetch(`${API_URL}/api/settings/admin/shipping-charges`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shippingCharges: Number(shippingCharges),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update shipping charges")
      }

      toast({
        title: "Success",
        description: "Shipping charges updated successfully",
      })
    } catch (error: any) {
      console.error("Error updating shipping charges:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update shipping charges",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your admin settings and preferences</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Shipping & Handling Charges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping & Handling Charges
            </CardTitle>
            <CardDescription>Configure shipping and handling charges for customer orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shippingCharges">Shipping/Handling Charges (₹)</Label>
                <Input
                  id="shippingCharges"
                  type="number"
                  min="0"
                  step="1"
                  value={shippingCharges}
                  onChange={(e) => setShippingCharges(Number(e.target.value))}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This amount will be charged to customers for shipping and handling
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveShippingCharges}
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Shipping Charges
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>Update your company details and branding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="brandName">Brand Name</Label>
                <Input id="brandName" defaultValue="Elecobuy" className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" defaultValue="Elecobuy Electronics Pvt Ltd" className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Company Address</Label>
                <Input id="address" defaultValue="123, Tech Park, Mumbai, Maharashtra - 400001" className="mt-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>Update your contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone1">Primary Phone</Label>
                <Input id="phone1" defaultValue="1800 123 9336" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="phone2">Secondary Phone</Label>
                <Input id="phone2" defaultValue="+91 7396 777 600" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="phone3">Support Phone</Label>
                <Input id="phone3" defaultValue="+91 7396 777 300" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input id="supportEmail" defaultValue="mahender@ekranfix.com" className="mt-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Account Settings
            </CardTitle>
            <CardDescription>Update your admin account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="adminName">Admin Name</Label>
                <Input id="adminName" defaultValue="Admin User" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input id="adminEmail" type="email" defaultValue="admin@ecobuy.com" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="adminPhone">Admin Phone</Label>
                <Input id="adminPhone" defaultValue="+91 98765 43210" className="mt-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-w-md">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" className="mt-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Save All Changes
        </Button>
      </div>
    </div>
  )
}
