"use client"

import Link from "next/link"
import Image from "next/image"
import { Phone, Headphones, ArrowUp, Facebook, Instagram } from "lucide-react"
import { useEffect, useState } from "react"

export function Footer() {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer id="contact" className="bg-secondary relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company Info - Top Left */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center mb-3">
              <div className="bg-white rounded-md p-2">
                <Image
                  src="/logo.png"
                  alt="Elecobuy"
                  width={140}
                  height={42}
                  className="h-10 w-auto"
                />
              </div>
            </Link>
            
            <div className="flex items-center gap-2 mb-2">
              <Headphones className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Got Questions? Call us 24/7!</span>
            </div>
            <a href="tel:18001239336" className="text-lg font-bold text-secondary-foreground hover:text-primary block mb-3">
              1800 123 9336
            </a>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-secondary-foreground">Registered Office Address</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                H NO 3-122/6, Chengicherla Road, Besides Growel Feed Supplements and Mineral Mixtures, Boudha Nagar, Hyderabad, Medchal Malkajgiri, Telangana, 500098
              </p>
              <p className="text-xs text-muted-foreground mt-1">CIN: U95210TS2023PTC173156</p>
            </div>

            <div className="flex gap-2 mt-3">
              <a href="https://www.facebook.com/profile.php?id=61588390354394&ref=1" target="_blank" rel="noopener noreferrer" className="h-8 w-8 flex items-center justify-center rounded bg-blue-600 hover:bg-blue-700 transition-colors">
                <Facebook className="h-4 w-4 text-white" />
              </a>
              <a href="https://www.instagram.com/elecobuy/" target="_blank" rel="noopener noreferrer" className="h-8 w-8 flex items-center justify-center rounded bg-black hover:bg-gray-800 transition-colors">
                <Instagram className="h-4 w-4 text-white" />
              </a>
            </div>
          </div>

          {/* Group Companies - Middle Left */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-secondary-foreground">Group Companies</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-muted-foreground">Ekranfix Private Limited</span>
              </li>
              <li>
                <span className="text-muted-foreground">Sri Ganesh Solutions</span>
              </li>
            </ul>
          </div>

          {/* Customer Services - Middle Right */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-secondary-foreground">Customer Services</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-muted-foreground transition-colors hover:text-primary">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="text-muted-foreground transition-colors hover:text-primary">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-muted-foreground transition-colors hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/return-policy" className="text-muted-foreground transition-colors hover:text-primary">
                  Cancellation & Return Policy
                </Link>
              </li>
              <li>
                <Link href="/account-delete" className="text-muted-foreground transition-colors hover:text-primary">
                  Account & Data Deletion
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links - Right */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-secondary-foreground">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground transition-colors hover:text-primary">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-muted-foreground transition-colors hover:text-primary">
                  Shop
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground transition-colors hover:text-primary">
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/become-seller" className="text-muted-foreground transition-colors hover:text-primary">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link href="/learning-center" className="text-muted-foreground transition-colors hover:text-primary">
                  Learning Center
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <div className="bg-secondary/80 border-t border-border py-3" style={{
        background:"white"
      }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Ekranfix Private Limited - All Rights Reserved</p>
            <div className="flex items-center gap-3">
              <Image 
                src="/footer-payments.png" 
                alt="We accept: Discover, Mastercard, Visa, BHIM, UPI" 
                width={200} 
                height={24} 
                className="h-6 w-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full bg-secondary border border-border shadow-lg flex items-center justify-center hover:bg-secondary/90 transition-colors"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5 text-secondary-foreground" />
        </button>
      )}
    </footer>
  )
}
