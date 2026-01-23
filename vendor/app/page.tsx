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

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const token = await getVendorToken()

      // If the app was opened via an in-app deep link (e.g., from a native notification),
      // don't override it by forcing a redirect to /dashboard.
      // This is especially important on cold starts where the native layer may trigger
      // navigation slightly after initial render.
      
      // Check for native navigation flag (set by MainActivity when notification is clicked)
      if (typeof window !== "undefined") {
        const nativeNavPending = localStorage.getItem("nativeNavigationPending")
        const nativeNavPath = localStorage.getItem("nativeNavigationPath")
        
        if (nativeNavPending === "true" && nativeNavPath) {
          console.log("📍 Native navigation pending to:", nativeNavPath, "- waiting for navigation")
          // Clear the flag
          localStorage.removeItem("nativeNavigationPending")
          // Wait for navigation to complete
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Check if navigation happened
          const currentPath = window.location?.pathname || "/"
          if (currentPath !== "/" && currentPath !== "/index.html") {
            console.log("📍 Navigation completed to:", currentPath, "- skipping redirect")
            localStorage.removeItem("nativeNavigationPath")
            setIsCheckingAuth(false)
            hasNavigatedRef.current = true
            return
          }
          
          // If navigation didn't happen, try to navigate manually
          console.log("📍 Native navigation didn't complete, navigating manually to:", nativeNavPath)
          router.push(nativeNavPath)
          localStorage.removeItem("nativeNavigationPath")
          setIsCheckingAuth(false)
          hasNavigatedRef.current = true
          return
        }
      }
      
      // Check initial pathname
      if (typeof window !== "undefined") {
        const path = window.location?.pathname || "/"
        if (path !== "/" && path !== "/index.html") {
          console.log("📍 Already on path:", path, "- skipping redirect")
          setIsCheckingAuth(false)
          hasNavigatedRef.current = true
          return
        }
      }
      
      // Wait for splash screen animation and give native navigation time to complete
      // Native navigation from MainActivity can take 2-5 seconds on cold starts
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Check again if navigation happened (native navigation might have occurred)
      if (typeof window !== "undefined") {
        const currentPath = window.location?.pathname || "/"
        if (currentPath !== "/" && currentPath !== "/index.html") {
          console.log("📍 Navigation detected to:", currentPath, "- skipping redirect")
          setIsCheckingAuth(false)
          hasNavigatedRef.current = true
          return
        }
      }
      
      // Wait a bit more for native navigation (total ~3 seconds)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Final check - if we're still on "/", then proceed with default redirect
      if (typeof window !== "undefined") {
        const finalPath = window.location?.pathname || "/"
        if (finalPath !== "/" && finalPath !== "/index.html") {
          console.log("📍 Navigation detected to:", finalPath, "- skipping redirect")
          setIsCheckingAuth(false)
          hasNavigatedRef.current = true
          return
        }
      }
      
      // Only redirect if we're still on the root path and haven't navigated
      if (!hasNavigatedRef.current) {
        if (token) {
          // Token exists - go directly to dashboard
          // Token validation will happen on actual API calls (which handle 401 correctly)
          // This ensures user stays logged in even if server is temporarily unavailable
          console.log("✅ Token found, redirecting to dashboard")
          router.push("/dashboard")
        } else {
          // No token, go to login
          console.log("ℹ️ No token found, redirecting to login")
          router.push("/login")
        }
      }
      
      setIsCheckingAuth(false)
    }

    checkAuthAndRedirect()
  }, [router])

  // Listen for pathname changes (Next.js router)
  useEffect(() => {
    if (pathname && pathname !== "/" && pathname !== "/index.html") {
      console.log("📍 Pathname changed to:", pathname, "- stopping redirect")
      hasNavigatedRef.current = true
      setIsCheckingAuth(false)
    }
  }, [pathname])

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
