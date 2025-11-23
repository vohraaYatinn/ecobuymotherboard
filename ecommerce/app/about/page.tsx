import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Building2, Users, Award, Globe } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 sm:mb-6">About Elecobuy</h1>

          <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none">
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
              Elecobuy is a leading supplier of high-quality television PCB boards, motherboards, and electronic
              components. With years of experience in the electronics industry, we are committed to providing reliable,
              eco-friendly solutions for businesses and individuals worldwide.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 my-8 sm:my-10 lg:my-12">
              <div className="flex gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2">Our Mission</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    To provide sustainable, high-quality electronic components while minimizing environmental impact.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2">Our Team</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Expert professionals dedicated to delivering exceptional service and technical support.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Award className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2">Quality Assurance</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    All products undergo rigorous testing to meet international quality standards.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2">Global Reach</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Serving customers worldwide with fast shipping and reliable delivery.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold mt-8 sm:mt-10 lg:mt-12 mb-3 sm:mb-4">Why Choose Elecobuy?</h2>
            <ul className="space-y-2.5 sm:space-y-3 text-sm sm:text-base text-muted-foreground">
              <li className="flex items-start gap-2 sm:gap-2.5">
                <span className="text-primary mt-0.5 sm:mt-1 text-base sm:text-lg shrink-0">✓</span>
                <span className="leading-relaxed">Extensive inventory of PCB boards and motherboards for all major TV brands</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-2.5">
                <span className="text-primary mt-0.5 sm:mt-1 text-base sm:text-lg shrink-0">✓</span>
                <span className="leading-relaxed">Competitive pricing with bulk order discounts</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-2.5">
                <span className="text-primary mt-0.5 sm:mt-1 text-base sm:text-lg shrink-0">✓</span>
                <span className="leading-relaxed">Fast and secure worldwide shipping</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-2.5">
                <span className="text-primary mt-0.5 sm:mt-1 text-base sm:text-lg shrink-0">✓</span>
                <span className="leading-relaxed">Expert technical support and customer service</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-2.5">
                <span className="text-primary mt-0.5 sm:mt-1 text-base sm:text-lg shrink-0">✓</span>
                <span className="leading-relaxed">Eco-friendly practices and sustainable sourcing</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
