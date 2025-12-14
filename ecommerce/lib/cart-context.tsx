"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.35:5000"

interface CartItem {
  _id?: string
  product: {
    _id: string
    name: string
    brand: string
    price: number
    images: string[]
  }
  quantity: number
  price: number
}

interface CartContextType {
  cartItems: CartItem[]
  cartCount: number
  loading: boolean
  addToCart: (productId: string, quantity?: number) => Promise<void>
  updateQuantity: (productId: string, quantity: number) => Promise<void>
  removeFromCart: (productId: string) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Initialize session ID
  useEffect(() => {
    let sid = localStorage.getItem("cartSessionId")
    if (!sid) {
      sid = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("cartSessionId", sid)
    }
    setSessionId(sid)
  }, [])

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("customerToken")
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    if (sessionId) {
      headers["x-session-id"] = sessionId
    }
    return headers
  }, [sessionId])

  const refreshCart = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/cart`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (data.success) {
        setCartItems(data.data?.items || [])
      }
    } catch (error) {
      console.error("Error fetching cart:", error)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  // Refresh cart when user logs in (to merge session cart)
  useEffect(() => {
    const handleLogin = () => {
      if (sessionId) {
        refreshCart()
      }
    }
    
    window.addEventListener("customerLoggedIn", handleLogin)
    return () => window.removeEventListener("customerLoggedIn", handleLogin)
  }, [sessionId, refreshCart])

  useEffect(() => {
    if (sessionId) {
      refreshCart()
    }
  }, [sessionId, refreshCart])

  const addToCart = useCallback(async (productId: string, quantity: number = 1) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/cart/add`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId, quantity }),
      })
      const data = await response.json()
      if (data.success) {
        await refreshCart()
      } else {
        throw new Error(data.message || "Failed to add to cart")
      }
    } catch (error) {
      console.error("Error adding to cart:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders, refreshCart])

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/cart/update`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId, quantity }),
      })
      const data = await response.json()
      if (data.success) {
        await refreshCart()
      } else {
        throw new Error(data.message || "Failed to update cart")
      }
    } catch (error) {
      console.error("Error updating cart:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders, refreshCart])

  const removeFromCart = useCallback(async (productId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/cart/remove/${productId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (data.success) {
        await refreshCart()
      } else {
        throw new Error(data.message || "Failed to remove from cart")
      }
    } catch (error) {
      console.error("Error removing from cart:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders, refreshCart])

  const clearCart = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/cart/clear`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (data.success) {
        await refreshCart()
      }
    } catch (error) {
      console.error("Error clearing cart:", error)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders, refreshCart])

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

