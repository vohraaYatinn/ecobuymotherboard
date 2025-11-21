"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, ShoppingCart, Heart, Truck, Shield, RotateCcw, Plus, Minus } from "lucide-react"

interface ProductDetailProps {
  productId: string
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)

  // Mock product data
  const product = {
    name: "Model 49W672E Sony LED TV PCB Board",
    brand: "Sony",
    model: "49W672E",
    price: 2499,
    originalPrice: 2799,
    discount: 11,
    rating: 4.5,
    reviews: 128,
    inStock: true,
    sku: "PCB-SONY-49W672E",
    category: "Television Inverter Boards",
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
    },
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">
          Home
        </a>
        <span>/</span>
        <a href="/products" className="hover:text-foreground">
          Products
        </a>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Product Images */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted mb-4">
            <Image
              src={product.images[selectedImage] || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-cover"
            />
            {product.discount > 0 && (
              <Badge className="absolute top-4 left-4 bg-red-500 text-white">{product.discount}% OFF</Badge>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {product.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                  selectedImage === index ? "border-primary" : "border-border"
                }`}
              >
                <Image src={image || "/placeholder.svg"} alt={`Product ${index + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">{product.brand}</p>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">({product.reviews} reviews)</span>
            {product.inStock && (
              <Badge variant="outline" className="border-green-500 text-green-600">
                In Stock
              </Badge>
            )}
          </div>

          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-4xl font-bold text-foreground">₹{product.price}</span>
            <span className="text-xl text-muted-foreground line-through">₹{product.originalPrice}</span>
            <Badge className="bg-red-500">Save ₹{product.originalPrice - product.price}</Badge>
          </div>

          <p className="text-muted-foreground mb-6">{product.description}</p>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-5 w-5 text-primary" />
              <span>Free shipping on orders over ₹500</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-5 w-5 text-primary" />
              <span>12 months warranty included</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <RotateCcw className="h-5 w-5 text-primary" />
              <span>30-day return policy</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border border-border rounded-lg">
              <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-semibold">{quantity}</span>
              <Button variant="ghost" size="icon" onClick={() => setQuantity(quantity + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Button size="lg" className="flex-1">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>

            <Button size="lg" variant="outline">
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              <strong>SKU:</strong> {product.sku}
            </p>
            <p>
              <strong>Category:</strong> {product.category}
            </p>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <Tabs defaultValue="description" className="mb-16">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="specifications">Specifications</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({product.reviews})</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-6">
          <div className="prose max-w-none">
            <h3 className="text-xl font-semibold mb-4">Product Description</h3>
            <p className="text-muted-foreground mb-6">{product.description}</p>

            <h4 className="text-lg font-semibold mb-3">Key Features:</h4>
            <ul className="space-y-2">
              {product.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="specifications" className="mt-6">
          <div className="max-w-2xl">
            <h3 className="text-xl font-semibold mb-4">Technical Specifications</h3>
            <div className="space-y-3">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex border-b border-border pb-3">
                  <span className="w-1/3 font-semibold">{key}</span>
                  <span className="w-2/3 text-muted-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <div className="max-w-2xl">
            <h3 className="text-xl font-semibold mb-4">Customer Reviews</h3>
            <p className="text-muted-foreground">Reviews will be displayed here.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
