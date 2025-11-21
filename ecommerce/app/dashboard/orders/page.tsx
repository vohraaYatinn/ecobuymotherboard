import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { OrdersContent } from "@/components/orders-content"

export default function OrdersPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <OrdersContent />
      <Footer />
    </div>
  )
}
