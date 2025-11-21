"use client"

import type React from "react"
import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

function OTPContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get("phone") || ""
  const [otp, setOtp] = useState(["", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [timer, setTimer] = useState(30)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000)
      return () => clearInterval(interval)
    }
  }, [timer])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    router.push("/dashboard")
  }

  const handleResend = () => {
    setTimer(30)
  }

  return (
    <div className="flex h-screen flex-col bg-background px-6 pt-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="text-muted-foreground">
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
          <span className="text-xl font-bold text-primary">VendorHub</span>
        </div>
      </div>

      {/* Hero Illustration - OTP/Security themed */}
      <div className="mb-6 flex justify-center flex-1">
        <div className="relative h-full w-full max-w-sm flex items-center justify-center">
          <div className="relative animate-float">
            {/* Main lock/security icon */}
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/10 border-4 border-primary/20">
              <svg className="h-14 w-14 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            {/* Floating shield */}
            <div className="absolute -right-2 -top-2 h-11 w-11 rounded-lg bg-primary text-white flex items-center justify-center shadow-lg animate-bounce-slow">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground text-balance">Verify your number</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 4-digit code sent to <span className="font-semibold text-foreground">{phone}</span>
        </p>
      </div>

      {/* OTP Input Form */}
      <form onSubmit={handleVerify} className="space-y-6">
        <div className="flex gap-3 justify-center">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="h-16 w-16 rounded-xl border-2 border-border bg-muted/50 text-center text-2xl font-bold text-foreground transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 focus:scale-105"
            />
          ))}
        </div>

        <Button
          type="submit"
          disabled={isLoading || otp.some((d) => !d)}
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
              Verifying...
            </span>
          ) : (
            "Verify & Continue"
          )}
        </Button>
      </form>

      {/* Resend OTP */}
      <div className="text-center mt-4">
        {timer > 0 ? (
          <p className="text-sm text-muted-foreground">
            Resend code in <span className="font-semibold text-primary">{timer}s</span>
          </p>
        ) : (
          <button onClick={handleResend} className="text-sm text-primary font-semibold hover:underline">
            Resend OTP
          </button>
        )}
      </div>
    </div>
  )
}

export default function OTPPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <OTPContent />
    </Suspense>
  )
}
