import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import connectDB from "./config/database.js"
import authRoutes from "./routes/auth.js"
import productRoutes from "./routes/products.js"
import uploadRoutes from "./routes/upload.js"
import vendorRoutes from "./routes/vendors.js"
import vendorAuthRoutes from "./routes/vendorAuth.js"
import vendorOrderRoutes from "./routes/vendorOrders.js"
import customerAuthRoutes from "./routes/customerAuth.js"
import cartRoutes from "./routes/cart.js"
import addressRoutes from "./routes/addresses.js"
import orderRoutes from "./routes/orders.js"
import adminOrderRoutes from "./routes/adminOrders.js"
import adminDashboardRoutes from "./routes/adminDashboard.js"
import adminCustomerRoutes from "./routes/adminCustomers.js"
import searchRoutes from "./routes/search.js"
import wishlistRoutes from "./routes/wishlist.js"
import notificationRoutes from "./routes/notifications.js"
import pushNotificationRoutes from "./routes/pushNotifications.js"
import learningResourceRoutes from "./routes/learningResources.js"
import adminReportsRoutes from "./routes/adminReports.js"
import enquiryRoutes from "./routes/enquiries.js"
import pageContentRoutes from "./routes/pageContent.js"
import contactRoutes from "./routes/contact.js"
import categoryRoutes from "./routes/categories.js"
import dtdcRoutes from "./routes/dtdc.js"
import invoiceRoutes from "./routes/invoices.js"
import supportRoutes from "./routes/support.js"
import settingsRoutes from "./routes/settings.js"
import vendorLedgerRoutes from "./routes/vendorLedger.js"
import { startOrderResetCron } from "./services/orderResetCron.js"
import { startAdminReviewCron } from "./services/adminReviewCron.js"
import { startDtdcStatusCron } from "./services/dtdcStatusCron.js"
import { startRefundCron } from "./services/refundCron.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Connect to MongoDB
connectDB()

// Middleware - CORS configuration
const BACKEND_URL = process.env.BACKEND_URL || "http://10.204.150.75:5000"
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://10.204.150.75:5000",
  "https://elecobuy.com",
  "https://www.elecobuy.com",
  "http://192.168.1.34:3000",
  "http://127.0.0.1:5000",
  process.env.FRONTEND_URL,
  process.env.BACKEND_URL
].filter(Boolean) // Remove undefined values

// Allow local network IPs in development
if (process.env.NODE_ENV !== "production") {
  // Allow any local network IP (192.168.x.x, 10.x.x.x, etc.)
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)
      
      // Allow localhost and local network IPs
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/) ||
        origin.match(/^http:\/\/10\.\d+\.\d+\.\d+:\d+$/) ||
        origin.match(/^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/) ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true)
      } else {
        callback(null, true) // Allow all in development - change this in production
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-session-id", "Accept"],
    exposedHeaders: ["Content-Type", "Authorization"]
  }))
} else {
  // Production: only allow specific origins
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else if (
        origin === "https://elecobuy.com" ||
        origin === "https://www.elecobuy.com" ||
        origin === "http://10.204.150.75:5000"
      ) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-session-id", "Accept"],
    exposedHeaders: ["Content-Type", "Authorization"]
  }))
}
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/products", productRoutes)
app.use("/api/upload", uploadRoutes)
app.use("/api/vendors", vendorRoutes)
app.use("/api/vendor-auth", vendorAuthRoutes)
app.use("/api/vendor/orders", vendorOrderRoutes)
app.use("/api/customer-auth", customerAuthRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/addresses", addressRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/admin/orders", adminOrderRoutes)
app.use("/api/admin/dashboard", adminDashboardRoutes)
app.use("/api/admin/customers", adminCustomerRoutes)
app.use("/api/search", searchRoutes)
app.use("/api/wishlist", wishlistRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/push-notifications", pushNotificationRoutes)
app.use("/api/learning-resources", learningResourceRoutes)
app.use("/api/admin/reports", adminReportsRoutes)
app.use("/api/enquiries", enquiryRoutes)
app.use("/api/page-content", pageContentRoutes)
app.use("/api/contact", contactRoutes)
app.use("/api/categories", categoryRoutes)
app.use("/api/dtdc", dtdcRoutes)
app.use("/api/invoices", invoiceRoutes)
app.use("/api/support", supportRoutes)
app.use("/api/settings", settingsRoutes)
app.use("/api/vendor-ledger", vendorLedgerRoutes)

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" })
})

// Start server - bind to 0.0.0.0 to allow network access
const HOST = process.env.HOST || "0.0.0.0"
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on http://${HOST}:${PORT}`)
  console.log(`🌐 Network access: http://192.168.1.34:${PORT}`)
  console.log(`📍 Local access: http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`)
  console.log(`CORS: Allowing requests from local network IPs`)
  
  // Start cron jobs
  startOrderResetCron()
  startAdminReviewCron()
  startDtdcStatusCron()
  startRefundCron()
})

