import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductsGrid } from "@/components/products-grid"
import { ProductsSidebar } from "@/components/products-sidebar"

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center gap-2 text-sm">
            <a href="/" className="text-muted-foreground hover:text-foreground">
              Home
            </a>
            <span className="text-muted-foreground">/</span>
            <a href="/" className="text-muted-foreground hover:text-foreground">
              All Collections
            </a>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground">Television Inverter PCB Boards (LED Driver)</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          <ProductsSidebar />
          <ProductsGrid />
        </div>
      </div>

      <Footer />
    </div>
  )
}
