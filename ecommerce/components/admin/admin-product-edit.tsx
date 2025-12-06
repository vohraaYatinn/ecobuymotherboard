"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Package, ImageIcon, FileText, DollarSign, Loader2, X } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.safartax.com"

interface AdminProductEditProps {
  productId: string
}

interface Product {
  _id: string
  name: string
  sku: string
  brand: string
  model?: string
  category: string
  price: number
  comparePrice?: number
  stock: number
  status: string
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

export function AdminProductEdit({ productId }: AdminProductEditProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [product, setProduct] = useState<Product | null>(null)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [categories, setCategories] = useState<Array<{ _id: string; name: string; slug: string }>>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    brand: "",
    model: "",
    category: "",
    description: "",
    features: "",
    productType: "",
    compatibility: "",
    condition: "new",
    warranty: "",
    weight: "",
    dimensions: "",
    price: "",
    comparePrice: "",
    stock: "",
    status: "in-stock",
    images: [] as string[],
  })

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products/${productId}`)
        const data = await response.json()

        if (data.success) {
          const productData = data.data
          setProduct(productData)
          // Handle category - can be ObjectId string or populated object
          const categoryId = typeof productData.category === 'object' && productData.category?._id 
            ? productData.category._id 
            : productData.category || ""
          setFormData({
            name: productData.name || "",
            sku: productData.sku || "",
            brand: productData.brand || "",
            model: productData.model || "",
            category: categoryId,
            description: productData.description || "",
            features: Array.isArray(productData.features)
              ? productData.features.join("\n")
              : productData.features || "",
            productType: productData.specifications?.productType || "",
            compatibility: productData.specifications?.compatibility || "",
            condition: productData.specifications?.condition || "new",
            warranty: productData.specifications?.warranty || "",
            weight: productData.specifications?.weight || "",
            dimensions: productData.specifications?.dimensions || "",
            price: productData.price?.toString() || "",
            comparePrice: productData.comparePrice?.toString() || "",
            stock: productData.stock?.toString() || "",
            status: productData.status || "in-stock",
            images: productData.images || [],
          })
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

    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_URL}/api/categories`)
        const data = await response.json()
        if (data.success) {
          setCategories(data.data)
        }
      } catch (err) {
        console.error("Error fetching categories:", err)
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchProduct()
    fetchCategories()
  }, [productId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles = Array.from(files)
    setSelectedFiles((prev) => [...prev, ...newFiles])

    // Create previews
    const previews = newFiles.map((file) => URL.createObjectURL(file))
    setImagePreviews((prev) => [...prev, ...previews])

    // Upload images
    await uploadImages(newFiles)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith("image/"))
    if (files.length === 0) return

    setSelectedFiles((prev) => [...prev, ...files])

    // Create previews
    const previews = files.map((file) => URL.createObjectURL(file))
    setImagePreviews((prev) => [...prev, ...previews])

    // Upload images
    await uploadImages(files)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const uploadImages = async (files: File[]) => {
    setUploadingImages(true)
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        setError("Authentication required")
        return
      }

      const formData = new FormData()
      files.forEach((file) => {
        formData.append("images", file)
      })

      const response = await fetch(`${API_URL}/api/upload/images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        const imageUrls = data.data.map((item: { url: string }) => item.url)
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...imageUrls],
        }))
      } else {
        setError(data.message || "Failed to upload images")
      }
    } catch (err) {
      console.error("Error uploading images:", err)
      setError("Error uploading images")
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin-login")
        return
      }

      // Prepare specifications object
      const specifications: Record<string, string> = {}
      if (formData.productType) specifications.productType = formData.productType
      if (formData.compatibility) specifications.compatibility = formData.compatibility
      if (formData.condition) specifications.condition = formData.condition
      if (formData.warranty) specifications.warranty = formData.warranty
      if (formData.weight) specifications.weight = formData.weight
      if (formData.dimensions) specifications.dimensions = formData.dimensions

      const payload = {
        name: formData.name,
        sku: formData.sku,
        brand: formData.brand,
        model: formData.model || undefined,
        category: formData.category,
        description: formData.description,
        features: formData.features,
        specifications,
        price: parseFloat(formData.price),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : undefined,
        stock: parseInt(formData.stock),
        status: formData.status,
        images: formData.images,
      }

      const response = await fetch(`${API_URL}/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Failed to update product")
        setSaving(false)
        return
      }

      // Success - redirect to product view
      router.push(`/admin/products/${productId}`)
    } catch (err) {
      console.error("Error updating product:", err)
      setError("Error updating product. Please try again.")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !product) {
    return (
      <div className="space-y-6">
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{error}</p>
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

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Product Form */}
      <form onSubmit={handleSubmit}>
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
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter product name"
                    className="mt-1.5"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      placeholder="TV-PCB-XXX-001"
                      className="mt-1.5"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="brand">Brand *</Label>
                    <Input
                      id="brand"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      placeholder="Enter brand name"
                      className="mt-1.5"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Model Number</Label>
                    <Input
                      id="model"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      placeholder="Enter model"
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Product Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter detailed product description"
                    rows={4}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="features">Key Features (one per line)</Label>
                  <Textarea
                    id="features"
                    name="features"
                    value={formData.features}
                    onChange={handleChange}
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
                      name="productType"
                      value={formData.productType}
                      onChange={handleChange}
                      placeholder="e.g., LED TV PCB Board"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="compatibility">Compatibility</Label>
                    <Input
                      id="compatibility"
                      name="compatibility"
                      value={formData.compatibility}
                      onChange={handleChange}
                      placeholder="Compatible devices/models"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) => handleSelectChange("condition", value)}
                    >
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
                      name="warranty"
                      value={formData.warranty}
                      onChange={handleChange}
                      placeholder="e.g., 12 Months"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Weight</Label>
                    <Input
                      id="weight"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      placeholder="e.g., 150g"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dimensions">Dimensions</Label>
                    <Input
                      id="dimensions"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleChange}
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
                {/* Image Previews */}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {formData.images.map((imageUrl, index) => (
                      <div key={index} className="relative group aspect-square overflow-hidden rounded-lg border-2 border-border">
                        <Image
                          src={imageUrl.startsWith("http") ? imageUrl : `${API_URL}${imageUrl}`}
                          alt={`Product ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                            Main
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Area */}
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <input
                    type="file"
                    id="image-upload-edit"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">Drag and drop images or click to browse</p>
                  <label htmlFor="image-upload-edit">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingImages}
                      className="cursor-pointer"
                      asChild
                    >
                      <span>
                        {uploadingImages ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          "Upload Images"
                        )}
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-2">Max 5MB per image. Supported: JPG, PNG, WebP</p>
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
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="mt-1.5"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="originalPrice">Original Price (₹)</Label>
                  <Input
                    id="originalPrice"
                    name="comparePrice"
                    type="number"
                    value={formData.comparePrice}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="mt-1.5"
                    min="0"
                    step="0.01"
                  />
                </div>
                {formData.comparePrice && parseFloat(formData.comparePrice) > parseFloat(formData.price || "0") && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Discount Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{parseFloat(formData.comparePrice) - parseFloat(formData.price || "0")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round(
                        ((parseFloat(formData.comparePrice) - parseFloat(formData.price || "0")) /
                          parseFloat(formData.comparePrice)) *
                          100
                      )}
                      % off
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Inventory Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    value={formData.stock}
                    onChange={handleChange}
                    placeholder="0"
                    className="mt-1.5"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Stock Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
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
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleSelectChange("category", value)}
                >
                  <SelectTrigger id="category" className="mt-1.5">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCategories ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading categories...</div>
                    ) : categories.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No categories available</div>
                    ) : (
                      categories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3">
          <Link href={`/admin/products/${productId}`}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="gap-2" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
