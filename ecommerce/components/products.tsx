import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Star } from "lucide-react"

export function Products() {
  const products = [
    {
      id: 1,
      name: "LCD TV Main Board V1",
      model: "ECB-LCD-4K-001",
      price: "$89.99",
      rating: 4.8,
      reviews: 124,
      inStock: true,
      badge: "Best Seller",
      image: "/lcd-television-main-board-pcb-circuit-board.jpg",
    },
    {
      id: 2,
      name: "LED TV Power Board",
      model: "ECB-LED-PWR-002",
      price: "$64.99",
      rating: 4.9,
      reviews: 89,
      inStock: true,
      badge: "Top Rated",
      image: "/led-tv-power-supply-board-pcb.jpg",
    },
    {
      id: 3,
      name: "Smart TV Motherboard",
      model: "ECB-SMART-MB-003",
      price: "$129.99",
      rating: 4.7,
      reviews: 156,
      inStock: true,
      badge: "New",
      image: "/smart-tv-motherboard-circuit-board.jpg",
    },
    {
      id: 4,
      name: "T-Con Board Universal",
      model: "ECB-TCON-UNI-004",
      price: "$54.99",
      rating: 4.6,
      reviews: 73,
      inStock: true,
      badge: null,
      image: "/t-con-board-television-control-board.jpg",
    },
    {
      id: 5,
      name: "4K HDR Main Board",
      model: "ECB-4K-HDR-005",
      price: "$149.99",
      rating: 4.9,
      reviews: 201,
      inStock: true,
      badge: "Premium",
      image: "/4k-hdr-tv-main-board-pcb.jpg",
    },
    {
      id: 6,
      name: "OLED Panel Driver",
      model: "ECB-OLED-DRV-006",
      price: "$179.99",
      rating: 5.0,
      reviews: 45,
      inStock: false,
      badge: "Pre-Order",
      image: "/oled-panel-driver-board-electronics.jpg",
    },
  ]

  return (
    <section id="products" className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {"Featured Products"}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {"Explore our extensive catalog of premium PCB boards and motherboards for all major TV brands"}
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="group overflow-hidden transition-all hover:shadow-lg">
              <CardHeader className="p-0">
                <div className="relative overflow-hidden bg-muted">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {product.badge && (
                    <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">{product.badge}</Badge>
                  )}
                  {!product.inStock && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Badge variant="secondary" className="text-base px-4 py-2">
                        Coming Soon
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-lg text-card-foreground">{product.name}</h3>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-medium text-foreground">{product.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {"Model: "}
                  {product.model}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{"⭐"}</span>
                  <span>{product.reviews} reviews</span>
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-0 flex items-center justify-between gap-4">
                <div className="text-2xl font-bold text-foreground">{product.price}</div>
                <Button
                  size="sm"
                  disabled={!product.inStock}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {product.inStock ? "Add to Cart" : "Notify Me"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-12 text-center">
          <Button size="lg" variant="outline">
            View All Products
          </Button>
        </div>
      </div>
    </section>
  )
}
