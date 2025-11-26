"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.safartax.com"

export default function SplashScreen() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const token = localStorage.getItem("vendorToken")
      
      // Wait a bit for splash screen animation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      if (token) {
        try {
          // Verify token by fetching profile
          const response = await fetch(`${API_URL}/api/vendor-auth/profile`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          const data = await response.json()

          if (response.ok && data.success) {
            // Token is valid, redirect to dashboard
            router.push("/dashboard")
            return
          } else {
            // Token is invalid, clear it and go to login
            localStorage.removeItem("vendorToken")
            localStorage.removeItem("vendorData")
            router.push("/login")
          }
        } catch (error) {
          // Error checking auth, clear token and go to login
          console.error("Error checking auth:", error)
          localStorage.removeItem("vendorToken")
          localStorage.removeItem("vendorData")
          router.push("/login")
        }
      } else {
        // No token, go to login
        router.push("/login")
      }
      
      setIsCheckingAuth(false)
    }

    checkAuthAndRedirect()
  }, [router])

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
