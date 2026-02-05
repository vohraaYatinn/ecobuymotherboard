import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductsGrid } from "@/components/products-grid"

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-10 sm:h-12 items-center gap-1.5 sm:gap-2 text-xs sm:text-sm overflow-x-auto">
            <a href="/" className="text-muted-foreground hover:text-foreground whitespace-nowrap">
              Home
            </a>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground whitespace-nowrap">All Collections</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <ProductsGrid />
      </div>

      <Footer />
    </div>
  )
}
