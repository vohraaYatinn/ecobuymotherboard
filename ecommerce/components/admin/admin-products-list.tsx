"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Plus, Edit, Loader2 } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.36:5000"

interface Product {
  _id: string
  name: string
  sku: string
  brand: string
  price: number
  stock: number
  status: string
  images: string[]
  category: string
}

const getStockColor = (status: string) => {
  const statusMap: Record<string, string> = {
    "in-stock": "bg-green-100 text-green-800",
    "out-of-stock": "bg-red-100 text-red-800",
    "low-stock": "bg-yellow-100 text-yellow-800",
  }
  return statusMap[status] || "bg-gray-100 text-gray-800"
}

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    "in-stock": "In Stock",
    "out-of-stock": "Out of Stock",
    "low-stock": "Low Stock",
  }
  return statusMap[status] || status
}

export function AdminProductsList() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [brandFilter, setBrandFilter] = useState("all")
  const [categories, setCategories] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products/filters/options`)
        const data = await response.json()
        if (data.success) {
          setCategories(data.data.categories)
          setBrands(data.data.brands)
        }
      } catch (err) {
        console.error("Error fetching filter options:", err)
      }
    }
    fetchFilterOptions()
  }, [])

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      setError("")
      try {
        const params = new URLSearchParams()
        if (search) params.append("search", search)
        if (statusFilter && statusFilter !== "all") params.append("status", statusFilter)
        if (categoryFilter && categoryFilter !== "all") params.append("category", categoryFilter)
        if (brandFilter && brandFilter !== "all") params.append("brand", brandFilter)
        params.append("limit", "50")

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

    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchProducts()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [search, statusFilter, categoryFilter, brandFilter])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Products Management</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all products</p>
        </div>
        <Link href="/admin/products/add">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product name, SKU, or brand..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter || "all"} onValueChange={(value) => setCategoryFilter(value === "all" ? "" : value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat
                    .split("-")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={brandFilter || "all"} onValueChange={(value) => setBrandFilter(value === "all" ? "" : value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Products Grid */}
      {!loading && !error && (
        <>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {products.map((product) => (
                <Card key={product._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Product Image */}
                      <div className="relative w-full sm:w-24 h-40 sm:h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
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
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1">
                            <Link href={`/admin/products/${product._id}`}>
                              <h3 className="text-lg font-semibold text-foreground hover:text-primary">
                                {product.name}
                              </h3>
                            </Link>
                            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                          </div>
                          <Badge className={getStockColor(product.status)}>
                            {getStatusLabel(product.status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Product ID</p>
                            <p className="font-medium text-xs">{product._id.slice(-8)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Brand</p>
                            <p className="font-medium">{product.brand}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Price</p>
                            <p className="font-medium text-green-600">{formatPrice(product.price)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Stock</p>
                            <p className="font-medium">{product.stock} units</p>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-border">
                          <Link href={`/admin/products/${product._id}`}>
                            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </Link>
                          <Link href={`/admin/products/${product._id}/edit`}>
                            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                              <Edit className="h-4 w-4" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
