"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Package, ImageIcon, FileText, DollarSign } from "lucide-react"

export function AdminAddProduct() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add New Product</h1>
          <p className="text-sm text-muted-foreground mt-1">Add a new product to the catalog</p>
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
                <Input id="productName" placeholder="e.g., Model 49W672E Sony LED TV PCB Board" className="mt-1.5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input id="sku" placeholder="TV-PCB-XXX-001" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="brand">Brand *</Label>
                  <Input id="brand" placeholder="e.g., Sony, LG, Samsung" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="model">Model Number</Label>
                  <Input id="model" placeholder="e.g., 49W672E" className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Product Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Enter detailed product description highlighting key features and benefits"
                  rows={4}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="features">Key Features (one per line)</Label>
                <Textarea
                  id="features"
                  placeholder="100% tested and quality assured&#10;Compatible with specific models&#10;Easy installation&#10;Professional grade components&#10;12-month warranty"
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
                  <Input id="productType" placeholder="e.g., LED TV PCB Board" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="compatibility">Compatibility</Label>
                  <Input id="compatibility" placeholder="Compatible devices/models" className="mt-1.5" />
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
                  <Input id="warranty" placeholder="e.g., 12 Months" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="weight">Weight</Label>
                  <Input id="weight" placeholder="e.g., 150g" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input id="dimensions" placeholder="e.g., 25cm x 15cm x 2cm" className="mt-1.5" />
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
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Drag and drop images or click to browse</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload multiple images (first image will be the main product image)
                </p>
                <Button variant="outline" size="sm">
                  Choose Files
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
                <Input id="price" type="number" placeholder="2499" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="comparePrice">Original Price (₹)</Label>
                <Input id="comparePrice" type="number" placeholder="2799" className="mt-1.5" />
                <p className="text-xs text-muted-foreground mt-1">Leave blank if there's no discount</p>
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
                <Input id="stock" type="number" placeholder="0" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="status">Stock Status *</Label>
                <Select defaultValue="in-stock">
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
              <Select>
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
        <Link href="/admin/products">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Add Product
        </Button>
      </div>
    </div>
  )
}
