"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Grid3x3, List, Star, ShoppingCart, Loader2, Heart, MessageSquare } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { EnquiryModal } from "@/components/enquiry-modal"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.36:5000"

interface Product {
  _id: string
  name: string
  brand: string
  price: number
  comparePrice?: number
  rating: number
  reviews: number
  images: string[]
  status: string
  stock: number
}

export function ProductsGrid({ searchQuery, category }: { searchQuery?: string; category?: string }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sortBy, setSortBy] = useState("best-selling")
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null)
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false)
  const { addToCart } = useCart()
  const { isFavorite, addToWishlist, removeFromWishlist } = useWishlist()

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      setError("")
      try {
        // Always use products endpoint
        let sortParam = "createdAt"
        let sortOrder = "desc"

        if (sortBy === "price-low") {
          sortParam = "price"
          sortOrder = "asc"
        } else if (sortBy === "price-high") {
          sortParam = "price"
          sortOrder = "desc"
        } else if (sortBy === "newest") {
          sortParam = "createdAt"
          sortOrder = "desc"
        }

        const params = new URLSearchParams()
        params.append("status", "in-stock")
        params.append("sortBy", sortParam)
        params.append("sortOrder", sortOrder)
        params.append("limit", "50")
        
        // Add search parameter if provided
        if (searchQuery && searchQuery.trim().length > 0) {
          params.append("search", searchQuery.trim())
        }
        
        // Add category filter if provided (can be slug or ObjectId)
        if (category) {
          params.append("category", category)
        }
        
        const response = await fetch(`${API_URL}/api/products?${params.toString()}`)

        const data = await response.json()

        if (data.success) {
          setProducts(data.data)
        } else {
          setError("Failed to load products")
        }
      } catch (err) {
        console.error("Error fetching products:", err)
        setError("Error loading products. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [sortBy, searchQuery, category])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getDiscountPercentage = (price: number, comparePrice?: number) => {
    if (!comparePrice || comparePrice <= price) return 0
    return Math.round(((comparePrice - price) / comparePrice) * 100)
  }

  const getImageUrl = (imageUrl: string | undefined) => {
    if (!imageUrl) return "/placeholder.svg"
    if (imageUrl.startsWith("http")) return imageUrl
    return `${API_URL}${imageUrl}`
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

      return (
        <div className="flex-1 w-full min-w-0">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 px-1">
              {searchQuery ? (
                <>
                  Search Results for <span className="text-primary">"{searchQuery}"</span>
                </>
              ) : (
                "Television Inverter PCB Boards (LED Driver)"
              )}
            </h1>

        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="h-9 w-9 sm:h-10 sm:w-10 touch-manipulation"
                aria-label="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="h-9 w-9 sm:h-10 sm:w-10 touch-manipulation"
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-1 sm:flex-initial justify-end">
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm">
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
          </div>

          <span className="text-xs sm:text-sm text-muted-foreground px-1">
            Showing 1 - {products.length} of {products.length} items
          </span>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <div className="max-w-md mx-auto">
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              No products found{searchQuery ? ` for "${searchQuery}"` : ""}
            </p>
            {searchQuery && (
              <Button
                onClick={() => setIsEnquiryModalOpen(true)}
                className="flex items-center gap-2 mx-auto"
              >
                <MessageSquare className="h-4 w-4" />
                Enquiry Now
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" : "space-y-3 sm:space-y-4"}>
          {products.map((product) => {
            const discount = getDiscountPercentage(product.price, product.comparePrice)
            const isInStock = product.status === "in-stock" && product.stock > 0

            return (
              <div
                key={product._id}
                className="group rounded-lg border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative">
                  <Link href={`/products/${product._id}`} className="block relative">
                    {discount > 0 && (
                      <Badge className="absolute top-2 left-2 z-10 bg-red-500 text-xs sm:text-sm px-1.5 sm:px-2 py-0.5">{discount}% OFF</Badge>
                    )}
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <Image
                        src={getImageUrl(product.images?.[0])}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background h-9 w-9 sm:h-10 sm:w-10 touch-manipulation"
                    onClick={async (e) => {
                      e.preventDefault()
                      setTogglingFavorite(product._id)
                      try {
                        if (isFavorite(product._id)) {
                          await removeFromWishlist(product._id)
                        } else {
                          await addToWishlist(product._id)
                        }
                      } catch (err) {
                        console.error("Error toggling favorite:", err)
                      } finally {
                        setTogglingFavorite(null)
                      }
                    }}
                    disabled={togglingFavorite === product._id}
                    aria-label={isFavorite(product._id) ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${
                        isFavorite(product._id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                </div>

                <div className="p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">{product.brand}</p>
                  <Link href={`/products/${product._id}`}>
                    <h3 className="font-semibold mb-2 hover:text-primary line-clamp-2 text-sm sm:text-base leading-tight">{product.name}</h3>
                  </Link>

                  {product.rating > 0 && (
                    <div className="flex items-center gap-1 mb-2 sm:mb-3">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 sm:h-4 sm:w-4 ${
                              i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground">({product.reviews})</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3 sm:mb-4 flex-wrap">
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{formatPrice(product.price)}</span>
                    {product.comparePrice && product.comparePrice > product.price && (
                      <span className="text-xs sm:text-sm text-muted-foreground line-through">
                        {formatPrice(product.comparePrice)}
                      </span>
                    )}
                  </div>

                  <Button
                    className="w-full h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
                    size="lg"
                    disabled={!isInStock || addingToCart === product._id}
                    onClick={async () => {
                      setAddingToCart(product._id)
                      try {
                        await addToCart(product._id, 1)
                      } catch (err) {
                        console.error("Error adding to cart:", err)
                      } finally {
                        setAddingToCart(null)
                      }
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {addingToCart === product._id ? "Adding..." : isInStock ? "Add to Cart" : "Out of Stock"}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Enquiry Modal */}
      <EnquiryModal
        open={isEnquiryModalOpen}
        onOpenChange={setIsEnquiryModalOpen}
        productSearched={searchQuery || ""}
      />
    </div>
  )
}
