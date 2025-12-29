"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://10.204.150.75:5000"

interface WishlistItem {
  _id: string
  product: {
    _id: string
    name: string
    brand: string
    price: number
    comparePrice?: number
    images: string[]
    sku: string
    category: string
    status: string
    stock: number
    rating: number
    reviews: number
  }
  addedAt: string
}

interface WishlistContextType {
  wishlistItems: WishlistItem[]
  wishlistCount: number
  loading: boolean
  isFavorite: (productId: string) => boolean
  addToWishlist: (productId: string) => Promise<void>
  removeFromWishlist: (productId: string) => Promise<void>
  refreshWishlist: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(false)
  const [favoriteProducts, setFavoriteProducts] = useState<Set<string>>(new Set())

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("customerToken")
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    return headers
  }, [])

  const refreshWishlist = useCallback(async () => {
    const token = localStorage.getItem("customerToken")
    if (!token) {
      setWishlistItems([])
      setFavoriteProducts(new Set())
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/wishlist`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (data.success) {
        setWishlistItems(data.data)
        // Update favorite products set
        const favoriteSet = new Set(data.data.map((item: WishlistItem) => item.product._id))
        setFavoriteProducts(favoriteSet)
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    refreshWishlist()
  }, [refreshWishlist])

  // Refresh wishlist when user logs in
  useEffect(() => {
    const handleLogin = () => {
      refreshWishlist()
    }

    window.addEventListener("customerLoggedIn", handleLogin)
    return () => window.removeEventListener("customerLoggedIn", handleLogin)
  }, [refreshWishlist])

  const isFavorite = useCallback(
    (productId: string) => {
      return favoriteProducts.has(productId)
    },
    [favoriteProducts]
  )

  const addToWishlist = useCallback(
    async (productId: string) => {
      const token = localStorage.getItem("customerToken")
      if (!token) {
        // Redirect to login if not authenticated
        sessionStorage.setItem("returnUrl", window.location.pathname)
        window.location.href = "/login"
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`${API_URL}/api/wishlist/add`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ productId }),
        })
        const data = await response.json()
        if (data.success) {
          await refreshWishlist()
        } else {
          throw new Error(data.message || "Failed to add to wishlist")
        }
      } catch (error) {
        console.error("Error adding to wishlist:", error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [getAuthHeaders, refreshWishlist]
  )

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      const token = localStorage.getItem("customerToken")
      if (!token) {
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`${API_URL}/api/wishlist/remove/${productId}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        })
        const data = await response.json()
        if (data.success) {
          await refreshWishlist()
        } else {
          throw new Error(data.message || "Failed to remove from wishlist")
        }
      } catch (error) {
        console.error("Error removing from wishlist:", error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [getAuthHeaders, refreshWishlist]
  )

  const wishlistCount = wishlistItems.length

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount,
        loading,
        isFavorite,
        addToWishlist,
        removeFromWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return context
}




