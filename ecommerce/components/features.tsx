import { Card, CardContent } from "@/components/ui/card"
import { Shield, Zap, Package, Headphones, Award, Leaf } from "lucide-react"

export function Features() {
  const features = [
    {
      icon: Shield,
      title: "Quality Guaranteed",
      description: "Every product undergoes rigorous quality control testing to ensure reliability and performance.",
    },
    {
      icon: Zap,
      title: "Fast Processing",
      description: "Quick order processing and same-day shipping for in-stock items to minimize downtime.",
    },
    {
      icon: Package,
      title: "Secure Packaging",
      description: "Professional ESD-safe packaging and careful handling to protect sensitive components.",
    },
    {
      icon: Headphones,
      title: "Expert Support",
      description: "24/7 technical support from our team of experienced electronics specialists.",
    },
    {
      icon: Award,
      title: "Warranty Included",
      description: "Comprehensive warranty coverage on all products with hassle-free returns.",
    },
    {
      icon: Leaf,
      title: "Eco-Friendly",
      description: "Committed to sustainable practices with recycling programs and eco-conscious operations.",
    },
  ]

  return (
    <section id="features" className="py-16 sm:py-20 lg:py-24 bg-muted/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {"Why Choose Elecobuy?"}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {"We combine quality products with exceptional service to deliver the best experience in the industry"}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="border-border bg-card transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-card-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
