"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, User, Mail, Phone } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

export function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<"details" | "otp">("details")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [verificationId, setVerificationId] = useState("")
  const [timer, setTimer] = useState(30)
  const [isNewUser, setIsNewUser] = useState(false)
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

  // Validate email format
  const isValidEmail = (email: string) => {
    if (!email) return true // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validate name
    if (!name.trim()) {
      setError("Please enter your name")
      setIsLoading(false)
      return
    }

    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      setError("Please enter a valid email address")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/customer-auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: phoneNumber,
          countryCode: "91",
          name: name.trim(),
          email: email.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || "Failed to send OTP. Please try again.")
        setIsLoading(false)
        return
      }

      setVerificationId(data.verificationId)
      setIsNewUser(data.isNewUser)
      sessionStorage.setItem("customerVerificationId", data.verificationId)
      sessionStorage.setItem("customerMobile", data.mobile)
      sessionStorage.setItem("customerName", name.trim())
      sessionStorage.setItem("customerEmail", email.trim())
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
      const storedName = sessionStorage.getItem("customerName") || name
      const storedEmail = sessionStorage.getItem("customerEmail") || email

      if (!storedVerificationId) {
        setError("Session expired. Please request a new OTP.")
        setIsLoading(false)
        setStep("details")
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
          name: storedName,
          email: storedEmail,
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
      sessionStorage.removeItem("customerName")
      sessionStorage.removeItem("customerEmail")

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
      const storedName = sessionStorage.getItem("customerName") || name
      const storedEmail = sessionStorage.getItem("customerEmail") || email

      const response = await fetch(`${API_URL}/api/customer-auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: phoneNumber,
          countryCode: "91",
          name: storedName,
          email: storedEmail,
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
            {step === "details" ? "Welcome to Elecobuy" : "Verify OTP"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {step === "details" 
              ? "Enter your details to continue" 
              : `We've sent a 4-digit code to +91 ${phoneNumber}`}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {step === "details" ? (
            <form onSubmit={handleDetailsSubmit} className="space-y-5">
              {/* Name Field */}
              <div>
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                  className="mt-2"
                  disabled={isLoading}
                />
              </div>

              {/* Email Field */}
              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="mt-2"
                  disabled={isLoading}
                />
              </div>

              {/* Phone Number Field */}
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number <span className="text-destructive">*</span>
                </Label>
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
                <p className="text-xs text-muted-foreground mt-1">
                  We'll send you a verification code via SMS
                </p>
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full" 
                disabled={isLoading || phoneNumber.length < 10 || !name.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Continue"
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
                  setStep("details")
                  setError("")
                }}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full"
              >
                <ArrowLeft className="h-4 w-4" />
                Change details
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
