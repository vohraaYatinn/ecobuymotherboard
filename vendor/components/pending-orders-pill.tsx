"use client"

import { cn } from "@/lib/utils"

type Props = {
  count: number
  className?: string
}

export function PendingOrdersPill({ count, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20",
        className,
      )}
      aria-label={`Unassigned pending orders: ${count}`}
    >
      <div className={cn("h-2 w-2 rounded-full bg-primary", count > 0 && "animate-pulse")} />
      <span className="text-xs font-semibold text-primary">{count} pending</span>
    </div>
  )
}

