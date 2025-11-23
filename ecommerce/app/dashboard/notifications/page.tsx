import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { NotificationsContent } from "@/components/notifications-content"

export default function NotificationsPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <NotificationsContent />
      <Footer />
    </div>
  )
}



