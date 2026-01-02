import { AdminVendorDetail } from "@/components/admin/admin-vendor-detail"

export async function generateStaticParams() {
  // Return placeholder param for static export
  // Actual routing works via client-side navigation in mobile app
  return [{ id: 'placeholder' }]
}

export default async function AdminVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminVendorDetail vendorId={id} />
}
