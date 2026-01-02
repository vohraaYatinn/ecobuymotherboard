import { Suspense } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { OrderConfirmationContent } from "@/components/order-confirmation-content"

export async function generateStaticParams() {
  // Return placeholder param for static export
  // Actual routing works via client-side navigation in mobile app
  return [{ id: 'placeholder' }]
}

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="min-h-screen">
      <Header />
      <Suspense fallback={<div className="container mx-auto px-4 py-16">Loading...</div>}>
        <OrderConfirmationContent orderId={id} />
      </Suspense>
      <Footer />
    </div>
  )
}

