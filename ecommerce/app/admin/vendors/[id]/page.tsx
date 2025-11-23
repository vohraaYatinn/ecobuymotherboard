import { AdminVendorDetail } from "@/components/admin/admin-vendor-detail"

export default async function AdminVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminVendorDetail vendorId={id} />
}
