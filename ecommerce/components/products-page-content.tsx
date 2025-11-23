"use client"

import { useSearchParams } from "next/navigation"
import { ProductsGrid } from "@/components/products-grid"
import { ProductsSidebar } from "@/components/products-sidebar"

export function ProductsPageContent() {
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get("search") || undefined

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center gap-2 text-sm">
            <a href="/" className="text-muted-foreground hover:text-foreground">
              Home
            </a>
            <span className="text-muted-foreground">/</span>
            <a href="/products" className="text-muted-foreground hover:text-foreground">
              All Collections
            </a>
            {searchQuery && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground">Search: {searchQuery}</span>
              </>
            )}
            {!searchQuery && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground">Television Inverter PCB Boards (LED Driver)</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {!searchQuery && <ProductsSidebar />}
          <ProductsGrid searchQuery={searchQuery} />
        </div>
      </div>
    </>
  )
}




