import cron from "node-cron"
import Order from "../models/Order.js"
import Admin from "../models/Admin.js"
import Notification from "../models/Notification.js"
import Customer from "../models/Customer.js"
import nodemailer from "nodemailer"

/**
 * Email transporter helper
 */
const getTransporter = () => {
  if (!process.env.SMTP_USER && !process.env.ADMIN_EMAIL) {
    console.warn("⚠️  [AdminReviewCron] SMTP credentials not configured. Emails will not be sent.")
    return null
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || process.env.ADMIN_EMAIL || "info@elecobuy.com",
      pass: process.env.SMTP_PASS || process.env.ADMIN_EMAIL_PASSWORD,
    },
  })

  return transporter
}

/**
 * Cron job to check for orders that haven't been accepted by any vendor within 30 minutes
 * Changes status to "Admin Review Required" and notifies admin
 */
export function startAdminReviewCron() {
  // Run every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago

      // Find orders that:
      // 1. Are in "pending" status (not yet accepted)
      // 2. Have no vendorId assigned
      // 3. Were created 30+ minutes ago
      // Note: We only look for "pending" status, so orders already in "admin_review_required" are automatically excluded
      const unacceptedOrders = await Order.find({
        status: "pending",
        vendorId: null,
        createdAt: { $lte: thirtyMinutesAgo },
      })

      if (unacceptedOrders.length === 0) {
        return // No unaccepted orders found
      }

      console.log(
        `🔔 [AdminReviewCron] Found ${unacceptedOrders.length} order(s) not accepted within 30 minutes`
      )

      for (const order of unacceptedOrders) {
        // Skip orders already escalated to admin review, in case of overlap
        if (order.status === "admin_review_required") {
          console.log(
            `ℹ️ [AdminReviewCron] Skipping order ${order.orderNumber} already marked for admin review`
          )
          continue
        }

        try {
          // Change status to "Admin Review Required"
          order.status = "admin_review_required"
          await order.save()

          console.log(
            `✅ [AdminReviewCron] Order ${order.orderNumber} marked for admin review`
          )

          // Get customer details for notification
          const customer = await Customer.findById(order.customerId).select("name mobile email")

          // Get admin for notification
          const admin = await Admin.findOne({ isActive: true })

          if (admin) {
            // Create in-app notification for admin
            await Notification.create({
              userId: admin._id,
              userType: "admin",
              type: "admin_review_required",
              title: "Order Requires Admin Review",
              message: `Order ${order.orderNumber} (₹${order.total.toLocaleString("en-IN")}) was not accepted by any vendor within 30 minutes. Please review and take action.`,
              orderId: order._id,
              orderNumber: order.orderNumber,
              customerId: order.customerId,
            })

            console.log(
              `✅ [AdminReviewCron] Admin notification created for order ${order.orderNumber}`
            )
          }

          // Send email to info@elecobuy.com
          try {
            const transporter = getTransporter()
            if (transporter) {
              const adminEmail = process.env.ADMIN_EMAIL || "info@elecobuy.com"
              
              const mailOptions = {
                from: process.env.SMTP_USER || adminEmail,
                to: adminEmail,
                subject: `[URGENT] Order ${order.orderNumber} Requires Admin Review`,
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <style>
                      body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                      }
                      .header {
                        background-color: #f44336;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                      }
                      .content {
                        background-color: #f9f9f9;
                        padding: 20px;
                        border: 1px solid #ddd;
                        border-top: none;
                      }
                      .order-info {
                        background-color: white;
                        padding: 15px;
                        margin: 15px 0;
                        border-radius: 5px;
                        border-left: 4px solid #f44336;
                      }
                      .field {
                        margin: 10px 0;
                      }
                      .label {
                        font-weight: bold;
                        color: #666;
                      }
                      .value {
                        color: #333;
                        margin-top: 5px;
                      }
                      .actions {
                        background-color: #fff3cd;
                        padding: 15px;
                        margin: 15px 0;
                        border-radius: 5px;
                        border-left: 4px solid #ffc107;
                      }
                      .actions h3 {
                        margin-top: 0;
                        color: #856404;
                      }
                      .actions ul {
                        margin: 10px 0;
                        padding-left: 20px;
                      }
                      .footer {
                        text-align: center;
                        color: #666;
                        font-size: 12px;
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <h2>⚠️ Order Requires Admin Review</h2>
                    </div>
                    <div class="content">
                      <p>An order was not accepted by any vendor within 30 minutes and requires your attention.</p>
                      
                      <div class="order-info">
                        <div class="field">
                          <div class="label">Order Number:</div>
                          <div class="value">${order.orderNumber}</div>
                        </div>
                        <div class="field">
                          <div class="label">Order Total:</div>
                          <div class="value">₹${order.total.toLocaleString("en-IN")}</div>
                        </div>
                        <div class="field">
                          <div class="label">Customer:</div>
                          <div class="value">${customer?.name || "N/A"} (${customer?.mobile || "N/A"})</div>
                        </div>
                        <div class="field">
                          <div class="label">Customer Email:</div>
                          <div class="value">${customer?.email || "N/A"}</div>
                        </div>
                        <div class="field">
                          <div class="label">Items:</div>
                          <div class="value">
                            ${order.items.map(item => `${item.name} (Qty: ${item.quantity})`).join("<br>")}
                          </div>
                        </div>
                        <div class="field">
                          <div class="label">Order Created:</div>
                          <div class="value">${new Date(order.createdAt).toLocaleString("en-IN")}</div>
                        </div>
                      </div>

                      <div class="actions">
                        <h3>Required Actions:</h3>
                        <p>Please review this order and take one of the following actions:</p>
                        <ul>
                          <li><strong>Cancel Order:</strong> If the order cannot be fulfilled</li>
                          <li><strong>Call Sellers Manually:</strong> Contact vendors directly to find a match</li>
                          <li><strong>Assign Vendor:</strong> Manually assign the order to a specific vendor</li>
                          <li><strong>Inform Buyer:</strong> Contact the customer about the delay</li>
                        </ul>
                      </div>

                      <p>Please log into the admin panel to review and take action on this order.</p>
                    </div>
                    <div class="footer">
                      <p>This is an automated notification from Elecobuy Order Management System.</p>
                      <p>Order ID: ${order._id}</p>
                    </div>
                  </body>
                  </html>
                `,
              }

              await transporter.sendMail(mailOptions)
              console.log(
                `✅ [AdminReviewCron] Email sent to ${adminEmail} for order ${order.orderNumber}`
              )
            } else {
              console.warn(
                `⚠️ [AdminReviewCron] Email not sent for order ${order.orderNumber} - SMTP not configured`
              )
            }
          } catch (emailError) {
            console.error(
              `❌ [AdminReviewCron] Error sending email for order ${order.orderNumber}:`,
              emailError
            )
            // Don't fail the process if email fails
          }
        } catch (orderError) {
          console.error(
            `❌ [AdminReviewCron] Error processing order ${order.orderNumber}:`,
            orderError
          )
        }
      }

      console.log(
        `✅ [AdminReviewCron] Completed processing ${unacceptedOrders.length} order(s)`
      )
    } catch (error) {
      console.error("❌ [AdminReviewCron] Error in cron job:", error)
    }
  })

  console.log("✅ [AdminReviewCron] Cron job started - checking every 30 minutes for unaccepted orders (30 min threshold)")
}

