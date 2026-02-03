"use client"

import dynamic from "next/dynamic"

const Analytics = dynamic(
  () =>
    import("@vercel/analytics/next").then((mod) => ({ default: mod.Analytics })),
  { ssr: false }
)

export function AnalyticsClient() {
  return <Analytics />
}
