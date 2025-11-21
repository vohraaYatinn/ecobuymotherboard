import { AdminCustomerDetail } from "@/components/admin/admin-customer-detail"

export default function AdminCustomerDetailPage({ params }: { params: { id: string } }) {
  return <AdminCustomerDetail customerId={params.id} />
}
