"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const PULL_THRESHOLD = 72
const MAX_PULL = 120
const RESISTANCE = 0.45

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean
      getPlatform?: () => string
    }
  }
}

function isCapacitorNative() {
  if (typeof window === "undefined") return false
  const cap = window.Capacitor
  if (!cap) return false
  if (typeof cap.isNativePlatform === "function") return cap.isNativePlatform()
  const platform = typeof cap.getPlatform === "function" ? cap.getPlatform() : ""
  return platform === "android" || platform === "ios"
}

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const scrollTop = useRef(0)
  const enabled = useRef(false)
  const pullDistanceRef = useRef(0)
  const isRefreshingRef = useRef(false)

  pullDistanceRef.current = pullDistance
  isRefreshingRef.current = isRefreshing

  const triggerRefresh = useCallback(() => {
    if (isRefreshingRef.current) return
    isRefreshingRef.current = true
    setIsRefreshing(true)
    router.refresh()
    window.dispatchEvent(new CustomEvent("pull-to-refresh"))
    const t = setTimeout(() => {
      isRefreshingRef.current = false
      setIsRefreshing(false)
    }, 800)
    return () => clearTimeout(t)
  }, [router])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isCapacitorNative()) return

    const handleTouchStart = (e: TouchEvent) => {
      scrollTop.current = window.scrollY ?? document.documentElement.scrollTop
      touchStartY.current = e.touches[0].clientY
      enabled.current = scrollTop.current <= 2
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!enabled.current || isRefreshingRef.current) return
      const y = e.touches[0].clientY
      const delta = y - touchStartY.current
      if (delta > 0 && scrollTop.current <= 2) {
        const resisted = Math.min(delta * RESISTANCE, MAX_PULL)
        pullDistanceRef.current = resisted
        setPullDistance(resisted)
      }
    }

    const handleTouchEnd = () => {
      const currentPull = pullDistanceRef.current
      setPullDistance(0)
      pullDistanceRef.current = 0
      enabled.current = false
      if (!isRefreshingRef.current && currentPull >= PULL_THRESHOLD) {
        triggerRefresh()
      }
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    document.addEventListener("touchmove", handleTouchMove, { passive: true })
    document.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [triggerRefresh])

  const showIndicator = pullDistance > 0 || isRefreshing
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1)

  return (
    <>
      {showIndicator && (
        <div
          className="fixed left-0 right-0 top-0 z-50 flex justify-center pt-4 safe-top lg:hidden"
          style={{
            paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))",
          }}
          aria-hidden
        >
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full bg-background/95 shadow-md ring-1 ring-border",
              isRefreshing && "animate-pulse",
            )}
          >
            {isRefreshing ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Loader2
                className="h-5 w-5 text-primary transition-transform duration-150"
                style={{
                  transform: `rotate(${progress * 360}deg)`,
                  opacity: 0.6 + progress * 0.4,
                }}
              />
            )}
          </div>
        </div>
      )}
      {children}
    </>
  )
}
