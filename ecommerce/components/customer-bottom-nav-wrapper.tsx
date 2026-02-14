"use client"

import { usePathname } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"
import { PullToRefresh } from "@/components/pull-to-refresh"

export function CustomerBottomNavWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isCustomerRoute = !pathname?.startsWith("/admin")

  return (
    <>
      <PullToRefresh>
        <div className={isCustomerRoute ? "pb-20 lg:pb-0" : undefined}>
          {children}
        </div>
      </PullToRefresh>
      {isCustomerRoute && <BottomNav />}
    </>
  )
}
