import nodemailer from "nodemailer"

export const getDefaultFromEmail = () => process.env.ADMIN_EMAIL || process.env.SMTP_USER || "SUPPORT@ELECOBUY.COM"

/**
 * Shared SMTP transporter helper.
 * Returns null if SMTP isn't configured (callers should treat this as "email disabled").
 */
export const getTransporter = () => {
  // If SMTP credentials are not provided, return null
  if (!process.env.SMTP_USER && !process.env.ADMIN_EMAIL) {
    return null
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.ADMIN_EMAIL || "SUPPORT@ELECOBUY.COM",
      pass: process.env.SMTP_PASS || process.env.ADMIN_EMAIL_PASSWORD,
    },
  })
}

export async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter()
  if (!transporter) return { sent: false, reason: "smtp_not_configured" }

  const from = process.env.SMTP_USER || getDefaultFromEmail()
  await transporter.sendMail({ from, to, subject, html })
  return { sent: true }
}

