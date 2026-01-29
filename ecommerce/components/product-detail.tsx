"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, ShoppingCart, Heart, Plus, Minus, Loader2, MapPin, CheckCircle2, XCircle, Truck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

interface ProductDetailProps {
  productId: string
}

interface Product {
  _id: string
  name: string
  brand: string
  model?: string
  price: number
  comparePrice?: number
  rating: number
  reviews: number
  status: string
  stock: number
  sku: string
  category: string | { _id: string; name: string; slug: string }
  images: string[]
  description: string
  features: string[]
  specifications: {
    productType?: string
    compatibility?: string
    warranty?: string
    condition?: string
    weight?: string
    dimensions?: string
  }
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
      const [error, setError] = useState("")
      const [addingToCart, setAddingToCart] = useState(false)
      const [togglingFavorite, setTogglingFavorite] = useState(false)
      const [pincode, setPincode] = useState("")
      const [checkingPincode, setCheckingPincode] = useState(false)
      const [pincodeResult, setPincodeResult] = useState<any>(null)
      const { addToCart } = useCart()
      const { isFavorite, addToWishlist, removeFromWishlist } = useWishlist()

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products/${productId}`)
        const data = await response.json()

        if (data.success) {
          setProduct(data.data)
        } else {
          setError(data.message || "Product not found")
        }
      } catch (err) {
        console.error("Error fetching product:", err)
        setError("Error loading product")
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

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

  const getCategoryLabel = (category: string | { name?: string; slug?: string; _id?: string }) => {
    if (typeof category === 'object' && category?.name) {
      return category.name
    }
    if (typeof category === 'object' && category?.slug) {
      return category.slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    }
    if (typeof category === 'string') {
      return category
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    }
    return "Unknown Category"
  }

  const handleCheckPincode = async () => {
    if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) {
      setPincodeResult({
        success: false,
        serviceable: false,
        message: "Please enter a valid 6-digit pincode",
      })
      return
    }

    try {
      setCheckingPincode(true)
      setPincodeResult(null)

      const response = await fetch(`${API_URL}/api/dtdc/check-pincode?pincode=${pincode.trim()}`)
      const data = await response.json()

      if (data.success) {
        setPincodeResult(data.data)
      } else {
        setPincodeResult({
          success: false,
          serviceable: false,
          message: data.message || "Failed to check delivery availability",
        })
      }
    } catch (err) {
      console.error("Error checking pincode:", err)
      setPincodeResult({
        success: false,
        serviceable: false,
        message: "Network error. Please try again.",
      })
    } finally {
      setCheckingPincode(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading product...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error || "Product not found"}</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  const discount = getDiscountPercentage(product.price, product.comparePrice)
  const isInStock = product.status === "in-stock" && product.stock > 0
  const displayImages = product.images.length > 0 ? product.images : ["/placeholder.svg"]

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Breadcrumb */}
      <div className="mb-4 sm:mb-6 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground overflow-x-auto">
        <a href="/" className="hover:text-foreground whitespace-nowrap">
          Home
        </a>
        <span>/</span>
        <a href="/products" className="hover:text-foreground whitespace-nowrap">
          Products
        </a>
        <span>/</span>
        <span className="text-foreground truncate">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 mb-8 sm:mb-12 lg:mb-16">
        {/* Product Images */}
        <div>
          <div className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted mb-3 sm:mb-4 cursor-zoom-in">
            <Image
              src={getImageUrl(displayImages[selectedImage])}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-125"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            {discount > 0 && (
              <Badge className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-red-500 text-white text-xs sm:text-sm px-1.5 sm:px-2 py-0.5">{discount}% OFF</Badge>
            )}
          </div>
          {displayImages.length > 1 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              {displayImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 touch-manipulation ${
                    selectedImage === index ? "border-primary" : "border-border"
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <Image src={getImageUrl(image)} alt={`Product ${index + 1}`} fill className="object-cover" sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1.5 sm:mb-2">{product.brand}</p>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 leading-tight">{product.name}</h1>

          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 flex-wrap">
            {product.rating > 0 && (
              <>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${
                        i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">({product.reviews} reviews)</span>
              </>
            )}
            {isInStock ? (
              <Badge variant="outline" className="border-green-500 text-green-600 text-xs sm:text-sm">
                In Stock
              </Badge>
            ) : (
              <Badge variant="outline" className="border-red-500 text-red-600 text-xs sm:text-sm">
                Out of Stock
              </Badge>
            )}
          </div>

          <div className="flex items-baseline gap-3 sm:gap-4 mb-4 sm:mb-6 flex-wrap">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{formatPrice(product.price)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <>
                <span className="text-lg sm:text-xl text-muted-foreground line-through">{formatPrice(product.comparePrice)}</span>
                <Badge className="bg-red-500 text-xs sm:text-sm">
                  Save {formatPrice(product.comparePrice - product.price)}
                </Badge>
              </>
            )}
          </div>

          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 leading-relaxed">{product.description}</p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center border border-border rounded-lg w-full sm:w-auto justify-between sm:justify-start">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="h-11 w-11 sm:h-10 sm:w-10 touch-manipulation"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 sm:w-14 text-center font-semibold text-base sm:text-lg">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                disabled={!isInStock}
                className="h-11 w-11 sm:h-10 sm:w-10 touch-manipulation"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Button
              size="lg"
              className="flex-1 sm:flex-1 h-11 sm:h-12 py-3 sm:py-0 text-sm sm:text-base touch-manipulation"
              disabled={!isInStock || addingToCart}
              onClick={async () => {
                setAddingToCart(true)
                try {
                  await addToCart(product._id, quantity)
                } catch (err) {
                  console.error("Error adding to cart:", err)
                } finally {
                  setAddingToCart(false)
                }
              }}
            >
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              {addingToCart ? "Adding..." : isInStock ? "Add to Cart" : "Out of Stock"}
            </Button>

            <Button
              size="lg"
              variant="outline"
              disabled={togglingFavorite || !product}
              className="h-11 w-11 sm:h-12 sm:w-12 p-0 touch-manipulation"
              onClick={async () => {
                if (!product) return
                setTogglingFavorite(true)
                try {
                  if (isFavorite(product._id)) {
                    await removeFromWishlist(product._id)
                  } else {
                    await addToWishlist(product._id)
                  }
                } catch (err) {
                  console.error("Error toggling favorite:", err)
                } finally {
                  setTogglingFavorite(false)
                }
              }}
              aria-label={product && isFavorite(product._id) ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                className={`h-5 w-5 ${product && isFavorite(product._id) ? "fill-red-500 text-red-500" : ""}`}
              />
            </Button>
          </div>

          <div className="text-xs sm:text-sm text-muted-foreground space-y-1.5 sm:space-y-2">
            <p>
              <strong className="text-foreground">SKU:</strong> {product.sku}
            </p>
            <p>
              <strong className="text-foreground">Category:</strong> {getCategoryLabel(product.category)}
            </p>
            {product.model && (
              <p>
                <strong className="text-foreground">Model:</strong> {product.model}
              </p>
            )}
            <p>
              <strong className="text-foreground">Stock:</strong> {product.stock} units
            </p>
          </div>

          {/* Pincode Delivery Check */}
          <div className="mt-6 sm:mt-8 p-4 sm:p-5 border border-border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-sm sm:text-base font-semibold">Check Delivery</h3>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Enter pincode"
                    value={pincode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                      setPincode(value)
                      if (pincodeResult) {
                        setPincodeResult(null)
                      }
                    }}
                    maxLength={6}
                    className="h-10 sm:h-11 text-sm sm:text-base"
                  />
                </div>
                <Button
                  onClick={handleCheckPincode}
                  disabled={checkingPincode || !pincode.trim() || pincode.length !== 6}
                  className="h-10 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm"
                >
                  {checkingPincode ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Checking...
                    </>
                  ) : (
                    "Check"
                  )}
                </Button>
              </div>

              {pincodeResult && (
                <div className="mt-3">
                  {pincodeResult.serviceable ? (
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-sm sm:text-base">
                        <div className="space-y-1.5">
                          <p className="font-semibold text-green-700 dark:text-green-400">
                            ✓ Delivery available to {pincodeResult.pincode}
                          </p>
                          {pincodeResult.estimatedDays && (
                            <p className="text-green-600 dark:text-green-500">
                              Estimated delivery: {pincodeResult.estimatedDays} {pincodeResult.estimatedDays === 1 ? "day" : "days"}
                            </p>
                          )}
                          {pincodeResult.deliveryCharges !== null && (
                            <p className="text-green-600 dark:text-green-500">
                              Delivery charges: ₹{pincodeResult.deliveryCharges}
                            </p>
                          )}
                          {pincodeResult.fallback && (
                            <p className="text-xs text-green-600 dark:text-green-500 italic">
                              {pincodeResult.note || "Estimated delivery time"}
                            </p>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm sm:text-base">
                        <p className="font-semibold">
                          Delivery not available to {pincodeResult.pincode}
                        </p>
                        <p className="text-xs mt-1">
                          {pincodeResult.message || "We currently don't deliver to this pincode. Please contact support for alternatives."}
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <Tabs defaultValue="description" className="mb-8 sm:mb-12 lg:mb-16">
        <TabsList className="w-full justify-start h-auto flex-wrap">
          <TabsTrigger value="description" className="text-xs sm:text-sm h-10 sm:h-11 px-3 sm:px-4 touch-manipulation">Description</TabsTrigger>
          <TabsTrigger value="specifications" className="text-xs sm:text-sm h-10 sm:h-11 px-3 sm:px-4 touch-manipulation">Specifications</TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs sm:text-sm h-10 sm:h-11 px-3 sm:px-4 touch-manipulation">Reviews ({product.reviews})</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-4 sm:mt-6">
          <div className="prose prose-sm sm:prose-base max-w-none">
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Product Description</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 leading-relaxed">{product.description}</p>

            {product.features.length > 0 && (
              <>
                <h4 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Key Features:</h4>
                <ul className="space-y-2 sm:space-y-2.5">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 sm:gap-2.5">
                      <span className="text-primary mt-0.5 sm:mt-1 text-base sm:text-lg">✓</span>
                      <span className="text-sm sm:text-base text-muted-foreground leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="specifications" className="mt-4 sm:mt-6">
          <div className="max-w-2xl">
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Technical Specifications</h3>
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex flex-col sm:flex-row border-b border-border pb-2.5 sm:pb-3 gap-1 sm:gap-0">
                <span className="w-full sm:w-1/3 font-semibold text-sm sm:text-base">Brand</span>
                <span className="w-full sm:w-2/3 text-muted-foreground text-sm sm:text-base">{product.brand}</span>
              </div>
              {product.model && (
                <div className="flex flex-col sm:flex-row border-b border-border pb-2.5 sm:pb-3 gap-1 sm:gap-0">
                  <span className="w-full sm:w-1/3 font-semibold text-sm sm:text-base">Model Number</span>
                  <span className="w-full sm:w-2/3 text-muted-foreground text-sm sm:text-base">{product.model}</span>
                </div>
              )}
              {Object.entries(product.specifications).map(([key, value]) => (
                value && (
                  <div key={key} className="flex flex-col sm:flex-row border-b border-border pb-2.5 sm:pb-3 gap-1 sm:gap-0">
                    <span className="w-full sm:w-1/3 font-semibold text-sm sm:text-base">
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())
                        .trim()}
                    </span>
                    <span className="w-full sm:w-2/3 text-muted-foreground text-sm sm:text-base break-words">{value}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4 sm:mt-6">
          <div className="max-w-2xl">
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Customer Reviews</h3>
            <p className="text-sm sm:text-base text-muted-foreground">Reviews will be displayed here.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

