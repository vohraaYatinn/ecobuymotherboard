"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Monitor, ShoppingBag, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Products", href: "/products", icon: Monitor },
  { label: "Become Seller", href: "/become-seller", icon: ShoppingBag },
  { label: "Account", href: "/dashboard", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-bottom rounded-t-2xl bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.06)] dark:bg-card dark:shadow-[0_-2px_12px_rgba(0,0,0,0.2)]"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex items-center justify-around px-2 pt-3 safe-left safe-right">
        {navItems.map((item) => {
          const isExact = pathname === item.href
          const isActive =
            isExact ||
            (item.href !== "/" && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 min-w-0 flex-1 max-w-[90px] py-1 transition-colors active:opacity-80",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-6 w-6 shrink-0",
                  isActive ? "fill-foreground stroke-foreground" : "stroke-[1.5]",
                )}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span
                className={cn(
                  "text-xs text-center truncate w-full",
                  isActive ? "font-semibold text-foreground" : "font-medium",
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
