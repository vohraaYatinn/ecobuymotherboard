"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Package, ImageIcon, FileText, DollarSign } from "lucide-react"

interface AdminProductEditProps {
  productId: string
}

export function AdminProductEdit({ productId }: AdminProductEditProps) {
  // Mock product data
  const product = {
    name: "Model 49W672E Sony LED TV PCB Board",
    sku: "TV-PCB-SONY-045",
    brand: "Sony",
    model: "49W672E",
    category: "tv-inverter",
    price: 2499,
    originalPrice: 2799,
    stock: 8,
    status: "in-stock",
    description:
      "High-quality replacement PCB board for Sony 49W672E LED TV. This genuine replacement part ensures optimal performance and compatibility with your television.",
    features:
      "100% tested and quality assured\nCompatible with Sony 49W672E models\nEasy installation with detailed instructions\nProfessional grade components\n12-month manufacturer warranty",
    specifications: {
      Brand: "Sony",
      ModelNumber: "49W672E",
      ProductType: "LED TV PCB Board",
      Compatibility: "Sony 49W672E LED TV",
      Warranty: "12 Months",
      Condition: "New",
      Weight: "150g",
      Dimensions: "25cm x 15cm x 2cm",
    },
    images: ["/modern-television-circuit-board-pcb-motherboard-cl.jpg"],
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/products/${productId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Product</h1>
          <p className="text-sm text-muted-foreground mt-1">Update product information</p>
        </div>
      </div>

      {/* Product Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md border-t-4 border-t-primary">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="productName">Product Name *</Label>
                <Input
                  id="productName"
                  defaultValue={product.name}
                  placeholder="Enter product name"
                  className="mt-1.5"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input id="sku" defaultValue={product.sku} placeholder="TV-PCB-XXX-001" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="brand">Brand *</Label>
                  <Input id="brand" defaultValue={product.brand} placeholder="Enter brand name" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="model">Model Number</Label>
                  <Input id="model" defaultValue={product.model} placeholder="Enter model" className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Product Description *</Label>
                <Textarea
                  id="description"
                  defaultValue={product.description}
                  placeholder="Enter detailed product description"
                  rows={4}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="features">Key Features (one per line)</Label>
                <Textarea
                  id="features"
                  defaultValue={product.features}
                  placeholder="Enter key features, one per line"
                  rows={6}
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Technical Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productType">Product Type</Label>
                  <Input
                    id="productType"
                    defaultValue={product.specifications.ProductType}
                    placeholder="e.g., LED TV PCB Board"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="compatibility">Compatibility</Label>
                  <Input
                    id="compatibility"
                    defaultValue={product.specifications.Compatibility}
                    placeholder="Compatible devices/models"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="condition">Condition</Label>
                  <Select defaultValue="new">
                    <SelectTrigger id="condition" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="refurbished">Refurbished</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="warranty">Warranty Period</Label>
                  <Input
                    id="warranty"
                    defaultValue={product.specifications.Warranty}
                    placeholder="e.g., 12 Months"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    defaultValue={product.specifications.Weight}
                    placeholder="e.g., 150g"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input
                    id="dimensions"
                    defaultValue={product.specifications.Dimensions}
                    placeholder="e.g., 25cm x 15cm x 2cm"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Product Images
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {product.images.map((image, index) => (
                  <div key={index} className="relative aspect-square overflow-hidden rounded-lg border-2 border-border">
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`Product ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Drag and drop images or click to browse</p>
                <Button variant="outline" size="sm">
                  Upload Images
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="shadow-md border-t-4 border-t-accent">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-primary/5">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="price">Selling Price (₹) *</Label>
                <Input id="price" type="number" defaultValue={product.price} placeholder="0.00" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="originalPrice">Original Price (₹)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  defaultValue={product.originalPrice}
                  placeholder="0.00"
                  className="mt-1.5"
                />
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">Discount Amount</p>
                <p className="text-2xl font-bold text-green-600">₹{product.originalPrice - product.price}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% off
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Inventory Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input id="stock" type="number" defaultValue={product.stock} placeholder="0" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="status">Stock Status *</Label>
                <Select defaultValue={product.status}>
                  <SelectTrigger id="status" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="category">Product Category *</Label>
              <Select defaultValue={product.category}>
                <SelectTrigger id="category" className="mt-1.5">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tv-inverter">Television Inverter Boards</SelectItem>
                  <SelectItem value="tv-motherboard">Television Motherboard</SelectItem>
                  <SelectItem value="tv-pcb">Television PCB Board</SelectItem>
                  <SelectItem value="power-supply">Power Supply Boards</SelectItem>
                  <SelectItem value="t-con">T-Con Board</SelectItem>
                  <SelectItem value="universal-motherboard">Universal Motherboard</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3">
        <Link href={`/admin/products/${productId}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
