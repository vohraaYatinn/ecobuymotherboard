import { AdminProductEdit } from "@/components/admin/admin-product-edit"

export default function AdminProductEditPage({ params }: { params: { id: string } }) {
  return <AdminProductEdit productId={params.id} />
}
