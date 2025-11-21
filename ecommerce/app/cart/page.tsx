import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CartContent } from "@/components/cart-content"

export default function CartPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <CartContent />
      <Footer />
    </div>
  )
}
