"use client"

import { useSearchParams } from "next/navigation"
import { ProductsGrid } from "@/components/products-grid"

export function ProductsPageContent() {
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get("search") || undefined
  const category = searchParams.get("category") || undefined

  const getCategoryLabel = (cat: string) => {
    const categoryMap: Record<string, string> = {
      "tv-pcb": "Television PCB Boards",
      "tv-inverter": "Television Inverter Boards",
      "tv-motherboard": "Television Motherboard",
      "power-supply": "Power Supply Boards",
      "t-con": "T-Con Board",
      "universal-motherboard": "Universal Motherboard",
    }
    return categoryMap[cat] || cat
  }

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
              Products
            </a>
            {searchQuery && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground">Search: {searchQuery}</span>
              </>
            )}
            {category && !searchQuery && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground">{getCategoryLabel(category)}</span>
              </>
            )}
            {!searchQuery && !category && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground">All Products</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductsGrid searchQuery={searchQuery} category={category} />
      </div>
    </>
  )
}




