"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, ShoppingCart, Heart, Loader2 } from "lucide-react"
import { useWishlist } from "@/lib/wishlist-context"
import { useCart } from "@/lib/cart-context"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.36:5000"

export function WishlistContent() {
  const router = useRouter()
  const { wishlistItems, loading, removeFromWishlist, refreshWishlist } = useWishlist()
  const { addToCart } = useCart()
  const [removing, setRemoving] = useState<string | null>(null)
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("customerToken")
    if (!token) {
      router.push("/login")
    }
  }, [router])

  const handleRemove = async (productId: string) => {
    if (!confirm("Are you sure you want to remove this item from your wishlist?")) {
      return
    }

    setRemoving(productId)
    try {
      await removeFromWishlist(productId)
    } catch (err) {
      console.error("Error removing from wishlist:", err)
    } finally {
      setRemoving(null)
    }
  }

  const handleAddToCart = async (productId: string) => {
    setAddingToCart(productId)
    try {
      await addToCart(productId, 1)
    } catch (err) {
      console.error("Error adding to cart:", err)
    } finally {
      setAddingToCart(null)
    }
  }

  const handleAddAllToCart = async () => {
    for (const item of wishlistItems) {
      try {
        await addToCart(item.product._id, 1)
      } catch (err) {
        console.error(`Error adding ${item.product.name} to cart:`, err)
      }
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 lg:mb-8">My Wishlist ({wishlistItems.length})</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {wishlistItems.map((item) => {
          const isInStock = item.product.status === "in-stock" && item.product.stock > 0
          const discount =
            item.product.comparePrice && item.product.comparePrice > item.product.price
              ? Math.round(((item.product.comparePrice - item.product.price) / item.product.comparePrice) * 100)
              : 0

          return (
            <div
              key={item._id}
              className="group rounded-lg border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow"
            >
              <Link href={`/products/${item.product._id}`} className="block relative">
                {discount > 0 && <Badge className="absolute top-2 left-2 z-10 bg-red-500 text-xs sm:text-sm px-1.5 sm:px-2 py-0.5">{discount}% OFF</Badge>}
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <Image
                    src={item.product.images?.[0] ? `${API_URL}${item.product.images[0]}` : "/placeholder.svg"}
                    alt={item.product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  />
                </div>
                {!isInStock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm">Out of Stock</span>
                  </div>
                )}
              </Link>

              <div className="p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">{item.product.brand}</p>
                <Link href={`/products/${item.product._id}`}>
                  <h3 className="font-semibold mb-2 sm:mb-3 hover:text-primary line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] text-sm sm:text-base leading-tight">{item.product.name}</h3>
                </Link>

                <div className="flex items-center gap-2 mb-3 sm:mb-4 flex-wrap">
                  <span className="text-lg sm:text-xl font-bold text-foreground">{formatPrice(item.product.price)}</span>
                  {item.product.comparePrice && item.product.comparePrice > item.product.price && (
                    <span className="text-xs sm:text-sm text-muted-foreground line-through">
                      {formatPrice(item.product.comparePrice)}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 h-10 sm:h-11 text-xs sm:text-sm touch-manipulation"
                    disabled={!isInStock || addingToCart === item.product._id}
                    onClick={() => handleAddToCart(item.product._id)}
                  >
                    <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    {addingToCart === item.product._id ? "Adding..." : "Add to Cart"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemove(item.product._id)}
                    disabled={removing === item.product._id}
                    className="text-destructive hover:text-destructive h-10 w-10 sm:h-11 sm:w-11 touch-manipulation"
                    aria-label="Remove from wishlist"
                  >
                    {removing === item.product._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4">
        <Link href="/products" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base touch-manipulation">Continue Shopping</Button>
        </Link>
        <Button size="lg" onClick={handleAddAllToCart} disabled={addingToCart !== null} className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base touch-manipulation">
          Add All to Cart
        </Button>
      </div>
    </div>
  )
}
