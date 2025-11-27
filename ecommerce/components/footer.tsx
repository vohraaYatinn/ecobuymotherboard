"use client"

import Link from "next/link"
import Image from "next/image"
import { Phone, Headphones, ArrowUp, Facebook, Instagram, Linkedin, Youtube } from "lucide-react"
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
              <a href="#" className="h-8 w-8 flex items-center justify-center rounded bg-blue-600 hover:bg-blue-700 transition-colors">
                <Facebook className="h-4 w-4 text-white" />
              </a>
              <a href="#" className="h-8 w-8 flex items-center justify-center rounded bg-green-500 hover:bg-green-600 transition-colors">
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </a>
              <a href="#" className="h-8 w-8 flex items-center justify-center rounded bg-blue-800 hover:bg-blue-900 transition-colors">
                <Linkedin className="h-4 w-4 text-white" />
              </a>
              <a href="#" className="h-8 w-8 flex items-center justify-center rounded bg-black hover:bg-gray-800 transition-colors">
                <Instagram className="h-4 w-4 text-white" />
              </a>
              <a href="#" className="h-8 w-8 flex items-center justify-center rounded bg-red-600 hover:bg-red-700 transition-colors">
                <Youtube className="h-4 w-4 text-white" />
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
                  Return Policy
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
      <div className="bg-secondary/80 border-t border-border py-3">
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
