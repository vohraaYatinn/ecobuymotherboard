import PDFDocument from "pdfkit"
import Order from "../models/Order.js"
import Customer from "../models/Customer.js"
import CustomerAddress from "../models/CustomerAddress.js"

// Company information (can be moved to environment variables or database)
const COMPANY_INFO = {
  name: "elecobuy",
  address: "H N O 3-122/6, Chengicherla Road, Besides Growel Feed Supplements and Mineral Mixtures, Boudha Nagar, Hyderabad, Medchal Malkajgiri, Telangana, 500098",
  city: "Hyderabad",
  state: "Telangana",
  pincode: "500098",
  phone: "86399 79558",
  gstin: "36AAHCE5719J1ZD",
}

/**
 * Generate invoice PDF for an order
 * @param {Object} order - Order document with populated fields
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateInvoicePDF(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" })
      const buffers = []

      doc.on("data", buffers.push.bind(buffers))
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on("error", reject)

      // Header
      doc.fontSize(20).font("Helvetica-Bold").text("INVOICE", { align: "center" })
      doc.moveDown(0.5)

      // Company Name
      doc.fontSize(16).font("Helvetica-Bold").text(COMPANY_INFO.name.toUpperCase(), { align: "center" })
      doc.moveDown(0.3)

      // Bill To Section
      const billToY = doc.y
      doc.fontSize(10).font("Helvetica-Bold").text("Bill to", 50, billToY)
      doc.font("Helvetica")
      
      const customerName = order.customerId?.name || "Customer"
      const customerEmail = order.customerId?.email || ""
      const customerPhone = order.customerId?.mobile || ""
      
      let billToText = customerName
      if (order.shippingAddress && typeof order.shippingAddress === "object") {
        const addr = order.shippingAddress
        billToText += `\n${addr.address1}`
        if (addr.address2) billToText += `, ${addr.address2}`
        billToText += `\n${addr.city}, ${addr.state} - ${addr.postcode}`
        billToText += `\n${addr.state}`
        if (customerEmail) billToText += `\n${customerEmail}`
        if (customerPhone) billToText += `\n${customerPhone}`
      }
      
      doc.fontSize(9).text(billToText, 50, billToY + 15)

      // Ship To Section
      const shipToY = doc.y
      doc.fontSize(10).font("Helvetica-Bold").text("Ship to", 50, shipToY + 20)
      doc.font("Helvetica")
      
      let shipToText = customerName
      if (order.shippingAddress && typeof order.shippingAddress === "object") {
        const addr = order.shippingAddress
        shipToText += `\n${addr.address1}`
        if (addr.address2) shipToText += `, ${addr.address2}`
        shipToText += `\n${addr.city}, ${addr.state} - ${addr.postcode}`
        shipToText += `\n${addr.state}`
      }
      
      doc.fontSize(9).text(shipToText, 50, shipToY + 35)

      // From Section (Company Address) - Position at top right, aligned with Bill To
      const fromY = billToY
      doc.fontSize(10).font("Helvetica-Bold").text("From", 300, fromY)
      doc.font("Helvetica")
      const fromText = `${COMPANY_INFO.name}\n${COMPANY_INFO.address}\n${COMPANY_INFO.city} ${COMPANY_INFO.pincode}\n${COMPANY_INFO.state}\n${COMPANY_INFO.phone}\n${COMPANY_INFO.gstin}`
      doc.fontSize(9).text(fromText, 300, fromY + 15)

      // Invoice Details - Position after the address sections
      const maxAddressHeight = Math.max(
        (billToText.split('\n').length * 12) + 15,
        (shipToText.split('\n').length * 12) + 35,
        (fromText.split('\n').length * 12) + 15
      )
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
      
      doc.text(`Invoice no: ${invoiceNo}`, 50, invoiceY)
      doc.text(`Invoice date: ${invoiceDate}`, 50, invoiceY + 12)
      doc.text(`Order no: ${order.orderNumber}`, 50, invoiceY + 24)
      doc.text(`Order date: ${orderDate}`, 50, invoiceY + 36)
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
      doc.text(`Payment method: ${paymentMethodText}`, 50, invoiceY + 48)

      // Table Header
      const tableY = invoiceY + 70
      doc.fontSize(9).font("Helvetica-Bold")
      doc.text("S.No", 50, tableY)
      doc.text("Product", 100, tableY)
      doc.text("Quantity", 350, tableY)
      doc.text("Unit price", 400, tableY)
      doc.text("Total price", 480, tableY)

      // Draw line under header (A4 width: 595.28, margin: 50 each side, so max width: 495.28)
      doc.moveTo(50, tableY + 15).lineTo(545, tableY + 15).stroke()

      // Table Rows
      let currentY = tableY + 25
      order.items.forEach((item, index) => {
        doc.font("Helvetica").fontSize(9)
        const rowStartY = currentY
        
        // S.No
        doc.text(String(index + 1), 50, currentY)
        
        // Product name - allow wrapping to prevent truncation
        const productName = item.name || "Product"
        // Temporarily set Y to calculate text height
        doc.y = currentY
        const beforeY = doc.y
        // Draw product name with wrapping (this will update doc.y)
        doc.text(productName, 100, currentY, { width: 240, ellipsis: false, lineGap: 1 })
        const afterY = doc.y
        const nameHeight = Math.max(15, afterY - beforeY)
        
        // Position quantity and prices at the start of the row (top-aligned)
        doc.y = rowStartY
        doc.text(String(item.quantity), 350, rowStartY)
        doc.text(`₹${item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 400, rowStartY)
        doc.text(`₹${(item.price * item.quantity).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 480, rowStartY)
        
        // Move to next row, accounting for wrapped product name
        currentY = rowStartY + nameHeight
        doc.y = currentY
      })

      // Summary Section - Match invoice format exactly
      const summaryY = currentY + 20
      const labelX = 400
      const amountX = 480
      const amountWidth = 65 // Width for amount column
      doc.fontSize(9)
      
      // Subtotal
      doc.text("Subtotal", labelX, summaryY)
      const subtotalText = `₹${order.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      doc.text(subtotalText, amountX, summaryY, { align: "right", width: amountWidth })
      
      // Shipping - Put amount and description together, aligned right
      doc.text("Shipping", labelX, summaryY + 12)
      const shippingAmount = `₹${order.shipping.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      const shippingText = `${shippingAmount} via Shipping/ Handling`
      // Increased width to prevent truncation, ensure full text is visible
      doc.text(shippingText, amountX, summaryY + 12, { align: "right", width: 150 })
      
      // GST - Match invoice format exactly (with proper spacing)
      let gstY = summaryY + 24
      if (order.cgst > 0 && order.sgst > 0) {
        // Telangana - CGST + SGST
        doc.text("CGST", labelX, gstY)
        const cgstText = `₹${order.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        doc.text(cgstText, amountX, gstY, { align: "right", width: amountWidth })
        
        doc.text("SGST", labelX, gstY + 12)
        const sgstText = `₹${order.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        doc.text(sgstText, amountX, gstY + 12, { align: "right", width: amountWidth })
        gstY += 12
      } else if (order.igst > 0) {
        // Inter-state - IGST
        doc.text("IGST", labelX, gstY)
        const igstText = `₹${order.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        doc.text(igstText, amountX, gstY, { align: "right", width: amountWidth })
      }
      
      // Total
      doc.font("Helvetica-Bold").fontSize(10)
      const totalY = gstY + 12
      doc.text("Total", labelX, totalY)
      const totalText = `₹${order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      doc.text(totalText, amountX, totalY, { align: "right", width: amountWidth })

      // Footer - Position dynamically based on content, ensure it's on the page
      const footerY = Math.max(totalY + 30, 750)
      // Ensure footer doesn't go beyond page (A4 height: 841.89, margin: 50, so max Y: 791.89)
      const safeFooterY = Math.min(footerY, 791)
      doc.font("Helvetica").fontSize(8).text("Thank you for your business!", { align: "center", y: safeFooterY })

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

