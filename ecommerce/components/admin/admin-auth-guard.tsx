"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.35:5000"

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("adminToken")

      if (!token) {
        router.push("/admin-login")
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/admin/verify`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          // Token is invalid, clear storage and redirect
          localStorage.removeItem("adminToken")
          localStorage.removeItem("adminData")
          router.push("/admin-login")
          return
        }

        // Token is valid
        setIsAuthenticated(true)
      } catch (error) {
        console.error("Auth check error:", error)
        // On error, clear storage and redirect
        localStorage.removeItem("adminToken")
        localStorage.removeItem("adminData")
        router.push("/admin-login")
      }
    }

    // Don't check auth on login page
    if (pathname !== "/admin-login") {
      checkAuth()
    } else {
      setIsAuthenticated(true)
    }
  }, [router, pathname])

  // Show loading state while checking authentication
  if (isAuthenticated === null && pathname !== "/admin-login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/40">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}




