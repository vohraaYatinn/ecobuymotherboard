import { AdminOrderDetail } from "@/components/admin/admin-order-detail"

export async function generateStaticParams() {
  // Return placeholder param for static export
  // Actual routing works via client-side navigation in mobile app
  return [{ id: 'placeholder' }]
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminOrderDetail orderId={id} />
}
