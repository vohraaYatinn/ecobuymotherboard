import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { OrderDetailContent } from "@/components/order-detail-content"

export async function generateStaticParams() {
  // Return placeholder param for static export
  // Actual routing works via client-side navigation in mobile app
  return [{ id: 'placeholder' }]
}

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
