"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react"

export function CartContent() {
  const [cartItems, setCartItems] = useState([
    {
      id: "1",
      name: "Model 49W672E Sony LED TV PCB",
      brand: "Sony",
      price: 2499,
      quantity: 1,
      image: "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
    },
    {
      id: "2",
      name: "Model 43W772E Sony LED TV PCB",
      brand: "Sony",
      price: 2199,
      quantity: 2,
      image: "/modern-television-circuit-board-pcb-motherboard-cl.jpg",
    },
  ])

  const updateQuantity = (id: string, change: number) => {
    setCartItems((items) =>
      items.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, item.quantity + change) } : item)),
    )
  }

  const removeItem = (id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id))
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = subtotal > 500 ? 0 : 50
  const total = subtotal + shipping

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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <div key={item.id} className="flex gap-4 p-4 border border-border rounded-lg bg-card">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{item.brand}</p>
                <h3 className="font-semibold mb-2 line-clamp-2">{item.name}</h3>
                <p className="text-lg font-bold">₹{item.price}</p>
              </div>

              <div className="flex flex-col items-end justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div className="flex items-center border border-border rounded-lg">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <Link href="/products">
            <Button variant="outline" className="w-full bg-transparent">
              Continue Shopping
            </Button>
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 p-6 border border-border rounded-lg bg-card">
            <h2 className="text-xl font-bold mb-6">Order Summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({cartItems.length} items)</span>
                <span className="font-semibold">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-semibold">{shipping === 0 ? "FREE" : `₹${shipping}`}</span>
              </div>
              {shipping === 0 && <p className="text-xs text-green-600">You've qualified for free shipping!</p>}
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-bold">Total</span>
                <span className="text-xl font-bold text-primary">₹{total}</span>
              </div>
            </div>

            <Button className="w-full mb-4" size="lg">
              Proceed to Checkout
            </Button>

            <div className="space-y-3">
              <Input placeholder="Enter coupon code" />
              <Button variant="outline" className="w-full bg-transparent">
                Apply Coupon
              </Button>
            </div>

            <div className="mt-6 text-xs text-muted-foreground">
              <p className="mb-2">We accept:</p>
              <div className="flex gap-2">
                <div className="px-2 py-1 border border-border rounded">Visa</div>
                <div className="px-2 py-1 border border-border rounded">Mastercard</div>
                <div className="px-2 py-1 border border-border rounded">COD</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
