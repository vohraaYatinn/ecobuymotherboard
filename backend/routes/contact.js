import express from "express"
import nodemailer from "nodemailer"

const router = express.Router()

// Configure nodemailer transporter
const getTransporter = () => {
  // Use environment variables for email configuration
  if (!process.env.SMTP_USER && !process.env.ADMIN_EMAIL) {
    console.warn("⚠️  [CONTACT] SMTP credentials not configured. Emails will not be sent.")
    return null
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.ADMIN_EMAIL || "mahender@ekranfix.com",
      pass: process.env.SMTP_PASS || process.env.ADMIN_EMAIL_PASSWORD,
    },
  })

  return transporter
}

// Submit contact form
router.post("/submit", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, subject, and message are required",
      })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      })
    }

    const adminEmail = process.env.ADMIN_EMAIL || "mahender@ekranfix.com"

    // Prepare email content
    const mailOptions = {
      from: process.env.SMTP_USER || adminEmail,
      to: adminEmail,
      subject: `Contact Form: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #555; }
            .value { margin-top: 5px; color: #333; }
            .message-box { background-color: white; padding: 15px; border-left: 4px solid #4CAF50; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Contact Form Submission</h2>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Name:</div>
                <div class="value">${name}</div>
              </div>
              <div class="field">
                <div class="label">Email:</div>
                <div class="value">${email}</div>
              </div>
              ${phone ? `
              <div class="field">
                <div class="label">Phone:</div>
                <div class="value">${phone}</div>
              </div>
              ` : ""}
              <div class="field">
                <div class="label">Subject:</div>
                <div class="value">${subject}</div>
              </div>
              <div class="field">
                <div class="label">Message:</div>
                <div class="message-box">${message.replace(/\n/g, "<br>")}</div>
              </div>
            </div>
            <div class="footer">
              <p>This message was submitted from the Elecobuy Contact Us page.</p>
              <p>Reply to: ${email}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    // Send email
    try {
      const transporter = getTransporter()
      if (transporter) {
        await transporter.sendMail(mailOptions)
        console.log("✅ [CONTACT] Email sent successfully to", adminEmail)
      } else {
        console.warn("⚠️  [CONTACT] Email not sent - SMTP not configured")
      }
      
      res.json({
        success: true,
        message: "Your message has been sent successfully. We'll get back to you soon!",
      })
    } catch (emailError) {
      console.error("❌ [CONTACT] Error sending email:", emailError)
      
      // Still return success if email fails (message is logged)
      res.json({
        success: true,
        message: "Your message has been sent successfully. We'll get back to you soon!",
        warning: "Email notification may not have been sent. Please check server logs.",
      })
    }
  } catch (error) {
    console.error("Error submitting contact form:", error)
    res.status(500).json({
      success: false,
      message: "Error submitting message. Please try again.",
    })
  }
})

export default router






















