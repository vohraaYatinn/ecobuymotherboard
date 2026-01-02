import { AdminCustomerDetail } from "@/components/admin/admin-customer-detail"

export async function generateStaticParams() {
  // Return placeholder param for static export
  // Actual routing works via client-side navigation in mobile app
  return [{ id: 'placeholder' }]
}

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminCustomerDetail customerId={id} />
}
