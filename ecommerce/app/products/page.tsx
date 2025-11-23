"use client"

import { Suspense } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductsPageContent } from "@/components/products-page-content"

export default function ProductsPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
        <ProductsPageContent />
      </Suspense>
      <Footer />
    </div>
  )
}
