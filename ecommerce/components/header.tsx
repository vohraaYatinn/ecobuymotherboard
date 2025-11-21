"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Menu, Search, ShoppingCart, Heart, MapPin, User, Globe } from "lucide-react"

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="border-b border-border bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-10 items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2 sm:gap-4">
              <a
                href="tel:+917396777800"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <span className="hidden sm:inline">+91 7396 777 800 / 600 / 300</span>
                <span className="sm:hidden">Call Us</span>
              </a>
              <span className="hidden text-muted-foreground md:inline">|</span>
              <a
                href="mailto:customercare@ecobuy.com"
                className="hidden text-muted-foreground hover:text-foreground md:inline"
              >
                customercare@ecobuy.com
              </a>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/store-location"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <MapPin className="h-3 w-3" />
                <span className="hidden sm:inline">Store Location</span>
              </Link>
              <Link href="/login" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <User className="h-3 w-3" />
                <span className="hidden sm:inline">Sign in or Register</span>
                <span className="sm:hidden">Account</span>
              </Link>
              <button className="text-muted-foreground hover:text-foreground">
                <Globe className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg sm:text-xl font-bold text-primary-foreground">E</span>
            </div>
            <span className="hidden text-xl font-bold text-foreground sm:inline">EcoBuy</span>
          </Link>

          <div className="hidden flex-1 max-w-2xl md:block">
            <form className="relative">
              <Input
                type="search"
                placeholder="Search for PCB boards, motherboards..."
                className="h-12 w-full rounded-full border-2 border-primary/20 pr-12 focus:border-primary"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <div className="flex items-center gap-1 sm:gap-4">
            <Link href="/wishlist">
              <Button variant="ghost" size="icon" className="relative text-foreground h-9 w-9 sm:h-10 sm:w-10">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                <Badge className="absolute -right-1 -top-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  0
                </Badge>
              </Button>
            </Link>
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative text-foreground h-9 w-9 sm:h-10 sm:w-10">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                <Badge className="absolute -right-1 -top-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {cartCount}
                </Badge>
              </Button>
            </Link>
            <div className="hidden sm:block text-sm font-medium whitespace-nowrap">Rs. 0.00</div>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <nav className="flex flex-col gap-6 pt-6">
                  <Link href="/" className="text-lg font-medium" onClick={() => setIsOpen(false)}>
                    Home
                  </Link>
                  <Link href="/about" className="text-lg font-medium" onClick={() => setIsOpen(false)}>
                    About Us
                  </Link>
                  <Link href="/contact" className="text-lg font-medium" onClick={() => setIsOpen(false)}>
                    Contact
                  </Link>
                  <Link href="/dashboard" className="text-lg font-medium" onClick={() => setIsOpen(false)}>
                    My Dashboard
                  </Link>
                  <Link href="/become-seller" className="text-lg font-medium" onClick={() => setIsOpen(false)}>
                    Become a Seller
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <form className="relative">
            <Input
              type="search"
              placeholder="Search products..."
              className="h-10 w-full rounded-full border-primary/20 pr-10"
            />
            <Button type="submit" size="icon" className="absolute right-1 top-0.5 h-8 w-8 rounded-full">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex h-10 sm:h-12 items-center justify-between overflow-x-auto">
            <div className="hidden items-center gap-4 lg:gap-6 md:flex">
              <Link href="/" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                Home
              </Link>
              <Link href="/about" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                About us
              </Link>
              <Link href="/" className="relative text-sm font-medium hover:text-primary whitespace-nowrap">
                Collections
                <Badge className="ml-1 h-4 px-1 text-[10px]" variant="destructive">
                  Sale
                </Badge>
              </Link>
              <Link href="/" className="relative text-sm font-medium hover:text-primary whitespace-nowrap">
                Categories
                <Badge className="ml-1 h-4 px-1 text-[10px] bg-green-500">New</Badge>
              </Link>
              <Link href="/" className="relative text-sm font-medium hover:text-primary whitespace-nowrap">
                Offers
                <Badge className="ml-1 h-4 px-1 text-[10px]" variant="destructive">
                  Hot
                </Badge>
              </Link>
              <Link href="/contact" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                Contact Us
              </Link>
            </div>
            <div className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
              Cash on Delivery Available
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
