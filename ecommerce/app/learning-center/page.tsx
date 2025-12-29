"use client"

import { Suspense } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LearningCenterContent } from "@/components/learning-center-content"

export default function LearningCenterPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
        <LearningCenterContent />
      </Suspense>
      <Footer />
    </div>
  )
}



























