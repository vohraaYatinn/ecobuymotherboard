import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { OrderDetailContent } from "@/components/order-detail-content"

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="min-h-screen">
      <Header />
      <OrderDetailContent orderId={id} />
      <Footer />
    </div>
  )
}
