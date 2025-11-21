"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { Input } from "@/components/ui/input"

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const customers = [
    {
      id: 1,
      name: "Rajesh Kumar",
      email: "rajesh.kumar@example.com",
      phone: "+91 98765 43210",
      totalOrders: 24,
      totalSpent: 2_87_817,
      lastOrder: "2 hours ago",
      status: "active",
    },
    {
      id: 2,
      name: "Priya Sharma",
      email: "priya.sharma@example.com",
      phone: "+91 98234 56789",
      totalOrders: 18,
      totalSpent: 1_82_458,
      lastOrder: "5 hours ago",
      status: "active",
    },
    {
      id: 3,
      name: "Amit Patel",
      email: "amit.patel@example.com",
      phone: "+91 97123 45678",
      totalOrders: 32,
      totalSpent: 4_36_116,
      lastOrder: "1 day ago",
      status: "active",
    },
    {
      id: 4,
      name: "Sneha Reddy",
      email: "sneha.reddy@example.com",
      phone: "+91 96012 34567",
      totalOrders: 12,
      totalSpent: 1_30_602,
      lastOrder: "1 day ago",
      status: "active",
    },
    {
      id: 5,
      name: "Vikram Singh",
      email: "vikram.singh@example.com",
      phone: "+91 95901 23456",
      totalOrders: 8,
      totalSpent: 74_159,
      lastOrder: "1 week ago",
      status: "inactive",
    },
  ]

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const stats = [
    {
      label: "Total Customers",
      value: customers.length.toString(),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      color: "primary",
    },
    {
      label: "Active",
      value: customers.filter((c) => c.status === "active").length.toString(),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: "chart-3",
    },
    {
      label: "Total Revenue",
      value: `₹${(customers.reduce((sum, c) => sum + c.totalSpent, 0) / 100000).toFixed(1)}L`,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: "chart-2",
    },
  ]

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 border-b-2 border-border/50 bg-card/98 backdrop-blur-xl shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Customers</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your customer base</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              type="search"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-muted/50 border-border"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="border-2 border-border/50 bg-card hover:shadow-lg transition-all hover:-translate-y-0.5 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4 text-center">
                <div
                  className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-${stat.color}/10 text-${stat.color}`}
                >
                  {stat.icon}
                </div>
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className="mt-1 text-xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">All Customers</h2>
            <span className="text-xs text-muted-foreground">{filteredCustomers.length} total</span>
          </div>
          {filteredCustomers.map((customer, index) => (
            <Link key={customer.id} href={`/customers/${customer.id}`}>
              <Card
                className="border-2 border-border/50 bg-card hover:border-primary/50 hover:shadow-lg transition-all hover:-translate-y-0.5 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-white text-lg font-bold shadow-lg shadow-primary/30">
                        {customer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full border-2 border-card ${customer.status === "active" ? "bg-chart-3" : "bg-muted-foreground"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-bold text-foreground truncate">{customer.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-border/50">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                              />
                            </svg>
                            <span className="font-medium">{customer.totalOrders}</span>
                          </span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                          <span className="text-xs">{customer.lastOrder}</span>
                        </div>
                        <p className="text-base font-bold text-primary">₹{(customer.totalSpent / 1000).toFixed(1)}K</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
