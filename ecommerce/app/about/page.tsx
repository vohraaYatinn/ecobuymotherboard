import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Building2, Users, Award, Globe } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-6">About EcoBuy</h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-muted-foreground mb-8">
              EcoBuy is a leading supplier of high-quality television PCB boards, motherboards, and electronic
              components. With years of experience in the electronics industry, we are committed to providing reliable,
              eco-friendly solutions for businesses and individuals worldwide.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Our Mission</h3>
                  <p className="text-muted-foreground">
                    To provide sustainable, high-quality electronic components while minimizing environmental impact.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Our Team</h3>
                  <p className="text-muted-foreground">
                    Expert professionals dedicated to delivering exceptional service and technical support.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Quality Assurance</h3>
                  <p className="text-muted-foreground">
                    All products undergo rigorous testing to meet international quality standards.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Global Reach</h3>
                  <p className="text-muted-foreground">
                    Serving customers worldwide with fast shipping and reliable delivery.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-12 mb-4">Why Choose EcoBuy?</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Extensive inventory of PCB boards and motherboards for all major TV brands</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Competitive pricing with bulk order discounts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Fast and secure worldwide shipping</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Expert technical support and customer service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Eco-friendly practices and sustainable sourcing</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
