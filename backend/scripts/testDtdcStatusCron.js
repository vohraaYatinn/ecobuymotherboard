/**
 * Test script to manually run DTDC status update
 * Usage: node scripts/testDtdcStatusCron.js
 */

import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import connectDB from "../config/database.js"
import { updateDtdcStatusForShippedOrders } from "../services/dtdcStatusCron.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config()

async function main() {
  try {
    console.log("🚀 [TestScript] Starting DTDC Status Update Test Script")
    console.log("🚀 [TestScript] ========================================")
    console.log(`🚀 [TestScript] Environment: ${process.env.NODE_ENV || "development"}`)
    console.log(`🚀 [TestScript] MongoDB URI: ${process.env.MONGODB_URI ? "Set" : "Not Set"}`)
    console.log(`🚀 [TestScript] DTDC Environment: ${process.env.DTDC_ENVIRONMENT || "production"}`)
    console.log("🚀 [TestScript] ========================================\n")

    // Connect to database
    console.log("📡 [TestScript] Connecting to MongoDB...")
    await connectDB()
    console.log("✅ [TestScript] Connected to MongoDB\n")

    // Run the update function
    console.log("🔄 [TestScript] Running DTDC status update...\n")
    const result = await updateDtdcStatusForShippedOrders()

    // Display results
    console.log("\n📊 [TestScript] ========================================")
    console.log("📊 [TestScript] Test Results:")
    console.log("📊 [TestScript] ========================================")
    console.log(`📊 [TestScript] Success: ${result.success}`)
    if (result.total !== undefined) {
      console.log(`📊 [TestScript] Total Orders: ${result.total}`)
      console.log(`📊 [TestScript] Successful: ${result.successful}`)
      console.log(`📊 [TestScript] Updated: ${result.updated}`)
      console.log(`📊 [TestScript] Errors: ${result.errors}`)
      console.log(`📊 [TestScript] Duration: ${result.duration}s`)
    }
    if (result.error) {
      console.log(`📊 [TestScript] Error: ${result.error}`)
    }
    console.log("📊 [TestScript] ========================================\n")

    // Exit successfully
    process.exit(0)
  } catch (error) {
    console.error("\n❌ [TestScript] ========================================")
    console.error("❌ [TestScript] Fatal error:", error.message)
    console.error("❌ [TestScript] Stack:", error.stack)
    console.error("❌ [TestScript] ========================================\n")
    process.exit(1)
  }
}

// Run the script
main()











