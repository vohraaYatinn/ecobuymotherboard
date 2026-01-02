import { AdminProductEdit } from "@/components/admin/admin-product-edit"

export async function generateStaticParams() {
  // Return placeholder param for static export
  // Actual routing works via client-side navigation in mobile app
  return [{ id: 'placeholder' }]
}

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminProductEdit productId={id} />
}
