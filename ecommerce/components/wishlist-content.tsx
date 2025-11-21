"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Trash2, ShoppingCart, Heart } from "lucide-react"

export function WishlistContent() {
  const [wishlistItems, setWishlistItems] = useState([
    {
      id: "1",
      name: "Model 49W672E Sony LED TV PCB",
      brand: "Sony",
      price: 2499,
      originalPrice: 2799,
      image: "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
      inStock: true,
    },
    {
      id: "2",
      name: "Model 43W772E Sony LED TV PCB",
      brand: "Sony",
      price: 2199,
      originalPrice: 2549,
      image: "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
      inStock: true,
    },
  ])

  const removeItem = (id: string) => {
    setWishlistItems((items) => items.filter((item) => item.id !== id))
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto text-center">
          <Heart className="h-24 w-24 mx-auto mb-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold mb-4">Your Wishlist is Empty</h1>
          <p className="text-muted-foreground mb-8">Save items you love to your wishlist and shop them later.</p>
          <Link href="/products">
            <Button size="lg">Browse Products</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">My Wishlist ({wishlistItems.length})</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlistItems.map((item) => (
          <div
            key={item.id}
            className="group rounded-lg border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow"
          >
            <Link href={`/products/${item.id}`} className="block relative">
              <div className="relative aspect-square overflow-hidden bg-muted">
                <Image
                  src={item.image || "/placeholder.svg"}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
                {!item.inStock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold">Out of Stock</span>
                  </div>
                )}
              </div>
            </Link>

            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-1">{item.brand}</p>
              <Link href={`/products/${item.id}`}>
                <h3 className="font-semibold mb-3 hover:text-primary line-clamp-2 min-h-[3rem]">{item.name}</h3>
              </Link>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl font-bold text-foreground">₹{item.price}</span>
                <span className="text-sm text-muted-foreground line-through">₹{item.originalPrice}</span>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" disabled={!item.inStock}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-between items-center">
        <Link href="/products">
          <Button variant="outline">Continue Shopping</Button>
        </Link>
        <Button size="lg">Add All to Cart</Button>
      </div>
    </div>
  )
}
