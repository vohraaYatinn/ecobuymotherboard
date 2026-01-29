"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Navigation handler component that listens for native navigation requests
 * and ensures proper Next.js router navigation instead of window.location.href
 */
export function NavigationHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    console.log("🧭 [NAV-HANDLER] Component mounted")
    console.log("🧭 [NAV-HANDLER] Current pathname:", pathname)
    console.log("🧭 [NAV-HANDLER] Window location:", typeof window !== "undefined" ? window.location?.pathname : "N/A")

    // Expose navigation function to window for Android to call
    if (typeof window !== "undefined") {
      // @ts-ignore
      window.navigateToRoute = (path: string) => {
        console.log("🧭 [NAV-HANDLER] navigateToRoute called with path:", path)
        if (path && path.startsWith("/")) {
          console.log("🧭 [NAV-HANDLER] Navigating via router.push() to:", path)
          router.push(path)
        } else {
          console.warn("🧭 [NAV-HANDLER] Invalid path provided:", path)
        }
      }

      // Check if we're on a non-root path but the page didn't load properly
      // This can happen when window.location.href is used instead of router.push
      const currentPath = window.location?.pathname || "/"
      const expectedPath = pathname || "/"
      
      console.log("🧭 [NAV-HANDLER] Path comparison:")
      console.log("🧭 [NAV-HANDLER]   - window.location.pathname:", currentPath)
      console.log("🧭 [NAV-HANDLER]   - Next.js pathname:", expectedPath)

      // If window.location shows /accept-orders but Next.js pathname is still /,
      // we need to force navigation
      if (currentPath !== "/" && currentPath !== "/index.html" && expectedPath === "/") {
        console.log("🧭 [NAV-HANDLER] ⚠️ Path mismatch detected!")
        console.log("🧭 [NAV-HANDLER]   - Window location:", currentPath)
        console.log("🧭 [NAV-HANDLER]   - Next.js pathname:", expectedPath)
        console.log("🧭 [NAV-HANDLER]   - Forcing navigation to:", currentPath)
        
        // Small delay to ensure router is ready
        setTimeout(() => {
          router.push(currentPath)
          console.log("🧭 [NAV-HANDLER]   - router.push() called")
        }, 100)
      }

      // Also check localStorage for pending navigation
      const nativeNavPending = localStorage.getItem("nativeNavigationPending")
      const nativeNavPath = localStorage.getItem("nativeNavigationPath")
      
      if (nativeNavPending === "true" && nativeNavPath) {
        console.log("🧭 [NAV-HANDLER] ✅ Found pending native navigation")
        console.log("🧭 [NAV-HANDLER]   - Target path:", nativeNavPath)
        console.log("🧭 [NAV-HANDLER]   - Current pathname:", pathname)
        
        // Clear flags
        localStorage.removeItem("nativeNavigationPending")
        localStorage.removeItem("nativeNavigationPath")
        
        // Navigate if not already on target path
        if (pathname !== nativeNavPath) {
          console.log("🧭 [NAV-HANDLER]   - Navigating to:", nativeNavPath)
          router.push(nativeNavPath)
        } else {
          console.log("🧭 [NAV-HANDLER]   - Already on target path, skipping navigation")
        }
      }
    }

    return () => {
      // Cleanup
      if (typeof window !== "undefined") {
        // @ts-ignore
        delete window.navigateToRoute
      }
    }
  }, [router, pathname])

  return null
}
