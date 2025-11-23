import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CheckoutContent } from "@/components/checkout-content"

export default function CheckoutPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <CheckoutContent />
      <Footer />
    </div>
  )
}
