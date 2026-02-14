"use client"

import { usePathname } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"

export function CustomerBottomNavWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isCustomerRoute = !pathname?.startsWith("/admin")

  return (
    <>
      <div className={isCustomerRoute ? "pb-20 lg:pb-0" : undefined}>
        {children}
      </div>
      {isCustomerRoute && <BottomNav />}
    </>
  )
}
