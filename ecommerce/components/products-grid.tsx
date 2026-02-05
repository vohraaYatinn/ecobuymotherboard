"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Grid3x3, List, Star, ShoppingCart, Loader2, Heart, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { EnquiryModal } from "@/components/enquiry-modal"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"
const PAGE_SIZE = 24

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

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

export function ProductsGrid({ searchQuery, category }: { searchQuery?: string; category?: string }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sortBy, setSortBy] = useState("best-selling")
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null)
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false)
  const { addToCart } = useCart()
  const { isFavorite, addToWishlist, removeFromWishlist } = useWishlist()
  const prevFiltersRef = useRef({ sortBy, searchQuery, category })

  useEffect(() => {
    const fetchProducts = async () => {
      const filtersChanged =
        prevFiltersRef.current.sortBy !== sortBy ||
        prevFiltersRef.current.searchQuery !== searchQuery ||
        prevFiltersRef.current.category !== category
      const pageToFetch = filtersChanged ? 1 : page
      if (filtersChanged) {
        setPage(1)
        prevFiltersRef.current = { sortBy, searchQuery, category }
      }

      setLoading(true)
      setError("")
      try {
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
        params.append("status", "available")
        params.append("sortBy", sortParam)
        params.append("sortOrder", sortOrder)
        params.append("page", String(pageToFetch))
        params.append("limit", String(PAGE_SIZE))

        if (searchQuery && searchQuery.trim().length > 0) {
          params.append("search", searchQuery.trim())
        }
        if (category) {
          params.append("category", category)
        }

        const response = await fetch(`${API_URL}/api/products?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setProducts(data.data)
          if (data.pagination) {
            setPagination({
              page: data.pagination.page,
              limit: data.pagination.limit,
              total: data.pagination.total,
              pages: data.pagination.pages,
            })
          }
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
  }, [page, sortBy, searchQuery, category])

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

  // Build page numbers to show: [1, 2, -1, 8, 9, 10] where -1 = ellipsis
  const getPageNumbers = (current: number, totalPages: number): number[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: number[] = []
    const showLeft = current > 3
    const showRight = current < totalPages - 2
    pages.push(1)
    if (showLeft) pages.push(-1)
    const start = Math.max(2, current - 1)
    const end = Math.min(totalPages - 1, current + 1)
    for (let i = start; i <= end; i++) if (!pages.includes(i)) pages.push(i)
    if (showRight) pages.push(-1)
    if (totalPages > 1) pages.push(totalPages)
    return pages
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
                "PCB Boards & Motherboards"
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
            {pagination.total === 0
              ? "No items"
              : `Showing ${(pagination.page - 1) * pagination.limit + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} items`}
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
            const isPurchasable = (product.status === "in-stock" || product.status === "low-stock") && product.stock > 0

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
                    {product.status === "low-stock" && (
                      <Badge className="absolute top-2 right-12 z-10 bg-amber-500 text-xs sm:text-sm px-1.5 sm:px-2 py-0.5">Low Stock</Badge>
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
                    disabled={!isPurchasable || addingToCart === product._id}
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
                    {addingToCart === product._id ? "Adding..." : isPurchasable ? "Add to Cart" : "Out of Stock"}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-sm text-muted-foreground order-2 sm:order-1">
            Page {pagination.page} of {pagination.pages}
          </p>
          <nav className="flex items-center gap-1 order-1 sm:order-2" aria-label="Product pagination">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 mx-1">
              {getPageNumbers(pagination.page, pagination.pages).map((n, i) =>
                n === -1 ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
                    …
                  </span>
                ) : (
                  <Button
                    key={n}
                    variant={pagination.page === n ? "default" : "outline"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setPage(n)}
                    aria-label={`Page ${n}`}
                    aria-current={pagination.page === n ? "page" : undefined}
                  >
                    {n}
                  </Button>
                )
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </nav>
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
