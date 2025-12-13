"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { API_URL } from "@/lib/api-config"

interface VendorUserData {
  id: string
  mobile: string
  name: string
  email: string
  vendorId: string | null
  isActive: boolean
}

interface VendorData {
  id: string
  name: string
  username: string
  phone: string
  email: string
  status: string
  address: {
    firstName: string
    lastName: string
    address1: string
    address2?: string
    city: string
    state: string
    postcode: string
    country: string
  }
  formattedAddress: string
  totalProducts: number
  ordersFulfilled: number
  isActive: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [vendorUser, setVendorUser] = useState<VendorUserData | null>(null)
  const [vendor, setVendor] = useState<VendorData | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    businessName: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postcode: "",
    country: "india",
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/api/vendor-auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        if (response.status === 401) {
          localStorage.removeItem("vendorToken")
          localStorage.removeItem("vendorData")
          router.push("/login")
          return
        }
        setError(data.message || "Failed to load profile")
        return
      }

      setVendorUser(data.data.vendorUser)
      if (data.data.vendor) {
        setVendor(data.data.vendor)
        // Populate form with vendor data
        setFormData({
          name: data.data.vendorUser.name || "",
          email: data.data.vendorUser.email || "",
          businessName: data.data.vendor.name || "",
          phone: data.data.vendor.phone || "",
          address1: data.data.vendor.address?.address1 || "",
          address2: data.data.vendor.address?.address2 || "",
          city: data.data.vendor.address?.city || "",
          state: data.data.vendor.address?.state || "",
          postcode: data.data.vendor.address?.postcode || "",
          country: data.data.vendor.address?.country || "india",
        })
      } else {
        // No vendor linked, just set vendor user data
        setFormData({
          name: data.data.vendorUser.name || "",
          email: data.data.vendorUser.email || "",
          businessName: "",
          phone: "",
          address1: "",
          address2: "",
          city: "",
          state: "",
          postcode: "",
          country: "india",
        })
      }
    } catch (err) {
      console.error("Error fetching profile:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError("")
      const token = localStorage.getItem("vendorToken")
      if (!token) {
        router.push("/login")
        return
      }

      // Update vendor user profile (name, email)
      const userUpdateResponse = await fetch(`${API_URL}/api/vendor-auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
        }),
      })

      const userUpdateData = await userUpdateResponse.json()

      if (!userUpdateResponse.ok || !userUpdateData.success) {
        throw new Error(userUpdateData.message || "Failed to update profile")
      }

      // Update vendor business info if vendor is linked
      if (vendor) {
        // Split name into firstName and lastName
        // If no lastName exists, use firstName as lastName to satisfy backend validation
        const nameParts = (formData.name || "").trim().split(" ").filter(Boolean)
        const firstName = nameParts[0] || ""
        // If lastName is empty, use firstName to satisfy backend's required lastName validation
        const lastName = nameParts.slice(1).join(" ") || firstName || ""

        const vendorUpdateResponse = await fetch(`${API_URL}/api/vendor-auth/profile/vendor`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.businessName,
            phone: formData.phone,
            address: {
              firstName: firstName,
              lastName: lastName,
              address1: formData.address1,
              address2: formData.address2,
              city: formData.city,
              state: formData.state,
              postcode: formData.postcode,
              country: formData.country,
            },
          }),
        })

        const vendorUpdateData = await vendorUpdateResponse.json()

        if (!vendorUpdateResponse.ok || !vendorUpdateData.success) {
          throw new Error(vendorUpdateData.message || "Failed to update business information")
        }
      }

      setIsEditing(false)
      toast({
        title: "Success",
        description: "Profile updated successfully",
      })

      // Refresh profile data
      await fetchProfile()
    } catch (err: any) {
      console.error("Error saving profile:", err)
      setError(err.message || "Failed to save changes")
      toast({
        title: "Error",
        description: err.message || "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      localStorage.removeItem("vendorToken")
      localStorage.removeItem("vendorData")
      router.push("/login")
    } catch (err) {
      console.error("Logout error:", err)
      router.push("/login")
    }
  }

  const getInitials = (name: string) => {
    if (!name) return "N/A"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="flex-none bg-white shadow-md safe-top" style={{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }}>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Profile</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Manage your account settings</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/10 via-primary/5 to-background">
      {/* Header - Fixed at top */}
      <div className="flex-none bg-white shadow-md safe-top sticky top-0 z-10" style={{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Profile</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your account settings</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-destructive/10 to-destructive/5 text-destructive hover:from-destructive/20 hover:to-destructive/10 transition-all hover:scale-105 border-2 border-destructive/20 shadow-sm"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 space-y-5" style={{ paddingBottom: `calc(7rem + env(safe-area-inset-bottom, 0px))` }}>
        {error && (
          <div className="rounded-3xl bg-gradient-to-br from-destructive/10 to-destructive/5 border-2 border-destructive/20 shadow-xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive flex-1">{error}</p>
            </div>
          </div>
        )}

        {/* Profile Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-card/95 shadow-xl border border-border/30">
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 bg-primary/20"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-start gap-4 mb-6">
              <div className="relative flex-shrink-0">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white text-3xl font-bold shadow-xl shadow-primary/40">
                  {getInitials(formData.name || vendorUser?.name || "N/A")}
                </div>
                <button
                  disabled={!isEditing}
                  className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white border-2 border-primary text-primary shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground truncate">{formData.name || vendorUser?.name || "N/A"}</h2>
                <p className="text-sm font-medium text-primary mt-1 truncate">{formData.businessName || vendor?.name || "No business linked"}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{formData.email || vendorUser?.email || "N/A"}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-chart-3 animate-pulse" />
                  <span className="text-xs font-medium text-chart-3">
                    {vendor?.status === "approved" ? "Active" : vendor?.status || "Pending"}
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              disabled={saving}
              className="w-full h-12 bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:shadow-xl transition-all text-base font-semibold rounded-2xl"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Save Changes
                </>
              ) : (
                <>
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Profile
                </>
              )}
            </Button>
          </CardContent>
        </div>

        {/* Personal Information */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-card/95 shadow-xl border border-border/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-foreground">Personal Information</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className="mt-2 h-12 bg-gradient-to-r from-muted/60 to-muted/40 border-border/50 rounded-2xl"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  className="mt-2 h-12 bg-gradient-to-r from-muted/60 to-muted/40 border-border/50 rounded-2xl"
                />
              </div>
            </div>
          </CardContent>
        </div>

        {/* Business Information */}
        {vendor && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-card/95 shadow-xl border border-border/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                  <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-foreground">Business Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="business-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Business Name
                  </Label>
                  <Input
                    id="business-name"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    disabled={!isEditing}
                    className="mt-2 h-12 bg-gradient-to-r from-muted/60 to-muted/40 border-border/50 rounded-2xl"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="mt-2 h-12 bg-gradient-to-r from-muted/60 to-muted/40 border-border/50 rounded-2xl"
                  />
                </div>
                <div>
                  <Label htmlFor="address1" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Address Line 1
                  </Label>
                  <Input
                    id="address1"
                    value={formData.address1}
                    onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                    disabled={!isEditing}
                    className="mt-2 h-12 bg-gradient-to-r from-muted/60 to-muted/40 border-border/50 rounded-2xl"
                  />
                </div>
                <div>
                  <Label htmlFor="address2" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Address Line 2 (Optional)
                  </Label>
                  <Input
                    id="address2"
                    value={formData.address2}
                    onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                    disabled={!isEditing}
                    className="mt-2 h-12 bg-gradient-to-r from-muted/60 to-muted/40 border-border/50 rounded-2xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="city" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      City
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      disabled={!isEditing}
                      className="mt-2 h-12 bg-gradient-to-r from-muted/60 to-muted/40 border-border/50 rounded-2xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      State
                    </Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      disabled={!isEditing}
                      className="mt-2 h-12 bg-gradient-to-r from-muted/60 to-muted/40 border-border/50 rounded-2xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="postcode" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Postcode
                    </Label>
                    <Input
                      id="postcode"
                      value={formData.postcode}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                      disabled={!isEditing}
                      className="mt-2 h-12 bg-gradient-to-r from-muted/60 to-muted/40 border-border/50 rounded-2xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Country
                    </Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      disabled={!isEditing}
                      className="mt-2 h-12 bg-gradient-to-r from-muted/60 to-muted/40 border-border/50 rounded-2xl"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        )}

        {!vendor && (
          <div className="rounded-3xl bg-gradient-to-br from-card via-card to-card/95 shadow-xl border border-border/30 p-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-2">No Business Account Linked</p>
            <p className="text-xs text-muted-foreground">Contact admin to link your vendor account</p>
          </div>
        )}

        {/* Settings */}
        {[
          {
            title: "Notifications",
            items: [
              {
                id: "order-notifications",
                label: "Order Updates",
                description: "Get notified about new orders",
                checked: true,
              },
              {
                id: "customer-messages",
                label: "Customer Messages",
                description: "Receive customer inquiries",
                checked: true,
              },
              {
                id: "inventory-alerts",
                label: "Inventory Alerts",
                description: "Low stock notifications",
                checked: false,
              },
            ],
          },
          {
            title: "Privacy",
            items: [
              {
                id: "profile-visible",
                label: "Profile Visibility",
                description: "Show profile to customers",
                checked: true,
              },
              { id: "analytics", label: "Analytics", description: "Share usage data", checked: false },
            ],
          },
        ].map((group, groupIndex) => (
          <div key={groupIndex} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-card/95 shadow-xl border border-border/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                  <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {groupIndex === 0 ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    )}
                  </svg>
                </div>
                <h3 className="text-base font-bold text-foreground">{group.title}</h3>
              </div>
              <div className="space-y-4">
                {group.items.map((item, itemIndex) => (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between ${
                      itemIndex !== group.items.length - 1 ? "pb-4 border-b border-border/30" : ""
                    }`}
                  >
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    </div>
                    <Switch defaultChecked={item.checked} disabled={!isEditing} />
                  </div>
                ))}
              </div>
            </CardContent>
          </div>
        ))}

        {/* Additional Options */}
        <div className="rounded-3xl bg-gradient-to-br from-card via-card to-card/95 shadow-xl border border-border/30 overflow-hidden">
          <button
            onClick={() => (window.location.href = "mailto:mahender@ekranfix.com")}
            className="flex w-full items-center justify-between p-5 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl group-hover:scale-110 transition-transform shadow-lg bg-gradient-to-br from-chart-3/20 to-chart-3/10 text-chart-3">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Help & Support</p>
                <p className="text-xs text-muted-foreground mt-0.5">Get help and contact us</p>
              </div>
            </div>
            <svg
              className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
