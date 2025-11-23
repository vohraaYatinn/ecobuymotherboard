import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms and Conditions</h1>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground">
                Welcome to Elecobuy. These terms and conditions outline the rules and regulations for the use of Elecobuy's
                website and services. By accessing this website, we assume you accept these terms and conditions in
                full.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Products and Services</h2>
              <p className="text-muted-foreground mb-3">
                Elecobuy provides electronic components including but not limited to television PCB boards, motherboards,
                and related components. We reserve the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Modify or discontinue products without notice</li>
                <li>Limit quantities available for purchase</li>
                <li>Refuse service to anyone for any reason</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Pricing and Payment</h2>
              <p className="text-muted-foreground mb-3">
                All prices are listed in Indian Rupees (INR) and are subject to change without notice. Payment terms
                include:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Payment must be made at the time of order placement</li>
                <li>We accept various payment methods including credit cards, debit cards, and net banking</li>
                <li>Cash on Delivery available for eligible orders</li>
                <li>All transactions are secure and encrypted</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Shipping and Delivery</h2>
              <p className="text-muted-foreground">
                We ship products worldwide. Delivery times vary based on location. Elecobuy is not responsible for delays
                caused by customs, weather, or other factors beyond our control. Risk of loss passes to the buyer upon
                delivery.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Returns and Refunds</h2>
              <p className="text-muted-foreground mb-3">
                Returns are accepted within 30 days of delivery under the following conditions:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Products must be in original, unused condition</li>
                <li>Original packaging and documentation must be intact</li>
                <li>Customer is responsible for return shipping costs unless product is defective</li>
                <li>Refunds will be processed within 7-10 business days after receiving returned items</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Warranty</h2>
              <p className="text-muted-foreground">
                All products come with a manufacturer's warranty as specified in the product description. Elecobuy is not
                responsible for any consequential damages arising from product use. Warranty claims must be made within
                the warranty period with proof of purchase.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content on this website, including text, images, logos, and designs, is the property of Elecobuy and
                protected by copyright laws. Unauthorized use of any content is strictly prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                Elecobuy shall not be liable for any indirect, incidental, special, or consequential damages arising from
                the use or inability to use our products or services. Our total liability shall not exceed the amount
                paid for the product in question.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Privacy Policy</h2>
              <p className="text-muted-foreground">
                Your privacy is important to us. We collect and use personal information only as necessary to provide
                our services. We do not sell or share your information with third parties except as required to process
                orders and shipments.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Governing Law</h2>
              <p className="text-muted-foreground">
                These terms and conditions are governed by the laws of India. Any disputes shall be subject to the
                exclusive jurisdiction of the courts in Mumbai, Maharashtra.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Changes to Terms</h2>
              <p className="text-muted-foreground">
                Elecobuy reserves the right to modify these terms and conditions at any time. Changes will be effective
                immediately upon posting to the website. Continued use of the website constitutes acceptance of modified
                terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. Contact Information</h2>
              <p className="text-muted-foreground">
                For questions about these terms and conditions, please contact us at customercare@ecobuy.com or call +91
                7396 777 800.
              </p>
            </section>

            <p className="text-sm text-muted-foreground mt-12 pt-8 border-t border-border">
              Last Updated: November 20, 2025
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
