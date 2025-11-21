import { Button } from "@/components/ui/button"
import { ArrowRight, ChevronRight } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-secondary py-20 sm:py-28 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Content */}
          <div className="flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-foreground w-fit mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Premium Quality Components
            </div>

            <h1 className="text-pretty text-4xl font-bold tracking-tight text-secondary-foreground sm:text-5xl lg:text-6xl">
              {"Premium TV PCB Boards & Motherboards"}
            </h1>

            <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {
                "Leading supplier of high-quality television PCB boards and motherboards. Trusted by manufacturers and repair professionals worldwide for reliability and performance."
              }
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Browse Products
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline">
                Request Catalog
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center gap-8">
              <div className="text-sm text-muted-foreground">
                <span className="block text-2xl font-bold text-secondary-foreground">{"10,000+"}</span>
                <span>{"Happy Customers"}</span>
              </div>
              <div className="h-12 w-px bg-border"></div>
              <div className="text-sm text-muted-foreground">
                <span className="block text-2xl font-bold text-secondary-foreground">{"500+"}</span>
                <span>{"Product Models"}</span>
              </div>
              <div className="h-12 w-px bg-border"></div>
              <div className="text-sm text-muted-foreground">
                <span className="block text-2xl font-bold text-secondary-foreground">{"24/7"}</span>
                <span>{"Support Available"}</span>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-2xl blur-3xl"></div>
            <div className="relative rounded-2xl bg-card overflow-hidden border border-border shadow-2xl">
              <img src="/modern-television-circuit-board-pcb-motherboard-cl.jpg" alt="Premium TV PCB Board" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
