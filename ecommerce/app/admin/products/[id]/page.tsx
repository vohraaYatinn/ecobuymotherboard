import { AdminProductView } from "@/components/admin/admin-product-view"

export async function generateStaticParams() {
  // Return placeholder param for static export
  // Actual routing works via client-side navigation in mobile app
  return [{ id: 'placeholder' }]
}

export default async function AdminProductViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminProductView productId={id} />
}
