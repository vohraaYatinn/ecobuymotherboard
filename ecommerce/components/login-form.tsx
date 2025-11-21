"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

export function LoginForm() {
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Sending OTP to:", phoneNumber)
    setStep("otp")
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp]
      newOtp[index] = value
      setOtp(newOtp)

      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`)
        nextInput?.focus()
      }
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const otpValue = otp.join("")
    console.log("[v0] Verifying OTP:", otpValue)
    window.location.href = "/dashboard"
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {step === "phone" ? "Welcome to EcoBuy" : "Verify OTP"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {step === "phone" ? "Enter your phone number to continue" : `We've sent a 6-digit code to ${phoneNumber}`}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
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
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full">
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-semibold"
                      maxLength={1}
                    />
                  ))}
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => console.log("[v0] Resending OTP")}
                  >
                    Didn't receive code? Resend OTP
                  </button>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full">
                Verify & Continue
              </Button>

              <button
                type="button"
                onClick={() => setStep("phone")}
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
