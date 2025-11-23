"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    {
      label: "Home",
      href: "/dashboard",
      icon: (isActive: boolean) => (
        <svg className="h-6 w-6" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={isActive ? 0 : 2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: "Orders",
      href: "/orders",
      icon: (isActive: boolean) => (
        <svg className="h-6 w-6" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={isActive ? 0 : 2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
    },
    {
      /* Replaced Customers with Accept Orders */
      label: "Accept",
      href: "/accept-orders",
      icon: (isActive: boolean) => (
        <svg className="h-6 w-6" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={isActive ? 0 : 2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Profile",
      href: "/profile",
      icon: (isActive: boolean) => (
        <svg className="h-6 w-6" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={isActive ? 0 : 2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-border bg-card/98 backdrop-blur-xl shadow-[0_-4px_12px_rgba(0,0,0,0.05)] safe-bottom" style={{ paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px))` }}>
      <div className="flex items-center justify-around px-2 py-3 safe-left safe-right">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl px-5 py-2 transition-all",
                isActive
                  ? "text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              {isActive && (
                <div className="absolute -top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-primary animate-fade-in" />
              )}
              <div className={cn("flex items-center justify-center transition-transform", isActive && "scale-110")}>
                {item.icon(isActive)}
              </div>
              <span className={cn("text-xs font-medium", isActive && "font-bold")}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
