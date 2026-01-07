import express from "express"
import PageContent from "../models/PageContent.js"
import { verifyAdminToken } from "../middleware/auth.js"

const router = express.Router()

// Default page content templates
const defaultPageContent = {
  "terms-and-conditions": {
    title: "Terms and Conditions",
    description: "Terms and conditions for using Elecobuy services",
    sections: [
      {
        heading: "1. Introduction",
        content: "Welcome to Elecobuy. These terms and conditions outline the rules and regulations for the use of Elecobuy's website and services. By accessing this website, we assume you accept these terms and conditions in full.",
        order: 1,
      },
      {
        heading: "2. Products and Services",
        content: "Elecobuy provides electronic components including but not limited to television PCB boards, motherboards, and related components. We reserve the right to modify or discontinue products without notice, limit quantities available for purchase, and refuse service to anyone for any reason.",
        order: 2,
      },
      {
        heading: "3. Pricing and Payment",
        content: "All prices are listed in Indian Rupees (INR) and are subject to change without notice. Payment must be made at the time of order placement. We accept various payment methods including credit cards, debit cards, and net banking. Cash on Delivery is available for eligible orders. All transactions are secure and encrypted.",
        order: 3,
      },
      {
        heading: "4. Intellectual Property",
        content: "All content on this website, including text, images, logos, and designs, is the property of Elecobuy and protected by copyright laws. Unauthorized use of any content is strictly prohibited.",
        order: 4,
      },
      {
        heading: "5. Limitation of Liability",
        content: "Elecobuy shall not be liable for any indirect, incidental, special, or consequential damages arising from the use or inability to use our products or services. Our total liability shall not exceed the amount paid for the product in question.",
        order: 5,
      },
      {
        heading: "6. Governing Law",
        content: "These terms and conditions are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.",
        order: 6,
      },
      {
        heading: "7. Contact Information",
        content: "For questions about these terms and conditions, please contact us at SUPPORT@ELECOBUY.COM or call 1800 123 9336.",
        order: 7,
      },
    ],
  },
  "shipping-policy": {
    title: "Shipping Policy",
    description: "Shipping policy for Elecobuy orders",
    sections: [
      {
        heading: "1. Shipping Coverage",
        content: "We ship to all major cities and towns across India. For remote areas, delivery may take additional time. International shipping is available to select countries.",
        order: 1,
      },
      {
        heading: "2. Delivery Timeline",
        content: "Standard delivery takes 5-7 business days for metro cities and 7-10 business days for other areas. Express delivery (2-3 business days) is available at additional cost for select pin codes.",
        order: 2,
      },
      {
        heading: "3. Shipping Charges",
        content: "Free shipping is available for orders above ₹999. For orders below ₹999, a flat shipping charge of ₹49 applies. Express delivery charges vary based on location and package weight.",
        order: 3,
      },
      {
        heading: "4. Order Tracking",
        content: "Once your order is shipped, you will receive a tracking number via SMS and email. You can track your order status through our website or the courier partner's website.",
        order: 4,
      },
      {
        heading: "5. Delivery Attempts",
        content: "Our courier partners will attempt delivery up to 3 times. If all attempts fail, the package will be returned to our warehouse and a refund will be initiated after deducting shipping charges.",
        order: 5,
      },
      {
        heading: "6. Delays and Force Majeure",
        content: "Elecobuy is not responsible for delays caused by natural disasters, strikes, customs clearance, or other circumstances beyond our control. We will communicate any significant delays via email.",
        order: 6,
      },
    ],
  },
  "privacy-policy": {
    title: "Privacy Policy",
    description: "Privacy policy for Elecobuy customers",
    sections: [
      {
        heading: "1. Information We Collect",
        content: "We collect personal information including name, email address, phone number, shipping address, and payment details when you make a purchase. We also collect browsing data through cookies to improve your shopping experience.",
        order: 1,
      },
      {
        heading: "2. How We Use Your Information",
        content: "Your information is used to process orders, provide customer support, send order updates, and improve our services. We may also use it to send promotional offers with your consent.",
        order: 2,
      },
      {
        heading: "3. Data Security",
        content: "We implement industry-standard security measures to protect your personal information. All payment transactions are encrypted using SSL technology. We do not store credit card details on our servers.",
        order: 3,
      },
      {
        heading: "4. Information Sharing",
        content: "We do not sell or rent your personal information to third parties. We may share data with trusted partners for order fulfillment, payment processing, and delivery services only.",
        order: 4,
      },
      {
        heading: "5. Cookies",
        content: "We use cookies to remember your preferences, analyze site traffic, and personalize content. You can disable cookies in your browser settings, though some features may not work properly.",
        order: 5,
      },
      {
        heading: "6. Your Rights",
        content: "You have the right to access, update, or delete your personal information. You can also opt out of marketing communications at any time. Contact us at privacy@ecobuy.com for any privacy-related requests.",
        order: 6,
      },
      {
        heading: "7. Policy Updates",
        content: "We may update this privacy policy from time to time. Any changes will be posted on this page with an updated revision date. Continued use of our services constitutes acceptance of the updated policy.",
        order: 7,
      },
    ],
  },
  "return-policy": {
    title: "Return Policy",
    description: "Return and refund policy for Elecobuy products",
    sections: [
      {
        heading: "1. Return Window",
        content: "Products can be returned within 7 days of delivery for a full refund. After 7 days and up to 30 days, products are eligible for exchange only. Returns are not accepted after 30 days.",
        order: 1,
      },
      {
        heading: "2. Eligibility Conditions",
        content: "Products must be unused, in original packaging, and with all tags and accessories intact. Products that have been installed, damaged by customer, or show signs of use are not eligible for return.",
        order: 2,
      },
      {
        heading: "3. Non-Returnable Items",
        content: "Certain items are non-returnable including customized products, software downloads, and products marked as non-returnable on the product page. Damaged or defective items are always eligible for return.",
        order: 3,
      },
      {
        heading: "4. Return Process",
        content: "To initiate a return, log in to your account and go to Order History. Select the order and click 'Request Return'. Our team will verify the request and arrange pickup within 2-3 business days.",
        order: 4,
      },
      {
        heading: "5. Refund Timeline",
        content: "Refunds are processed within 7-10 business days after we receive and inspect the returned product. Refunds will be credited to the original payment method. COD orders will receive bank transfer refunds.",
        order: 5,
      },
      {
        heading: "6. Defective Products",
        content: "If you receive a defective or damaged product, please report it within 48 hours of delivery with photos. We will arrange a free return pickup and provide a full refund or replacement.",
        order: 6,
      },
      {
        heading: "7. Warranty Claims",
        content: "For products under warranty, please contact our support team with your order number and issue description. Warranty claims are handled separately from returns and may require additional verification.",
        order: 7,
      },
    ],
  },
}

