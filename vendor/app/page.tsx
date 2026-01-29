"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getVendorToken } from "@/lib/vendor-auth-storage"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

export default function SplashScreen() {
  const router = useRouter()
  const pathname = usePathname()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const hasNavigatedRef = useRef(false)

  // Early return if we're not on root path - don't render splash screen
  // This prevents the splash screen from showing when navigating to other pages
  if (pathname && pathname !== "/" && pathname !== "/index.html") {
    console.log("🚀 [SPLASH] Early return - not on root path:", pathname)
    return null
  }

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      console.log("🚀 [SPLASH] Starting splash screen navigation check")
      console.log("🚀 [SPLASH] Current pathname:", pathname)
      console.log("🚀 [SPLASH] Window location:", typeof window !== "undefined" ? window.location?.pathname : "N/A")
      console.log("🚀 [SPLASH] Has navigated ref:", hasNavigatedRef.current)
      
      const token = await getVendorToken()
      console.log("🚀 [SPLASH] Token check:", token ? "Found" : "Not found")

      // If the app was opened via an in-app deep link (e.g., from a native notification),
      // don't override it by forcing a redirect to /dashboard.
      // This is especially important on cold starts where the native layer may trigger
      // navigation slightly after initial render.
      
      // Check for native navigation flag (set by MainActivity when notification is clicked)
      if (typeof window !== "undefined") {
        const nativeNavPending = localStorage.getItem("nativeNavigationPending")
        const nativeNavPath = localStorage.getItem("nativeNavigationPath")
        
        console.log("🚀 [SPLASH] Checking localStorage flags:")
        console.log("🚀 [SPLASH]   - nativeNavigationPending:", nativeNavPending)
        console.log("🚀 [SPLASH]   - nativeNavigationPath:", nativeNavPath)
        
        if (nativeNavPending === "true" && nativeNavPath) {
          console.log("🚀 [SPLASH] ✅ Native navigation flag detected!")
          console.log("🚀 [SPLASH]   - Target path:", nativeNavPath)
          console.log("🚀 [SPLASH]   - Navigating immediately via router.push()")
          
          // Clear the flags immediately
          localStorage.removeItem("nativeNavigationPending")
          localStorage.removeItem("nativeNavigationPath")
          console.log("🚀 [SPLASH]   - Flags cleared from localStorage")
          
          // Navigate immediately using Next.js router
          // This ensures proper navigation even if window.location.href didn't work
          try {
            router.push(nativeNavPath)
            console.log("🚀 [SPLASH]   - router.push() called successfully")
            setIsCheckingAuth(false)
            hasNavigatedRef.current = true
            console.log("🚀 [SPLASH]   - Navigation state updated, returning early")
            return
          } catch (error) {
            console.error("🚀 [SPLASH] ❌ Error during router.push():", error)
          }
        } else {
          console.log("🚀 [SPLASH]   - No native navigation flags found")
        }
      }
      
      // Check initial pathname (use Next.js pathname if available, fallback to window.location)
      const initialPath = pathname || (typeof window !== "undefined" ? window.location?.pathname : "/") || "/"
      console.log("🚀 [SPLASH] Initial path check:", initialPath)
      
      if (initialPath !== "/" && initialPath !== "/index.html") {
        console.log("🚀 [SPLASH] ✅ Already on non-root path:", initialPath, "- skipping redirect")
        setIsCheckingAuth(false)
        hasNavigatedRef.current = true
        return
      }
      
      // Wait a short time for any pending native navigation to set flags
      console.log("🚀 [SPLASH] Waiting 500ms for pending native navigation...")
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Check again for native navigation flag (in case it was set after initial check)
      if (typeof window !== "undefined") {
        const nativeNavPending = localStorage.getItem("nativeNavigationPending")
        const nativeNavPath = localStorage.getItem("nativeNavigationPath")
        
        console.log("🚀 [SPLASH] Re-checking localStorage flags after delay:")
        console.log("🚀 [SPLASH]   - nativeNavigationPending:", nativeNavPending)
        console.log("🚀 [SPLASH]   - nativeNavigationPath:", nativeNavPath)
        
        if (nativeNavPending === "true" && nativeNavPath) {
          console.log("🚀 [SPLASH] ✅ Native navigation detected after delay!")
          console.log("🚀 [SPLASH]   - Target path:", nativeNavPath)
          console.log("🚀 [SPLASH]   - Navigating via router.push()")
          
          localStorage.removeItem("nativeNavigationPending")
          localStorage.removeItem("nativeNavigationPath")
          console.log("🚀 [SPLASH]   - Flags cleared")
          
          try {
            router.push(nativeNavPath)
            console.log("🚀 [SPLASH]   - router.push() called successfully")
            setIsCheckingAuth(false)
            hasNavigatedRef.current = true
            console.log("🚀 [SPLASH]   - Navigation state updated, returning early")
            return
          } catch (error) {
            console.error("🚀 [SPLASH] ❌ Error during router.push():", error)
          }
        }
      }
      
      // Check if pathname changed (native navigation might have occurred)
      const currentPath = pathname || (typeof window !== "undefined" ? window.location?.pathname : "/") || "/"
      console.log("🚀 [SPLASH] Current path after delay:", currentPath)
      
      if (currentPath !== "/" && currentPath !== "/index.html") {
        console.log("🚀 [SPLASH] ✅ Navigation detected to:", currentPath, "- skipping redirect")
        setIsCheckingAuth(false)
        hasNavigatedRef.current = true
        return
      }
      
      // Only redirect if we're still on the root path and haven't navigated
      console.log("🚀 [SPLASH] Still on root path, checking if should redirect...")
      console.log("🚀 [SPLASH]   - hasNavigatedRef:", hasNavigatedRef.current)
      
      if (!hasNavigatedRef.current) {
        if (token) {
          // Token exists - go directly to dashboard
          // Token validation will happen on actual API calls (which handle 401 correctly)
          // This ensures user stays logged in even if server is temporarily unavailable
          console.log("🚀 [SPLASH] ✅ Token found, redirecting to dashboard")
          router.push("/dashboard")
        } else {
          // No token, go to login
          console.log("🚀 [SPLASH] ℹ️ No token found, redirecting to login")
          router.push("/login")
        }
      } else {
        console.log("🚀 [SPLASH] ⚠️ Already navigated, skipping default redirect")
      }
      
      setIsCheckingAuth(false)
      console.log("🚀 [SPLASH] Navigation check completed")
    }

    checkAuthAndRedirect()
  }, [router, pathname])

  // Listen for pathname changes (Next.js router)
  useEffect(() => {
    console.log("🚀 [SPLASH] Pathname changed:", pathname)
    if (pathname && pathname !== "/" && pathname !== "/index.html") {
      console.log("🚀 [SPLASH] ✅ Pathname changed to non-root:", pathname, "- stopping redirect")
      hasNavigatedRef.current = true
      setIsCheckingAuth(false)
    } else {
      console.log("🚀 [SPLASH] Pathname is still root:", pathname)
    }
  }, [pathname])

  // Don't render if we've already navigated
  if (hasNavigatedRef.current && !isCheckingAuth) {
    console.log("🚀 [SPLASH] Not rendering splash - already navigated")
    return null
  }

  console.log("🚀 [SPLASH] Rendering splash screen UI (pathname:", pathname, ")")
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4" style={{ paddingTop: `env(safe-area-inset-top, 0px)`, paddingBottom: `env(safe-area-inset-bottom, 0px)` }}>
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-3xl bg-primary/10 blur-3xl" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/80 shadow-2xl shadow-primary/30 animate-bounce-slow">
            <svg className="h-14 w-14 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Elecobuy Seller
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Your Business Command Center</p>
        </div>
        <div className="flex gap-2 mt-4">
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
    </div>
  )
}
