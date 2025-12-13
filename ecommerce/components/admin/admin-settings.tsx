"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, SettingsIcon, Phone, Building } from "lucide-react"

export function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your admin settings and preferences</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
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
