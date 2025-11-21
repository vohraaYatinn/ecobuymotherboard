import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { OrderDetailContent } from "@/components/order-detail-content"

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen">
      <Header />
      <OrderDetailContent orderId={params.id} />
      <Footer />
    </div>
  )
}
