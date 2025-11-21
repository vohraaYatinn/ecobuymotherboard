import { AdminOrderDetail } from "@/components/admin/admin-order-detail"

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  return <AdminOrderDetail orderId={params.id} />
}
