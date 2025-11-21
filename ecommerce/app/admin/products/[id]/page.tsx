import { AdminProductView } from "@/components/admin/admin-product-view"

export default function AdminProductViewPage({ params }: { params: { id: string } }) {
  return <AdminProductView productId={params.id} />
}
