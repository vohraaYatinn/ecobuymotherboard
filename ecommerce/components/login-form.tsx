"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

export function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState(["", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [verificationId, setVerificationId] = useState("")
  const [timer, setTimer] = useState(30)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (step === "otp") {
      inputRefs.current[0]?.focus()
    }
  }, [step])

  useEffect(() => {
    if (timer > 0 && step === "otp") {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000)
      return () => clearInterval(interval)
    }
  }, [timer, step])

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`${API_URL}/api/customer-auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: phoneNumber,
          countryCode: "91",
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || "Failed to send OTP. Please try again.")
        setIsLoading(false)
        return
      }

      setVerificationId(data.verificationId)
      sessionStorage.setItem("customerVerificationId", data.verificationId)
      sessionStorage.setItem("customerMobile", data.mobile)
      setStep("otp")
      setTimer(30)
    } catch (err) {
      console.error("Error sending OTP:", err)
      setError("Network error. Please check if the server is running.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp]
      newOtp[index] = value
      setOtp(newOtp)

      if (value && index < 3) {
        inputRefs.current[index + 1]?.focus()
      }
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const otpValue = otp.join("")
      const storedVerificationId = verificationId || sessionStorage.getItem("customerVerificationId")
      const storedMobile = sessionStorage.getItem("customerMobile") || `91${phoneNumber}`

      if (!storedVerificationId) {
        setError("Session expired. Please request a new OTP.")
        setIsLoading(false)
        setStep("phone")
        return
      }

      const countryCode = storedMobile.startsWith("91") ? "91" : storedMobile.substring(0, 2)
      const mobile = storedMobile.replace(/^\+?91/, "").replace(/\s+/g, "")

      const response = await fetch(`${API_URL}/api/customer-auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: mobile,
          countryCode: countryCode,
          otp: otpValue,
          verificationId: storedVerificationId,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || "Invalid OTP. Please try again.")
        setIsLoading(false)
        return
      }

      // Store token and user data
      if (data.token) {
        localStorage.setItem("customerToken", data.token)
        localStorage.setItem("customerData", JSON.stringify(data.user))
      }

      // Clear session storage
      sessionStorage.removeItem("customerVerificationId")
      sessionStorage.removeItem("customerMobile")

      // Trigger cart refresh to merge session cart with customer cart
      window.dispatchEvent(new Event("customerLoggedIn"))
      // Trigger auth change for header update
      window.dispatchEvent(new Event("auth-change"))

      // Redirect to previous page or home
      const returnUrl = sessionStorage.getItem("returnUrl") || "/"
      sessionStorage.removeItem("returnUrl")
      router.push(returnUrl)
    } catch (err) {
      console.error("Error verifying OTP:", err)
      setError("Network error. Please try again.")
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setTimer(30)
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/customer-auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: phoneNumber,
          countryCode: "91",
        }),
      })

      const data = await response.json()

      if (data.success) {
        setVerificationId(data.verificationId)
        sessionStorage.setItem("customerVerificationId", data.verificationId)
        sessionStorage.setItem("customerMobile", data.mobile)
      } else {
        setError(data.message || "Failed to resend OTP")
      }
    } catch (err) {
      console.error("Error resending OTP:", err)
      setError("Failed to resend OTP. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {step === "phone" ? "Welcome to Elecobuy" : "Verify OTP"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {step === "phone" ? "Enter your phone number to continue" : `We've sent a 4-digit code to ${phoneNumber}`}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {step === "phone" ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2 mt-2">
                  <div className="flex items-center px-3 border border-input rounded-md bg-muted">
                    <span className="text-sm font-medium">+91</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    required
                    placeholder="Enter 10-digit number"
                    className="flex-1"
                    maxLength={10}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isLoading || phoneNumber.length < 10}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el
                      }}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-semibold"
                      maxLength={1}
                      disabled={isLoading}
                    />
                  ))}
                </div>

                <div className="text-center">
                  {timer > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Resend code in <span className="font-semibold text-primary">{timer}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={handleResendOTP}
                      disabled={isLoading}
                    >
                      Didn't receive code? Resend OTP
                    </button>
                  )}
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isLoading || otp.some((d) => !d)}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep("phone")
                  setError("")
                }}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full"
              >
                <ArrowLeft className="h-4 w-4" />
                Change phone number
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms & Conditions
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
