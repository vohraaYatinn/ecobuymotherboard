"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2 } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.36:5000"

interface SearchSuggestion {
  _id: string
  name: string
  brand: string
  price: number
  images: string[]
  sku: string
  category: string
}

export function SearchBar({ className = "", mobile = false }: { className?: string; mobile?: boolean }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Fetch suggestions with debounce
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    if (searchQuery.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API_URL}/api/search/suggestions?q=${encodeURIComponent(searchQuery)}&limit=8`)
        const data = await response.json()
        if (data.success) {
          setSuggestions(data.data)
          setShowSuggestions(data.data.length > 0)
          setSelectedIndex(-1)
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error)
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300) // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [searchQuery])

  const handleSearch = (query?: string) => {
    const searchTerm = query || searchQuery.trim()
    if (searchTerm.length > 0) {
      setShowSuggestions(false)
      router.push(`/products?search=${encodeURIComponent(searchTerm)}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        router.push(`/products/${suggestions[selectedIndex]._id}`)
      } else {
        handleSearch()
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSearch()
        }}
        className="relative"
      >
        <Input
          ref={inputRef}
          type="search"
          placeholder={mobile ? "Search products..." : "Search for PCB boards, motherboards..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          onKeyDown={handleKeyDown}
          className={mobile ? "h-10 w-full rounded-full border-primary/20 pr-10" : "h-12 w-full rounded-full border-2 border-primary/20 pr-12 focus:border-primary"}
        />
        <Button
          type="submit"
          size="icon"
          className={`absolute right-1 top-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 ${
            mobile ? "h-8 w-8" : "h-10 w-10"
          }`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-[500px] overflow-y-auto">
          <div className="p-2">
            {suggestions.map((product, index) => (
              <Link
                key={product._id}
                href={`/products/${product._id}`}
                onClick={() => {
                  setShowSuggestions(false)
                  setSearchQuery("")
                }}
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors ${
                  selectedIndex === index ? "bg-muted" : ""
                }`}
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image
                    src={product.images?.[0] ? `${API_URL}${product.images[0]}` : "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground line-clamp-1">{product.brand}</p>
                  <p className="text-sm font-medium line-clamp-2">{product.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-primary">{formatPrice(product.price)}</p>
                </div>
              </Link>
            ))}
            {searchQuery.trim().length > 0 && (
              <div className="border-t border-border mt-2 pt-2">
                <button
                  onClick={() => handleSearch()}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-primary hover:bg-muted rounded-lg transition-colors"
                >
                  View all results for "{searchQuery}"
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}




