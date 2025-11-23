import { AdminProductView } from "@/components/admin/admin-product-view"

export default async function AdminProductViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminProductView productId={id} />
}
