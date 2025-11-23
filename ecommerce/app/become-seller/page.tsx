import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { VendorRegistrationForm } from "@/components/vendor-registration-form"
import { Store, TrendingUp, Shield, Headphones } from "lucide-react"

export default function BecomeSellerPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Become a Seller on Elecobuy</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of sellers and grow your business with India's leading electronics marketplace. Start
              selling your PCB boards and electronic components today.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <div className="text-center p-6 rounded-lg bg-muted/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mx-auto mb-4">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Easy Setup</h3>
              <p className="text-sm text-muted-foreground">Quick registration and store setup in minutes</p>
            </div>

            <div className="text-center p-6 rounded-lg bg-muted/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Grow Sales</h3>
              <p className="text-sm text-muted-foreground">Reach millions of customers nationwide</p>
            </div>

            <div className="text-center p-6 rounded-lg bg-muted/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mx-auto mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Secure Payments</h3>
              <p className="text-sm text-muted-foreground">Safe and timely payment settlements</p>
            </div>

            <div className="text-center p-6 rounded-lg bg-muted/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mx-auto mb-4">
                <Headphones className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">24/7 Support</h3>
              <p className="text-sm text-muted-foreground">Dedicated seller support team</p>
            </div>
          </div>

          {/* Registration Form */}
          <VendorRegistrationForm />
        </div>
      </div>

      <Footer />
    </div>
  )
}
