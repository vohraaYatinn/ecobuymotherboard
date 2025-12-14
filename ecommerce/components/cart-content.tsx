"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, Minus, ShoppingBag, Loader2 } from "lucide-react"
import { useCart } from "@/lib/cart-context"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

export function CartContent() {
  const router = useRouter()
  const { cartItems, loading, updateQuantity, removeFromCart } = useCart()

  const handleQuantityChange = async (productId: string, change: number) => {
    const item = cartItems.find((item) => item.product._id === productId)
    if (item) {
      const newQuantity = Math.max(1, item.quantity + change)
      await updateQuantity(productId, newQuantity)
    }
  }

  const handleRemove = async (productId: string) => {
    if (confirm("Are you sure you want to remove this item?")) {
      await removeFromCart(productId)
    }
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = 0 // Fixed shipping charges
  const total = subtotal + shipping

  const handleCheckout = () => {
    const token = localStorage.getItem("customerToken")
    if (!token) {
      sessionStorage.setItem("returnUrl", "/cart")
      router.push("/login")
    } else {
      router.push("/checkout")
    }
  }

  if (loading && cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag className="h-24 w-24 mx-auto mb-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8">Looks like you haven't added any items to your cart yet.</p>
          <Link href="/products">
            <Button size="lg">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 lg:mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {cartItems.map((item) => (
            <div key={item.product._id} className="flex gap-3 sm:gap-4 p-3 sm:p-4 border border-border rounded-lg bg-card">
              <Link href={`/products/${item.product._id}`} className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={item.product.images?.[0] ? `${API_URL}${item.product.images[0]}` : "/placeholder.svg"}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 80px, 96px"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">{item.product.brand}</p>
                <Link href={`/products/${item.product._id}`}>
                  <h3 className="font-semibold mb-1.5 sm:mb-2 line-clamp-2 hover:text-primary text-sm sm:text-base leading-tight">{item.product.name}</h3>
                </Link>
                <p className="text-base sm:text-lg font-bold">₹{item.price}</p>
              </div>

              <div className="flex flex-col items-end justify-between gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(item.product._id)}
                  className="text-destructive hover:text-destructive h-9 w-9 sm:h-10 sm:w-10 touch-manipulation"
                  disabled={loading}
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div className="flex items-center border border-border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 sm:h-10 sm:w-10 touch-manipulation"
                    onClick={() => handleQuantityChange(item.product._id, -1)}
                    disabled={loading || item.quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <span className="w-8 sm:w-10 text-center text-xs sm:text-sm font-semibold">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 sm:h-10 sm:w-10 touch-manipulation"
                    onClick={() => handleQuantityChange(item.product._id, 1)}
                    disabled={loading}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <Link href="/products" className="w-full">
            <Button variant="outline" className="w-full bg-transparent h-10 sm:h-11 text-sm sm:text-base touch-manipulation">
              Continue Shopping
            </Button>
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 sm:top-24 p-4 sm:p-6 border border-border rounded-lg bg-card">
            <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Order Summary</h2>

            <div className="space-y-2.5 sm:space-y-3 mb-4 sm:mb-6">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Subtotal ({cartItems.length} items)</span>
                <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-semibold">₹{shipping.toLocaleString()}</span>
              </div>
              <div className="border-t border-border pt-2.5 sm:pt-3 flex justify-between">
                <span className="font-bold text-sm sm:text-base">Total</span>
                <span className="text-lg sm:text-xl font-bold text-primary">₹{total.toLocaleString()}</span>
              </div>
            </div>

            <Button className="w-full mb-3 sm:mb-4 h-11 sm:h-12 text-sm sm:text-base touch-manipulation" size="lg" onClick={handleCheckout} disabled={loading}>
              Proceed to Checkout
            </Button>

            <div className="space-y-2.5 sm:space-y-3">
              <Input placeholder="Enter coupon code" className="h-10 sm:h-11 text-sm" />
              <Button variant="outline" className="w-full bg-transparent h-10 sm:h-11 text-sm sm:text-base touch-manipulation">
                Apply Coupon
              </Button>
            </div>

            <div className="mt-4 sm:mt-6 text-xs text-muted-foreground">
              <p className="mb-2">We accept:</p>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                <div className="px-2 py-1 border border-border rounded text-xs">Visa</div>
                <div className="px-2 py-1 border border-border rounded text-xs">Mastercard</div>
                <div className="px-2 py-1 border border-border rounded text-xs">COD</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
