"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Plus, Edit } from "lucide-react"

const products = [
  {
    id: "PROD001",
    name: "LG 43 inch LED TV PCB Board",
    sku: "TV-PCB-LG-001",
    brand: "LG",
    price: "₹2,500",
    stock: 15,
    status: "In Stock",
    image: "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
  },
  {
    id: "PROD002",
    name: "Sony 49W672E LED TV PCB",
    sku: "TV-PCB-SONY-045",
    brand: "Sony",
    price: "₹3,200",
    stock: 8,
    status: "In Stock",
    image: "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
  },
  {
    id: "PROD003",
    name: "Samsung T-Con Board",
    sku: "TV-PCB-SAMSUNG-032",
    brand: "Samsung",
    price: "₹4,100",
    stock: 0,
    status: "Out of Stock",
    image: "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
  },
]

const getStockColor = (status: string) => {
  return status === "In Stock" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
}

export function AdminProductsList() {
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by product name, SKU, or brand..." className="pl-10" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Product Image */}
                <div className="relative w-full sm:w-24 h-40 sm:h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <Image src={product.image || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
                </div>

                {/* Product Details */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1">
                      <Link href={`/admin/products/${product.id}`}>
                        <h3 className="text-lg font-semibold text-foreground hover:text-primary">{product.name}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                    <Badge className={getStockColor(product.status)}>{product.status}</Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Product ID</p>
                      <p className="font-medium">{product.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Brand</p>
                      <p className="font-medium">{product.brand}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-medium text-green-600">{product.price}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stock</p>
                      <p className="font-medium">{product.stock} units</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Link href={`/admin/products/${product.id}`}>
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                    </Link>
                    <Link href={`/admin/products/${product.id}/edit`}>
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
    </div>
  )
}
