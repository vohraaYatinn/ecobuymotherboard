"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Edit, Trash2, Star, Package, Loader2 } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.34:5000"

interface AdminProductViewProps {
  productId: string
}

interface Product {
  _id: string
  name: string
  sku: string
  brand: string
  model?: string
  category: string | { _id: string; name: string; slug: string }
  price: number
  comparePrice?: number
  stock: number
  status: string
  rating: number
  reviews: number
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
  createdAt: string
  updatedAt: string
}

export function AdminProductView({ productId }: AdminProductViewProps) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deleting, setDeleting] = useState(false)

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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return
    }

    setDeleting(true)
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin-login")
        return
      }

      const response = await fetch(`${API_URL}/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        router.push("/admin/products")
      } else {
        alert(data.message || "Failed to delete product")
        setDeleting(false)
      }
    } catch (err) {
      console.error("Error deleting product:", err)
      alert("Error deleting product")
      setDeleting(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      "in-stock": "In Stock",
      "out-of-stock": "Out of Stock",
      "low-stock": "Low Stock",
    }
    return statusMap[status] || status
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{error || "Product not found"}</p>
        </div>
        <Link href="/admin/products">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </Link>
      </div>
    )
  }

  const discount = product.comparePrice && product.comparePrice > product.price ? product.comparePrice - product.price : 0
  const discountPercentage = product.comparePrice && product.comparePrice > product.price
    ? Math.round((discount / product.comparePrice) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Details</h1>
            <p className="text-sm text-muted-foreground mt-1">View complete product information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/products/${productId}/edit`}>
            <Button className="gap-2">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Edit Product</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            className="gap-2 text-destructive hover:text-destructive bg-transparent"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">{deleting ? "Deleting..." : "Delete"}</span>
          </Button>
        </div>
      </div>

      {/* Main Product Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Images */}
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted mb-4">
              <Image
                src={
                  product.images?.[0]
                    ? product.images[0].startsWith("http")
                      ? product.images[0]
                      : `${API_URL}${product.images[0]}`
                    : "/placeholder.svg"
                }
                alt={product.name}
                fill
                className="object-cover"
              />
              {discountPercentage > 0 && (
                <Badge className="absolute top-4 left-4 bg-red-500 text-white">{discountPercentage}% OFF</Badge>
              )}
              <Badge
                className={`absolute top-4 right-4 ${
                  product.status === "in-stock" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                }`}
              >
                {getStatusLabel(product.status)}
              </Badge>
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {product.images.slice(0, 3).map((image, index) => (
                  <div key={index} className="relative aspect-square overflow-hidden rounded-md border-2 border-primary">
                    <Image
                      src={
                        image
                          ? image.startsWith("http")
                            ? image
                            : `${API_URL}${image}`
                          : "/placeholder.svg"
                      }
                      alt={`Image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md border-t-4 border-t-primary">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{product.name}</h2>
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge variant="outline" className="text-sm">
                    {product.brand}
                  </Badge>
                  {product.model && (
                    <Badge variant="outline" className="text-sm">
                      Model: {product.model}
                    </Badge>
                  )}
                  {product.rating > 0 && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                      <span className="text-sm text-muted-foreground ml-1">({product.reviews} reviews)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Product ID</p>
                  <p className="font-semibold text-xs">{product._id.slice(-8)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-mono font-semibold">{product.sku}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{getCategoryLabel(product.category)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stock Quantity</p>
                  <p className="font-semibold text-green-600">{product.stock} units</p>
                </div>
              </div>

              <div className="flex items-baseline gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-3xl font-bold text-foreground">{formatPrice(product.price)}</p>
                </div>
                {product.comparePrice && product.comparePrice > product.price && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Original Price</p>
                      <p className="text-xl text-muted-foreground line-through">{formatPrice(product.comparePrice)}</p>
                    </div>
                    <Badge className="bg-red-500">Save {formatPrice(discount)}</Badge>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="description">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="specifications">Specifications</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                </TabsList>

                <TabsContent value="description" className="mt-4">
                  <p className="text-muted-foreground">{product.description}</p>
                </TabsContent>

                <TabsContent value="specifications" className="mt-4">
                  <div className="space-y-3">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      value && (
                        <div key={key} className="flex border-b border-border pb-3">
                          <span className="w-1/3 font-semibold text-sm">
                            {key
                              .replace(/([A-Z])/g, " $1")
                              .replace(/^./, (str) => str.toUpperCase())
                              .trim()}
                          </span>
                          <span className="w-2/3 text-sm text-muted-foreground">{value}</span>
                        </div>
                      )
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="features" className="mt-4">
                  <ul className="space-y-2">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span className="text-muted-foreground text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created At</p>
                  <p className="font-medium">
                    {new Date(product.createdAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="font-medium">
                    {new Date(product.updatedAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
