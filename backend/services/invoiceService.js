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

      // From Section (Company Address)
      const fromY = doc.y
      doc.fontSize(10).font("Helvetica-Bold").text("From", 300, fromY - 60)
      doc.font("Helvetica")
      const fromText = `${COMPANY_INFO.name}\n${COMPANY_INFO.address}\n${COMPANY_INFO.city} ${COMPANY_INFO.pincode}\n${COMPANY_INFO.state}\n${COMPANY_INFO.phone}\n${COMPANY_INFO.gstin}`
      doc.fontSize(9).text(fromText, 300, fromY - 45)

      // Invoice Details
      const invoiceY = doc.y + 30
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
      doc.text(`Payment method: ${order.paymentMethod === "cod" ? "Cash on delivery" : order.paymentMethod.toUpperCase()}`, 50, invoiceY + 48)

      // Table Header
      const tableY = invoiceY + 70
      doc.fontSize(9).font("Helvetica-Bold")
      doc.text("S.No", 50, tableY)
      doc.text("Product", 100, tableY)
      doc.text("Quantity", 350, tableY)
      doc.text("Unit price", 400, tableY)
      doc.text("Total price", 480, tableY)

      // Draw line under header
      doc.moveTo(50, tableY + 15).lineTo(550, tableY + 15).stroke()

      // Table Rows
      let currentY = tableY + 25
      order.items.forEach((item, index) => {
        doc.font("Helvetica").fontSize(9)
        doc.text(String(index + 1), 50, currentY)
        doc.text(item.name, 100, currentY, { width: 240, ellipsis: true })
        doc.text(String(item.quantity), 350, currentY)
        doc.text(`₹${item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 400, currentY)
        doc.text(`₹${(item.price * item.quantity).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 480, currentY)
        currentY += 15
      })

      // Summary Section - Match invoice format exactly
      const summaryY = currentY + 20
      const labelX = 400
      const amountX = 480
      doc.fontSize(9)
      
      // Subtotal
      doc.text("Subtotal", labelX, summaryY)
      doc.text(`₹${order.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, amountX, summaryY, { align: "right", width: 70 })
      
      // Shipping - Put amount and description together, aligned right
      doc.text("Shipping", labelX, summaryY + 12)
      const shippingAmount = `₹${order.shipping.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      // Put amount and description on same line, right-aligned
      doc.text(`${shippingAmount} via Shipping/ Handling Charges`, amountX, summaryY + 12, { align: "right", width: 150 })
      
      // GST - Match invoice format exactly (with proper spacing)
      let gstY = summaryY + 24
      if (order.cgst > 0 && order.sgst > 0) {
        // Telangana - CGST + SGST
        doc.text("CGST", labelX, gstY)
        doc.text(`₹${order.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, amountX, gstY, { align: "right", width: 70 })
        
        doc.text("SGST", labelX, gstY + 12)
        doc.text(`₹${order.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, amountX, gstY + 12, { align: "right", width: 70 })
        gstY += 12
      } else if (order.igst > 0) {
        // Inter-state - IGST
        doc.text("IGST", labelX, gstY)
        doc.text(`₹${order.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, amountX, gstY, { align: "right", width: 70 })
      }
      
      // Total
      doc.font("Helvetica-Bold").fontSize(10)
      doc.text("Total", labelX, gstY + 12)
      doc.text(`₹${order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, amountX, gstY + 12, { align: "right", width: 70 })

      // Footer
      const footerY = 750
      doc.font("Helvetica").fontSize(8).text("Thank you for your business!", { align: "center", y: footerY })

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

