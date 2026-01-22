"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { API_URL } from "@/lib/api-config"
import { getVendorToken } from "@/lib/vendor-auth-storage"

export default function LoginPage() {
  const router = useRouter()
  const countryCode = "+91" // Fixed to India - no dropdown needed
  const [phone, setPhone] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = await getVendorToken()
      
      if (token) {
        // Token exists - redirect to dashboard
        // Token validation will happen on actual API calls (which handle 401 correctly)
        // This ensures user stays logged in even if server is temporarily unavailable
        router.push("/dashboard")
      } else {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  const handleGetOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const countryCodeNum = countryCode.replace("+", "")
      const response = await fetch(`${API_URL}/api/vendor-auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: phone,
          countryCode: countryCodeNum,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || "Failed to send OTP. Please try again.")
        setIsLoading(false)
        return
      }

      // Store verification ID in sessionStorage
      sessionStorage.setItem("vendorVerificationId", data.verificationId)
      sessionStorage.setItem("vendorMobile", data.mobile)

      // Redirect to OTP page
      router.push(`/otp?phone=${encodeURIComponent(data.mobile)}`)
    } catch (err) {
      console.error("Error sending OTP:", err)
      setError("Network error. Please check if the server is running.")
      setIsLoading(false)
    }
  }

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div
        className="flex h-screen flex-col items-center justify-center bg-background"
        style={{
          paddingTop: `calc(1.5rem + env(safe-area-inset-top, 0px))`,
          paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex h-screen flex-col bg-background px-6"
      style={{
        paddingTop: `calc(1.5rem + env(safe-area-inset-top, 0px))`,
        paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button className="text-muted-foreground">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex gap-1 items-center">
          <div className="h-1 w-1 rounded-full bg-muted-foreground" />
          <div className="h-1 w-1 rounded-full bg-muted-foreground" />
          <div className="h-1 w-1 rounded-full bg-muted-foreground" />
        </div>
      </div>

      {/* Logo */}
      <div className="mb-6 flex justify-center">
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-primary">Elecobuy Seller</span>
        </div>
      </div>

      {/* Hero Illustration */}
      <div className="mb-6 flex justify-center flex-1">
        <div className="relative h-full w-full max-w-sm flex items-center justify-center">
          {/* Background city silhouette */}
          <div className="absolute inset-0 flex items-end justify-center opacity-10">
            <svg className="h-24 w-full" fill="currentColor" viewBox="0 0 400 100">
              <rect x="20" y="40" width="30" height="60" className="text-muted-foreground" />
              <rect x="60" y="20" width="35" height="80" className="text-muted-foreground" />
              <rect x="105" y="50" width="28" height="50" className="text-muted-foreground" />
              <rect x="145" y="30" width="40" height="70" className="text-muted-foreground" />
              <rect x="195" y="45" width="32" height="55" className="text-muted-foreground" />
              <rect x="240" y="25" width="38" height="75" className="text-muted-foreground" />
              <rect x="290" y="35" width="33" height="65" className="text-muted-foreground" />
              <rect x="335" y="50" width="30" height="50" className="text-muted-foreground" />
            </svg>
          </div>

          {/* Main illustration - Shopping bags and cart */}
          <div className="relative flex items-center justify-center h-full animate-float">
            <div className="relative">
              {/* Shopping cart */}
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/10 border-4 border-primary/20">
                <svg className="h-14 w-14 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              {/* Floating shopping bag */}
              <div className="absolute -right-2 -top-2 h-11 w-11 rounded-lg bg-primary text-white flex items-center justify-center shadow-lg animate-bounce-slow">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground text-balance">Let's you in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Hey, You haven't login a minute!</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Phone Input Form */}
      <form onSubmit={handleGetOTP} className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            value={countryCode}
            disabled
            className="w-24 h-14 bg-muted/50 border-border text-base text-center cursor-not-allowed"
            readOnly
          />
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <Input
              type="tel"
              placeholder="Enter your number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              className="h-14 pl-12 bg-muted/50 border-border text-base"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || phone.length < 10}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-white text-base font-semibold shadow-lg shadow-primary/30 transition-all hover:shadow-xl disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Sending OTP...
            </span>
          ) : (
            "Get OTP"
          )}
        </Button>
      </form>
    </div>
  )
}
