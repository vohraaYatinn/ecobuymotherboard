/**
 * Test script to manually run refund processing
 * Usage: node scripts/testRefundCron.js
 */

import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import connectDB from "../config/database.js"
import { processRefundsForReturnPickedUpOrders } from "../services/refundCron.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config()

async function main() {
  try {
    console.log("🚀 [TestScript] Starting Refund Processing Test Script")
    console.log("🚀 [TestScript] ========================================")
    console.log(`🚀 [TestScript] Environment: ${process.env.NODE_ENV || "development"}`)
    console.log(`🚀 [TestScript] MongoDB URI: ${process.env.MONGODB_URI ? "Set" : "Not Set"}`)
    console.log("🚀 [TestScript] ========================================\n")

    // Connect to database
    console.log("📡 [TestScript] Connecting to MongoDB...")
    await connectDB()
    console.log("✅ [TestScript] Connected to MongoDB\n")

    // Run the refund processing
    console.log("🔄 [TestScript] Running refund processing...\n")
    const result = await processRefundsForReturnPickedUpOrders()

    // Display results
    console.log("\n📊 [TestScript] ========================================")
    console.log("📊 [TestScript] Test Results:")
    console.log("📊 [TestScript] ========================================")
    console.log(`📊 [TestScript] Success: ${result.success}`)
    if (result.total !== undefined) {
      console.log(`📊 [TestScript] Total Orders: ${result.total}`)
      console.log(`📊 [TestScript] Processed: ${result.processed}`)
      console.log(`📊 [TestScript] Successful: ${result.successful}`)
      console.log(`📊 [TestScript] Failed: ${result.failed}`)
      console.log(`📊 [TestScript] Skipped: ${result.skipped}`)
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



