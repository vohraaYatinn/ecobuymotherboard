import Link from "next/link"
import { Tv, CircuitBoard, Cpu, Zap, Monitor, Box } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function CategoryShowcase() {
  const categories = [
    {
      name: "Television Inverter Boards",
      icon: Zap,
      count: "150+ Products",
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      name: "Television Motherboard",
      icon: CircuitBoard,
      count: "200+ Products",
      color: "bg-green-500/10 text-green-600",
    },
    {
      name: "Television PCB Board",
      icon: Cpu,
      count: "180+ Products",
      color: "bg-purple-500/10 text-purple-600",
    },
    {
      name: "Power Supply Boards",
      icon: Monitor,
      count: "120+ Products",
      color: "bg-orange-500/10 text-orange-600",
    },
    {
      name: "T-Con Board",
      icon: Tv,
      count: "90+ Products",
      color: "bg-pink-500/10 text-pink-600",
    },
    {
      name: "Universal Motherboard",
      icon: Box,
      count: "75+ Products",
      color: "bg-teal-500/10 text-teal-600",
    },
  ]

  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4 sm:text-4xl">Browse by Category</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find the perfect PCB board for your television. We stock components for all major brands.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link key={category.name} href="/products">
              <Card className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${category.color}`}>
                      <category.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-2">
                        {category.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{category.count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            View All Categories
          </Link>
        </div>
      </div>
    </section>
  )
}