// Get page content by slug (public endpoint)
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params
    
    let page = await PageContent.findOne({ slug, isActive: true })
      .select("-__v")
    
    // If page doesn't exist, return default content
    if (!page && defaultPageContent[slug]) {
      return res.json({
        success: true,
        data: {
          slug,
          ...defaultPageContent[slug],
          isDefault: true,
        },
      })
    }
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      })
    }

    res.json({
      success: true,
      data: page,
    })
  } catch (error) {
    console.error("Error fetching page content:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching page content",
    })
  }
})

// Get all page contents (admin only)
router.get("/admin/all", verifyAdminToken, async (req, res) => {
  try {
    const pages = await PageContent.find()
      .populate("lastUpdatedBy", "name email")
      .sort({ slug: 1 })
      .select("-__v")

    // Merge with default content for pages that don't exist yet
    const allSlugs = ["terms-and-conditions", "shipping-policy", "privacy-policy", "return-policy"]
    const result = allSlugs.map(slug => {
      const existingPage = pages.find(p => p.slug === slug)
      if (existingPage) {
        return existingPage
      }
      return {
        slug,
        ...defaultPageContent[slug],
        isDefault: true,
        isActive: true,
      }
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error fetching all page contents:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching page contents",
    })
  }
})

// Get single page for admin (including inactive)
router.get("/admin/:slug", verifyAdminToken, async (req, res) => {
  try {
    const { slug } = req.params
    
    let page = await PageContent.findOne({ slug })
      .populate("lastUpdatedBy", "name email")
      .select("-__v")
    
    // If page doesn't exist, return default content
    if (!page && defaultPageContent[slug]) {
      return res.json({
        success: true,
        data: {
          slug,
          ...defaultPageContent[slug],
          isDefault: true,
          isActive: true,
        },
      })
    }
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      })
    }

    res.json({
      success: true,
      data: page,
    })
  } catch (error) {
    console.error("Error fetching page content:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching page content",
    })
  }
})

// Create or update page content (admin only)
router.put("/:slug", verifyAdminToken, async (req, res) => {
  try {
    const { slug } = req.params
    const { title, description, sections, isActive } = req.body

    // Validate slug
    const validSlugs = ["terms-and-conditions", "shipping-policy", "privacy-policy", "return-policy"]
    if (!validSlugs.includes(slug)) {
      return res.status(400).json({
        success: false,
        message: "Invalid page slug",
      })
    }

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      })
    }

    // Validate sections
    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one section is required",
      })
    }

    for (const section of sections) {
      if (!section.heading || !section.content) {
        return res.status(400).json({
          success: false,
          message: "Each section must have a heading and content",
        })
      }
    }

    // Sort sections by order
    const sortedSections = sections.sort((a, b) => (a.order || 0) - (b.order || 0))

    // Update or create
    const page = await PageContent.findOneAndUpdate(
      { slug },
      {
        slug,
        title,
        description: description || "",
        sections: sortedSections,
        isActive: isActive !== undefined ? isActive : true,
        lastUpdatedBy: req.admin._id,
      },
      { new: true, upsert: true }
    )
      .populate("lastUpdatedBy", "name email")
      .select("-__v")

    res.json({
      success: true,
      message: "Page content updated successfully",
      data: page,
    })
  } catch (error) {
    console.error("Error updating page content:", error)
    res.status(500).json({
      success: false,
      message: "Error updating page content",
    })
  }
})

// Reset page to default content (admin only)
router.post("/:slug/reset", verifyAdminToken, async (req, res) => {
  try {
    const { slug } = req.params

    if (!defaultPageContent[slug]) {
      return res.status(404).json({
        success: false,
        message: "Default content not available for this page",
      })
    }

    // Delete existing page content
    await PageContent.findOneAndDelete({ slug })

    res.json({
      success: true,
      message: "Page reset to default content",
      data: {
        slug,
        ...defaultPageContent[slug],
        isDefault: true,
        isActive: true,
      },
    })
  } catch (error) {
    console.error("Error resetting page content:", error)
    res.status(500).json({
      success: false,
      message: "Error resetting page content",
    })
  }
})

export default router

































