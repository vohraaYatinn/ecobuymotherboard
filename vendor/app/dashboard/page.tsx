"use client"

import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import Link from "next/link"

export default function DashboardPage() {
  const stats = [
    {
      title: "Total Orders",
      value: "1,284",
      change: "+12.5%",
      trend: "up",
      href: "/orders",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Pending",
      value: "42",
      change: "-8.2%",
      trend: "down",
      href: "/accept-orders",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      bgColor: "bg-chart-5/10",
      iconColor: "text-chart-5",
    },
    {
      title: "Revenue",
      value: "₹40.3L",
      change: "+18.3%",
      trend: "up",
      href: "/orders",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      bgColor: "bg-chart-3/10",
      iconColor: "text-chart-3",
    },
    {
      title: "Avg. Value",
      value: "₹11.8K",
      change: "+5.7%",
      trend: "up",
      href: "/orders",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      bgColor: "bg-chart-2/10",
      iconColor: "text-chart-2",
    },
  ]

  const recentOrders = [
    { id: "#ORD-1234", customer: "Rajesh Kumar", amount: "₹20,417", status: "delivered", time: "2h" },
    { id: "#ORD-1233", customer: "Priya Sharma", amount: "₹10,708", status: "processing", time: "5h" },
    { id: "#ORD-1232", customer: "Amit Patel", amount: "₹32,666", status: "pending", time: "1d" },
  ]

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Header - Fixed at top */}
      <div className="flex-none border-b border-border/50 bg-card/95 backdrop-blur-xl shadow-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/30">
              <svg className="h-5 w-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Dashboard</h1>
              <p className="text-xs text-muted-foreground">Welcome back, Alex</p>
            </div>
          </div>
          <Link href="/notifications">
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 transition-all hover:scale-105 border border-border shadow-sm">
              <svg className="h-5 w-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 space-y-4">
        {/* Stats Grid - Compact design */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => (
            <Link key={index} href={stat.href}>
              <Card className="border-2 border-border/50 bg-card shadow-md hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bgColor}`}>
                      <span className={stat.iconColor}>{stat.icon}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.title}</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{stat.value}</p>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold mt-1 ${stat.trend === "up" ? "text-chart-3" : "text-destructive"}`}
                    >
                      {stat.trend === "up" ? (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 11-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {stat.change}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-foreground flex items-center gap-2">
            <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                name: "Reports",
                color: "chart-2",
                href: "/orders",
                icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
              },
              {
                name: "Customers",
                color: "chart-3",
                href: "/customers",
                icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
              },
            ].map((action, idx) => (
              <Link key={idx} href={action.href}>
                <button className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 hover:border-primary/50">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-${action.color} to-${action.color}/80 shadow-lg shadow-${action.color}/30`}
                  >
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-foreground text-center leading-tight">{action.name}</span>
                </button>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Recent Orders
            </h2>
            <Link href="/orders">
              <button className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
                View All
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </Link>
          </div>
          <Card className="border-2 border-border shadow-md">
            <CardContent className="p-0">
              {recentOrders.map((order, index) => (
                <Link key={order.id} href={`/orders/${order.id.replace("#", "")}`}>
                  <div
                    className={`flex items-center gap-3 p-3 transition-colors hover:bg-secondary/50 cursor-pointer ${
                      index !== recentOrders.length - 1 ? "border-b border-border/50" : ""
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm ${
                        order.status === "delivered"
                          ? "bg-chart-3/10"
                          : order.status === "processing"
                            ? "bg-primary/10"
                            : "bg-chart-5/10"
                      }`}
                    >
                      <svg
                        className={`h-5 w-5 ${order.status === "delivered" ? "text-chart-3" : order.status === "processing" ? "text-primary" : "text-chart-5"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{order.customer}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.id} • {order.time}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">{order.amount}</p>
                      <span
                        className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                          order.status === "delivered"
                            ? "bg-chart-3/10 text-chart-3"
                            : order.status === "processing"
                              ? "bg-primary/10 text-primary"
                              : "bg-chart-5/10 text-chart-5"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
