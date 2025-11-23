import { AdminProductEdit } from "@/components/admin/admin-product-edit"

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminProductEdit productId={id} />
}
