"use client"

import { useEffect, useState, createContext, useContext } from "react"
import { useRouter, usePathname } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

interface AuthContextType {
  userType: "admin" | "employee" | null
  permissions: string[]
  hasPermission: (perm: string) => boolean
  hasAnyPermission: (...perms: string[]) => boolean
  userName: string
  userEmail: string
}

const AuthContext = createContext<AuthContextType>({
  userType: null,
  permissions: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  userName: "",
  userEmail: "",
})

export const useAdminAuth = () => useContext(AuthContext)

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [authData, setAuthData] = useState<AuthContextType>({
    userType: null,
    permissions: [],
    hasPermission: () => false,
    hasAnyPermission: () => false,
    userName: "",
    userEmail: "",
  })

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("adminToken")
      const loginType = localStorage.getItem("adminLoginType")

      if (!token) {
        router.push("/admin-login")
        return
      }

      try {
        // Always use the same verify endpoint - it now handles both admin and employee tokens
        const response = await fetch(`${API_URL}/api/auth/admin/verify`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          localStorage.removeItem("adminToken")
          localStorage.removeItem("adminData")
          localStorage.removeItem("adminLoginType")
          router.push("/admin-login")
          return
        }

        // Detect employee from response data or localStorage
        const isEmployee = !!data.employee || loginType === "employee" || data.admin?.type === "employee"
        const permissions = isEmployee ? data.employee?.permissions || [] : []
        const userName = isEmployee
          ? data.employee?.name || ""
          : data.admin?.name || "Admin"
        const userEmail = isEmployee
          ? data.employee?.email || ""
          : data.admin?.email || ""

        // Update localStorage with fresh data
        if (isEmployee && data.employee) {
          localStorage.setItem("adminLoginType", "employee")
          localStorage.setItem("adminData", JSON.stringify({
            ...data.employee,
            type: "employee",
          }))
        }

        setAuthData({
          userType: isEmployee ? "employee" : "admin",
          permissions,
          hasPermission: (perm: string) =>
            !isEmployee || permissions.includes(perm),
          hasAnyPermission: (...perms: string[]) =>
            !isEmployee || perms.some((p) => permissions.includes(p)),
          userName,
          userEmail,
        })

        setIsAuthenticated(true)
      } catch (error) {
        console.error("Auth check error:", error)
        localStorage.removeItem("adminToken")
        localStorage.removeItem("adminData")
        localStorage.removeItem("adminLoginType")
        router.push("/admin-login")
      }
    }

    if (pathname !== "/admin-login") {
      checkAuth()
    } else {
      setIsAuthenticated(true)
    }
  }, [router, pathname])

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

  return (
    <AuthContext.Provider value={authData}>
      {children}
    </AuthContext.Provider>
  )
}




