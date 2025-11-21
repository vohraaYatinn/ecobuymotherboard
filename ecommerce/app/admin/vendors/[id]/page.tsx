import { AdminVendorDetail } from "@/components/admin/admin-vendor-detail"

export default function AdminVendorDetailPage({ params }: { params: { id: string } }) {
  return <AdminVendorDetail vendorId={params.id} />
}
