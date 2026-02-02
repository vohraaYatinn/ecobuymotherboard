"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

type Props = {
  count: number
  className?: string
}

export function NotificationBellButton({ count, className }: Props) {
  return (
    <Link href="/notifications" className={cn("relative", className)}>
      <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 transition-all hover:scale-105 shadow-lg border border-border/50">
        <svg className="h-5 w-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-destructive to-destructive/80 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
    </Link>
  )
}

