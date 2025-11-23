import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MapPin, Clock, Phone, Mail } from "lucide-react"

export default function StoreLocationPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-6xl mx-auto">
          {/* <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Store Location</h1>
            <p className="text-lg text-muted-foreground">Visit our physical store or contact us for inquiries</p>
          </div> */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Map Placeholder */}
            <div className="rounded-lg border border-border bg-muted overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <MapPin className="h-16 w-16 text-primary" />
              </div>
            </div>

            {/* Store Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-6">Visit Our Store</h2>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Address</h3>
                      <p className="text-muted-foreground">
                        123 Electronics Plaza
                        <br />
                        Tech District, Mumbai 400001
                        <br />
                        Maharashtra, India
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Business Hours</h3>
                      <p className="text-muted-foreground">
                        Monday - Friday: 9:00 AM - 7:00 PM
                        <br />
                        Saturday: 10:00 AM - 6:00 PM
                        <br />
                        Sunday: Closed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Phone</h3>
                      <p className="text-muted-foreground">
                        +91 7396 777 800
                        <br />
                        +91 7396 777 600
                        <br />
                        +91 7396 777 300
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      <p className="text-muted-foreground">customercare@ecobuy.com</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2">Getting Here</h3>
                <p className="text-sm text-muted-foreground">
                  Our store is conveniently located in the Tech District, easily accessible by public transport. Parking
                  is available on-site for customers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
