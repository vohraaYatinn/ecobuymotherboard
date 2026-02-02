import PDFDocument from "pdfkit"
import Order from "../models/Order.js"
import Customer from "../models/Customer.js"
import CustomerAddress from "../models/CustomerAddress.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

// Company information (can be moved to environment variables or database)
const COMPANY_INFO = {
  name: "Elecobuy",
  legalName: "Ekran Fix Private Limited",
  address: "H N O 3-122/6, Chengicherla Road, Besides Growel Feed Supplements and Mineral Mixtures, Boudha Nagar, Hyderabad, Medchal Malkajgiri, Telangana, 500098",
  city: "Hyderabad",
  state: "Telangana",
  pincode: "500098",
  phone: "86399 79558",
  gstin: "36AAHCE5719J1ZD",
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ELECOBUY_LOGO_PATH = path.resolve(__dirname, "../../ecommerce/public/logo.png")

/**
 * Generate invoice PDF for an order
 * @param {Object} order - Order document with populated fields
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateInvoicePDF(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 60, size: "A4" })
      const buffers = []

      doc.on("data", buffers.push.bind(buffers))
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on("error", reject)

      // Header
      doc.fontSize(20).font("Helvetica-Bold").text("INVOICE", { align: "center" })
      doc.moveDown(0.8)

      // Company Logo (fallback to text if logo missing/unreadable)
      const logoY = doc.y
      const logoWidth = 200
      let logoRendered = false
      try {
        if (fs.existsSync(ELECOBUY_LOGO_PATH)) {
          const img = doc.openImage(ELECOBUY_LOGO_PATH)
          const ratio = logoWidth / img.width
          const logoHeight = img.height * ratio
          const logoX = (doc.page.width - logoWidth) / 2
          doc.image(img, logoX, logoY, { width: logoWidth })
          doc.y = logoY + logoHeight + 6
          logoRendered = true
        }
      } catch (e) {
        // ignore and fallback to text below
      }

      if (!logoRendered) {
        doc.fontSize(16).font("Helvetica-Bold").text(COMPANY_INFO.name.toUpperCase(), { align: "center" })
      }
      doc.moveDown(1)

      // Calculate positions with proper spacing
      const billToY = doc.y
      const customerName = order.customerId?.name || "Customer"
      const customerEmail = order.customerId?.email || ""
      const customerPhone = order.customerId?.mobile || ""
      
      // Address column widths for proper wrapping
      const leftColumnWidth = 250 // Width for Bill To and Ship To sections
      const rightColumnX = 350 // X position for From section
      const rightColumnWidth = 185 // Width for From section (535 - 350 = 185)
      
      // Bill To Section
      doc.fontSize(10).font("Helvetica-Bold").text("Bill to", 60, billToY)
      doc.font("Helvetica").fontSize(9)
      
      let billToText = customerName
      if (order.shippingAddress && typeof order.shippingAddress === "object") {
        const addr = order.shippingAddress
        const addressLine = addr.address1 + (addr.address2 ? `, ${addr.address2}` : "")
        billToText += `\n${addressLine}\n${addr.city}, ${addr.state} - ${addr.postcode}`
        if (customerEmail) billToText += `\n${customerEmail}`
        if (customerPhone) billToText += `\n${customerPhone}`
      }
      
      // Draw Bill To with wrapping and calculate actual height
      doc.y = billToY + 15
      const billToStartY = doc.y
      doc.text(billToText, 60, billToStartY, { width: leftColumnWidth, lineGap: 3 })
      const billToEndY = doc.y
      const billToHeight = billToEndY - billToY + 10

      // Ship To Section - Position after Bill To with proper spacing
      const shipToY = billToY + billToHeight + 5
      doc.fontSize(10).font("Helvetica-Bold").text("Ship to", 60, shipToY)
      doc.font("Helvetica").fontSize(9)
      
      let shipToText = customerName
      if (order.shippingAddress && typeof order.shippingAddress === "object") {
        const addr = order.shippingAddress
        const addressLine = addr.address1 + (addr.address2 ? `, ${addr.address2}` : "")
        shipToText += `\n${addressLine}\n${addr.city}, ${addr.state} - ${addr.postcode}`
      }
      
      // Draw Ship To with wrapping and calculate actual height
      doc.y = shipToY + 15
      const shipToStartY = doc.y
      doc.text(shipToText, 60, shipToStartY, { width: leftColumnWidth, lineGap: 3 })
      const shipToEndY = doc.y
      const shipToHeight = shipToEndY - shipToY + 10

      // From Section (Company Address) - Position at top right, aligned with Bill To
      const fromY = billToY
      doc.fontSize(10).font("Helvetica-Bold").text("From", rightColumnX, fromY)
      doc.font("Helvetica").fontSize(9)
      
      // Build From text with proper line breaks
      const fromText = `${COMPANY_INFO.name}\n${COMPANY_INFO.legalName}\n${COMPANY_INFO.address}\n${COMPANY_INFO.city} ${COMPANY_INFO.pincode}\n${COMPANY_INFO.state}\n${COMPANY_INFO.phone}\n${COMPANY_INFO.gstin}`
      
      // Draw From with wrapping and calculate actual height
      doc.y = fromY + 15
      const fromStartY = doc.y
      doc.text(fromText, rightColumnX, fromStartY, { width: rightColumnWidth, lineGap: 3 })
      const fromEndY = doc.y
      const fromHeight = fromEndY - fromY + 10

      // Invoice Details - Position after the address sections with proper spacing
      // Calculate the maximum height from both columns (left: Bill To + Ship To, right: From)
      const leftColumnHeight = billToHeight + shipToHeight
      const maxAddressHeight = Math.max(leftColumnHeight, fromHeight)
      const invoiceY = billToY + maxAddressHeight + 20
      doc.fontSize(10).font("Helvetica-Bold")
      
      const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).replace(/\//g, "-")
      
      const orderDate = invoiceDate
      
      // Format invoice number with leading zeros (10 digits)
      const invoiceNo = order.invoiceNumber 
        ? String(order.invoiceNumber).padStart(10, "0")
        : order.orderNumber
      
      doc.text(`Invoice no: ${invoiceNo}`, 60, invoiceY)
      doc.text(`Invoice date: ${invoiceDate}`, 60, invoiceY + 15)
      doc.text(`Order no: ${order.orderNumber}`, 60, invoiceY + 30)
      doc.text(`Order date: ${orderDate}`, 60, invoiceY + 45)
      // Format payment method properly
      let paymentMethodText = "Cash on delivery"
      if (order.paymentMethod) {
        const pm = order.paymentMethod.toLowerCase()
        if (pm === "cod" || pm === "cash on delivery") {
          paymentMethodText = "Cash on delivery"
        } else if (pm === "online" || pm === "razorpay" || pm === "card") {
          paymentMethodText = "ONLINE"
        } else {
          paymentMethodText = order.paymentMethod.toUpperCase()
        }
      }
      doc.text(`Payment method: ${paymentMethodText}`, 60, invoiceY + 60)

      // Table Header - Add spacing after invoice details
      const tableY = invoiceY + 80
      doc.fontSize(9).font("Helvetica-Bold")
      doc.text("S.No", 60, tableY)
      doc.text("Product", 110, tableY)
      doc.text("Quantity", 360, tableY)
      doc.text("Unit price", 410, tableY)
      doc.text("Total price", 490, tableY)

      // Draw line under header (A4 width: 595.28, margin: 60 each side, so max width: 475.28)
      doc.moveTo(60, tableY + 15).lineTo(535, tableY + 15).stroke()

      // Table Rows
      let currentY = tableY + 30
      order.items.forEach((item, index) => {
        doc.font("Helvetica").fontSize(9)
        const rowStartY = currentY
        
        // S.No
        doc.text(String(index + 1), 60, currentY)
        
        // Product name - allow wrapping to prevent truncation
        const productName = item.name || "Product"
        // Temporarily set Y to calculate text height
        doc.y = currentY
        const beforeY = doc.y
        // Draw product name with wrapping (this will update doc.y)
        doc.text(productName, 110, currentY, { width: 240, ellipsis: false, lineGap: 2 })
        const afterY = doc.y
        const nameHeight = Math.max(18, afterY - beforeY)
        
        // Position quantity and prices at the start of the row (top-aligned)
        doc.y = rowStartY
        doc.text(String(item.quantity), 360, rowStartY)
        doc.text(`₹${item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 410, rowStartY)
        doc.text(`₹${(item.price * item.quantity).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 490, rowStartY)
        
        // Move to next row, accounting for wrapped product name with extra spacing
        currentY = rowStartY + nameHeight + 5
        doc.y = currentY
      })

      // Summary Section - Match invoice format exactly with proper spacing
      // Check if we need a new page for the summary section
      const summaryY = currentY + 30
      const pageHeight = 841.89 // A4 height in points
      const bottomMargin = 60
      const minSpaceNeeded = 120 // Minimum space needed for summary + footer
      const estimatedSummaryEnd = summaryY + minSpaceNeeded
      
      // If summary would be cut off, add a new page
      if (estimatedSummaryEnd > pageHeight - bottomMargin) {
        doc.addPage()
        currentY = 60 // Reset to top margin
      }
      
      const finalSummaryY = currentY + 30
      const labelX = 410
      const amountX = 490
      const amountWidth = 65 // Width for amount column
      const rightMargin = 535 // Right margin position
      doc.fontSize(9)
      
      // Subtotal
      doc.text("Subtotal", labelX, finalSummaryY)
      const subtotalText = `₹${order.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      doc.text(subtotalText, amountX, finalSummaryY, { align: "right", width: amountWidth })
      
      // Shipping - Calculate proper position to align with other amounts
      const shippingY = finalSummaryY + 18
      doc.text("Shipping", labelX, shippingY)
      const shippingAmount = `₹${order.shipping.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      const shippingText = `${shippingAmount} via Shipping`
      // Calculate text width and position it to align right with other amounts
      const shippingTextWidth = doc.widthOfString(shippingText, { fontSize: 9 })
      const shippingTextX = rightMargin - shippingTextWidth
      doc.text(shippingText, shippingTextX, shippingY)
      
      // GST - Match invoice format exactly (with proper spacing)
      let gstY = finalSummaryY + 36
      if (order.cgst > 0 && order.sgst > 0) {
        // Telangana - CGST + SGST
        doc.text("CGST", labelX, gstY)
        const cgstText = `₹${order.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        doc.text(cgstText, amountX, gstY, { align: "right", width: amountWidth })
        
        doc.text("SGST", labelX, gstY + 18)
        const sgstText = `₹${order.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        doc.text(sgstText, amountX, gstY + 18, { align: "right", width: amountWidth })
        gstY += 18
      } else if (order.igst > 0) {
        // Inter-state - IGST
        doc.text("IGST", labelX, gstY)
        const igstText = `₹${order.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        doc.text(igstText, amountX, gstY, { align: "right", width: amountWidth })
      }
      
      // Total
      doc.font("Helvetica-Bold").fontSize(10)
      const totalY = gstY + 18
      doc.text("Total", labelX, totalY)
      const totalText = `₹${order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      doc.text(totalText, amountX, totalY, { align: "right", width: amountWidth })

      // Footer - Position dynamically based on content, ensure it's on the page
      // Ensure at least 40 points of space after total before footer
      const footerY = Math.max(totalY + 40, pageHeight - bottomMargin - 20)
      // Ensure footer doesn't go beyond page (A4 height: 841.89, margin: 60, so max Y: 781.89)
      const safeFooterY = Math.min(footerY, pageHeight - bottomMargin - 10)
      // Ensure footer text stays on single line with wide width to prevent wrapping
      doc.font("Helvetica").fontSize(8).text("Thank you for your business!", 60, safeFooterY, { 
        align: "center", 
        width: 475,
        lineGap: 0
      })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Get order with all required data for invoice generation
 * @param {string} orderId - Order ID
 * @param {string} userId - User ID (for customer) or null (for admin)
 * @param {boolean} isAdmin - Whether the request is from admin
 * @returns {Promise<Object>} Order with populated data
 */
export async function getOrderForInvoice(orderId, userId = null, isAdmin = false) {
  const query = { _id: orderId }
  
  // If not admin, ensure order belongs to customer
  if (!isAdmin && userId) {
    query.customerId = userId
  }

  const order = await Order.findOne(query)
    .populate("customerId", "name email mobile")
    .populate("shippingAddress")

  if (!order) {
    throw new Error("Order not found")
  }

  return order
}

