import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { OrderConfirmationContent } from "@/components/order-confirmation-content"

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="min-h-screen">
      <Header />
      <OrderConfirmationContent orderId={id} />
      <Footer />
    </div>
  )
}

