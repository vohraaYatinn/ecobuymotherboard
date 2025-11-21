"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Edit, Trash2, Star, Package } from "lucide-react"

interface AdminProductViewProps {
  productId: string
}

export function AdminProductView({ productId }: AdminProductViewProps) {
  // Mock product data
  const product = {
    id: productId,
    name: "Model 49W672E Sony LED TV PCB Board",
    sku: "TV-PCB-SONY-045",
    brand: "Sony",
    model: "49W672E",
    category: "Television Inverter Boards",
    price: 2499,
    originalPrice: 2799,
    discount: 11,
    stock: 8,
    status: "In Stock",
    rating: 4.5,
    reviews: 128,
    images: [
      "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
      "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
      "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
    ],
    description:
      "High-quality replacement PCB board for Sony 49W672E LED TV. This genuine replacement part ensures optimal performance and compatibility with your television.",
    features: [
      "100% tested and quality assured",
      "Compatible with Sony 49W672E models",
      "Easy installation with detailed instructions",
      "Professional grade components",
      "12-month manufacturer warranty",
    ],
    specifications: {
      Brand: "Sony",
      "Model Number": "49W672E",
      "Product Type": "LED TV PCB Board",
      Compatibility: "Sony 49W672E LED TV",
      Warranty: "12 Months",
      Condition: "New",
      Weight: "150g",
      Dimensions: "25cm x 15cm x 2cm",
    },
    createdAt: "2024-12-15",
    updatedAt: "2025-01-15",
  }

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
          <Button variant="outline" className="gap-2 text-destructive hover:text-destructive bg-transparent">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Main Product Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Images */}
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted mb-4">
              <Image src={product.images[0] || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
              {product.discount > 0 && (
                <Badge className="absolute top-4 left-4 bg-red-500 text-white">{product.discount}% OFF</Badge>
              )}
              <Badge
                className={`absolute top-4 right-4 ${
                  product.status === "In Stock" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                }`}
              >
                {product.status}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {product.images.slice(0, 3).map((image, index) => (
                <div key={index} className="relative aspect-square overflow-hidden rounded-md border-2 border-primary">
                  <Image src={image || "/placeholder.svg"} alt={`Image ${index + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
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
                  <Badge variant="outline" className="text-sm">
                    Model: {product.model}
                  </Badge>
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
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Product ID</p>
                  <p className="font-semibold">{product.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-mono font-semibold">{product.sku}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{product.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stock Quantity</p>
                  <p className="font-semibold text-green-600">{product.stock} units</p>
                </div>
              </div>

              <div className="flex items-baseline gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-3xl font-bold text-foreground">₹{product.price}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Original Price</p>
                  <p className="text-xl text-muted-foreground line-through">₹{product.originalPrice}</p>
                </div>
                <Badge className="bg-red-500">Save ₹{product.originalPrice - product.price}</Badge>
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
                      <div key={key} className="flex border-b border-border pb-3">
                        <span className="w-1/3 font-semibold text-sm">{key}</span>
                        <span className="w-2/3 text-sm text-muted-foreground">{value}</span>
                      </div>
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
                  <p className="font-medium">{product.createdAt}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{product.updatedAt}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
