import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Mail } from "lucide-react"

export const metadata: Metadata = {
  title: "Account & Data Deletion – Elecobuy",
  description:
    "Request deletion of your Elecobuy account and associated data. Contact us to permanently remove your account and personal information.",
}

export default function AccountDeletePage() {
  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-8">
            Account & Data Deletion – Elecobuy
          </h1>

          <p className="text-lg text-muted-foreground mb-12">
            At Elecobuy, we respect your privacy and give you full control over your personal data.
            If you wish to delete your Elecobuy account and associated information, you can request
            account deletion at any time.
          </p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">How to request account deletion</h2>
              <p className="text-muted-foreground mb-4">
                To delete your Elecobuy account, please contact us using the following method:
              </p>
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Email</p>
                  <a
                    href="mailto:elecobuy@gmail.com"
                    className="text-primary hover:underline"
                  >
                    elecobuy@gmail.com
                  </a>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please include your registered phone number in the email so we can verify your
                    account.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">What happens after your request</h2>
              <p className="text-muted-foreground mb-4">
                Once your request is verified, we will permanently delete:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Your Elecobuy account</li>
                <li>Personal details such as name, phone number, and delivery address</li>
                <li>Order history and preferences</li>
                <li>Any saved information related to your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Data retention</h2>
              <p className="text-muted-foreground">
                Certain transaction or invoice records may be retained for a limited period to
                comply with legal and regulatory requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Processing time</h2>
              <p className="text-muted-foreground">
                Your request will be processed within 7 working days after verification.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Need help?</h2>
              <p className="text-muted-foreground">
                If you have any questions, please contact our support team at{" "}
                <a href="mailto:elecobuy@gmail.com" className="text-primary hover:underline">
                  elecobuy@gmail.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
