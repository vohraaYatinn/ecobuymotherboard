"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Lock, Mail, ArrowLeft, UserCog } from "lucide-react"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

type LoginMode = "admin" | "employee"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [loginMode, setLoginMode] = useState<LoginMode>("admin")

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("adminToken")
      const loginType = localStorage.getItem("adminLoginType")

      if (!token) {
        setIsCheckingAuth(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/admin/verify`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = await response.json()

        if (response.ok && data.success) {
          router.push("/admin")
        } else {
          localStorage.removeItem("adminToken")
          localStorage.removeItem("adminData")
          localStorage.removeItem("adminLoginType")
          setIsCheckingAuth(false)
        }
      } catch (error) {
        localStorage.removeItem("adminToken")
        localStorage.removeItem("adminData")
        localStorage.removeItem("adminLoginType")
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const loginUrl =
        loginMode === "employee"
          ? `${API_URL}/api/admin/employees/login`
          : `${API_URL}/api/auth/admin/login`

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Login failed. Please try again.")
        setIsLoading(false)
        return
      }

      if (data.token) {
        localStorage.setItem("adminToken", data.token)
        localStorage.setItem("adminLoginType", loginMode)

        if (loginMode === "employee" && data.employee) {
          localStorage.setItem(
            "adminData",
            JSON.stringify({
              ...data.employee,
              type: "employee",
            })
          )
        } else if (data.admin) {
          localStorage.setItem(
            "adminData",
            JSON.stringify({
              ...data.admin,
              type: "admin",
            })
          )
        }
      }

      window.location.href = "/admin"
    } catch (err) {
      console.error("Login error:", err)
      setError("Network error. Please check if the server is running.")
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/40">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/40 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            {loginMode === "employee" ? (
              <UserCog className="h-8 w-8 text-primary" />
            ) : (
              <Shield className="h-8 w-8 text-primary" />
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {loginMode === "employee" ? "Employee Portal" : "Admin Portal"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access the {loginMode === "employee" ? "employee" : "admin"} dashboard
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card shadow-lg p-6 sm:p-8">
          {/* Login Mode Toggle */}
          <div className="flex rounded-lg border border-border mb-6 overflow-hidden">
            <button
              type="button"
              onClick={() => { setLoginMode("admin"); setError("") }}
              className={cn(
                "flex-1 py-2.5 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                loginMode === "admin"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode("employee"); setError("") }}
              className={cn(
                "flex-1 py-2.5 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                loginMode === "employee"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              <UserCog className="h-4 w-4" />
              Employee
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={loginMode === "employee" ? "employee@ecobuy.com" : "admin@ecobuy.com"}
                className="w-full"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-border" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <Link
                href="#"
                className="text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault()
                }}
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to homepage
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            <Shield className="h-3 w-3 inline mr-1" />
            This is a secure area. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  )
}

