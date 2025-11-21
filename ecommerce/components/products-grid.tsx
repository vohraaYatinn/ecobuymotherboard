"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Grid3x3, List, Star, ShoppingCart } from "lucide-react"

const products = [
  {
    id: "1",
    name: "Model 49W672E Sony LED TV PCB",
    brand: "Sony",
    price: 2499,
    originalPrice: 2799,
    discount: 8,
    rating: 4.5,
    reviews: 128,
    image: "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
    inStock: true,
  },
  {
    id: "2",
    name: "Model 43W772E Sony LED TV PCB",
    brand: "Sony",
    price: 2199,
    originalPrice: 2549,
    discount: 14,
    rating: 4.7,
    reviews: 95,
    image: "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
    inStock: true,
  },
  {
    id: "3",
    name: "Model LC50UA6500X Sharp LED TV PCB",
    brand: "Sharp",
    price: 2899,
    originalPrice: 3399,
    discount: 14,
    rating: 4.3,
    reviews: 67,
    image: "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
    inStock: true,
  },
  {
    id: "4",
    name: "Model 32W672E Sony LED TV PCB",
    brand: "Sony",
    price: 1899,
    originalPrice: 2349,
    discount: 19,
    rating: 4.6,
    reviews: 142,
    image: "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
    inStock: true,
  },
  {
    id: "5",
    name: "Model 55X7500H Sony LED TV PCB",
    brand: "Sony",
    price: 3299,
    originalPrice: 3799,
    discount: 13,
    rating: 4.8,
    reviews: 201,
    image: "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
    inStock: true,
  },
  {
    id: "6",
    name: "Model 43UM7290PTF LG LED TV PCB",
    brand: "LG",
    price: 2399,
    originalPrice: 2799,
    discount: 14,
    rating: 4.4,
    reviews: 89,
    image: "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
    inStock: true,
  },
]

export function ProductsGrid() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  return (
    <div className="flex-1">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Television Inverter PCB Boards (LED Driver)</h1>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select defaultValue="best-selling">
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best-selling">Best Selling</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <span className="text-sm text-muted-foreground">
            Showing 1 - {products.length} of {products.length} items
          </span>
        </div>
      </div>

      <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
        {products.map((product) => (
          <div
            key={product.id}
            className="group rounded-lg border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow"
          >
            <Link href={`/products/${product.id}`} className="block relative">
              {product.discount > 0 && (
                <Badge className="absolute top-2 left-2 z-10 bg-red-500">{product.discount}% OFF</Badge>
              )}
              <div className="relative aspect-square overflow-hidden bg-muted">
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              </div>
            </Link>

            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-1">{product.brand}</p>
              <Link href={`/products/${product.id}`}>
                <h3 className="font-semibold mb-2 hover:text-primary line-clamp-2">{product.name}</h3>
              </Link>

              <div className="flex items-center gap-1 mb-3">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">({product.reviews})</span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold text-foreground">₹{product.price}</span>
                <span className="text-sm text-muted-foreground line-through">₹{product.originalPrice}</span>
              </div>

              <Button className="w-full" size="lg">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
