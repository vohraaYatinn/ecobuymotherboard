"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)

  const vendor = {
    name: "Arjun Malhotra",
    email: "arjun@vendorhub.in",
    phone: "+91 98765 43210",
    businessName: "Malhotra Electronics",
    storeName: "Premium Tech Store",
    address: "Shop 12, MG Road, Bangalore, Karnataka 560001",
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 border-b-2 border-border/50 bg-card/98 backdrop-blur-xl shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your account settings</p>
            </div>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all hover:scale-105 border-2 border-destructive/20 shadow-sm">
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

      <div className="px-4 py-6 space-y-4">
        <Card className="border-2 border-border/50 bg-gradient-to-br from-card to-primary/5 shadow-lg animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="relative animate-float">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white text-3xl font-bold shadow-xl shadow-primary/40">
                  {vendor.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <button className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white border-2 border-primary text-primary shadow-lg hover:scale-110 transition-transform">
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
                <h2 className="text-xl font-bold text-foreground">{vendor.name}</h2>
                <p className="text-sm font-medium text-primary mt-1">{vendor.businessName}</p>
                <p className="text-xs text-muted-foreground mt-1">{vendor.email}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-chart-3 animate-pulse" />
                  <span className="text-xs font-medium text-chart-3">Active</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg transition-all text-base font-semibold"
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              {isEditing ? "Save Changes" : "Edit Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card
          className="border-2 border-border/50 bg-card shadow-md animate-fade-in"
          style={{ animationDelay: "100ms" }}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
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
                <Label
                  htmlFor="store-name"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                >
                  Store Name
                </Label>
                <Input
                  id="store-name"
                  value={vendor.storeName}
                  disabled={!isEditing}
                  className="mt-2 h-11 bg-muted/50 border-border"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={vendor.phone}
                  disabled={!isEditing}
                  className="mt-2 h-11 bg-muted/50 border-border"
                />
              </div>
              <div>
                <Label
                  htmlFor="address"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                >
                  Business Address
                </Label>
                <Input
                  id="address"
                  value={vendor.address}
                  disabled={!isEditing}
                  className="mt-2 h-11 bg-muted/50 border-border"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings - keeping existing structure */}
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
          <Card
            key={groupIndex}
            className="border-2 border-border/50 bg-card shadow-md animate-fade-in"
            style={{ animationDelay: `${300 + groupIndex * 50}ms` }}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
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
                      itemIndex !== group.items.length - 1 ? "pb-4 border-b border-border/50" : ""
                    }`}
                  >
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    </div>
                    <Switch defaultChecked={item.checked} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card
          className="border-2 border-border/50 bg-card shadow-md animate-fade-in"
          style={{ animationDelay: "400ms" }}
        >
          <CardContent className="p-0">
            {[
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                ),
                color: "primary",
                title: "Security",
                description: "Password and authentication",
              },
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ),
                color: "chart-3",
                title: "Help & Support",
                description: "Get help and contact us",
              },
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ),
                color: "chart-4",
                title: "About",
                description: "Version 1.0.0",
              },
            ].map((option, index) => (
              <div key={index}>
                {index > 0 && <div className="border-t border-border/50" />}
                <button className="flex w-full items-center justify-between p-5 hover:bg-muted/50 transition-all group">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${option.color}/10 text-${option.color} group-hover:scale-110 transition-transform`}
                    >
                      {option.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{option.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
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
            ))}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}
