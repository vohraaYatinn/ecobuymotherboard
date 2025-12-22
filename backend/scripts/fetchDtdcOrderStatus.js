import mongoose from "mongoose"
import dotenv from "dotenv"
import connectDB from "../config/database.js"
import Order from "../models/Order.js"
import { trackConsignment, DTDC_CONFIG } from "../services/dtdcService.js"

dotenv.config()

/**
 * Format and display tracking information
 * Uses the transformed data structure from dtdcService.js
 */
function displayTrackingInfo(awbNumber, trackingData) {
  console.log(`\n${"=".repeat(80)}`)
  console.log(`📋 TRACKING INFORMATION FOR AWB: ${awbNumber}`)
  console.log(`=${"=".repeat(79)}`)

  if (trackingData.statusCode) {
    console.log(`\nStatus Code: ${trackingData.statusCode}`)
    console.log(`Status: ${trackingData.status}`)
  }

  console.log(`\n📦 CONSIGNMENT DETAILS:`)
  console.log(`   AWB Number: ${trackingData.awbNumber || "N/A"}`)
  console.log(`   Reference Number: ${trackingData.referenceNumber || "N/A"}`)
  console.log(`   Origin: ${trackingData.origin || "N/A"}`)
  console.log(`   Destination: ${trackingData.destination || "N/A"}`)
  console.log(`   Booked Date: ${trackingData.bookedDate || "N/A"} ${trackingData.bookedTime || ""}`)
  console.log(`   Pieces: ${trackingData.pieces || "N/A"}`)
  console.log(`   Weight: ${trackingData.weight || "N/A"} ${trackingData.weightUnit || ""}`)

  console.log(`\n🚚 CURRENT STATUS:`)
  console.log(`   Status: ${trackingData.statusText || "N/A"}`)
  console.log(`   Status Date: ${trackingData.statusDate || "N/A"}`)
  console.log(`   Status Time: ${trackingData.statusTime || "N/A"}`)
  console.log(`   Remarks: ${trackingData.remarks || "N/A"}`)
  console.log(`   No. of Attempts: ${trackingData.noOfAttempts || "N/A"}`)
  if (trackingData.rtoNumber) {
    console.log(`   RTO Number: ${trackingData.rtoNumber}`)
  }

  if (trackingData.trackingDetails && Array.isArray(trackingData.trackingDetails) && trackingData.trackingDetails.length > 0) {
    console.log(`\n📜 TRACKING HISTORY (${trackingData.trackingDetails.length} events):`)
    console.log(`   ${"-".repeat(76)}`)
    trackingData.trackingDetails.forEach((event, index) => {
      console.log(`\n   ${index + 1}. ${event.action || event.code || "N/A"}`)
      console.log(`      Code: ${event.code || "N/A"}`)
      if (event.manifestNo) {
        console.log(`      Manifest No: ${event.manifestNo}`)
      }
      console.log(`      Origin: ${event.origin || "N/A"}`)
      console.log(`      Destination: ${event.destination || "N/A"}`)
      console.log(`      Date: ${event.actionDate || "N/A"}`)
      console.log(`      Time: ${event.actionTime || "N/A"}`)
      if (event.remarks) {
        console.log(`      Remarks: ${event.remarks}`)
      }
    })
  }

  // Log raw data structure for debugging
  if (trackingData.rawData) {
    console.log(`\n📄 RAW DATA STRUCTURE:`)
    console.log(JSON.stringify(trackingData.rawData, null, 2))
  }

  console.log(`\n${"=".repeat(80)}\n`)
}

/**
 * Main function to fetch order statuses
 */
async function main() {
  try {
    // Connect to database
    await connectDB()
    console.log(`\n🔌 Connected to database`)

    // Find orders with AWB numbers
    const orders = await Order.find({
      awbNumber: { $ne: null, $exists: true },
    })
      .select("orderNumber awbNumber status createdAt")
      .lean()
      .sort({ createdAt: -1 })
      .limit(50) // Limit to 50 orders for testing

    if (!orders.length) {
      console.log("\n❌ No orders with AWB numbers found.")
      await mongoose.connection.close()
      return
    }

    console.log(`\n📊 Found ${orders.length} orders with AWB numbers`)
    console.log(`\n🔧 Using DTDC Service Configuration:`)
    console.log(`   Environment: ${DTDC_CONFIG.environment}`)
    console.log(`   Track URL: ${DTDC_CONFIG.environment === "staging" ? DTDC_CONFIG.staging.track : DTDC_CONFIG.production.track}`)
    console.log(`   Tracking Credentials: ${DTDC_CONFIG.trackingCredentials.split(":")[0]}:***`)

    // Process each order
    for (const order of orders) {
      const awb = (order.awbNumber || "").trim()
      if (!awb) {
        console.log(`\n⚠️  Skipping order ${order.orderNumber} - empty AWB`)
        continue
      }

      console.log(`\n${"#".repeat(80)}`)
      console.log(`ORDER: ${order.orderNumber} | Status: ${order.status} | AWB: ${awb}`)
      console.log(`#${"#".repeat(79)}`)

      try {
        // Use the existing trackConsignment function from dtdcService.js
        // This uses the working implementation with proper authentication
        const trackingData = await trackConsignment(awb, true)
        
        // Display the tracking information
        displayTrackingInfo(awb, trackingData)

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`\n❌ Error processing order ${order.orderNumber}:`, error.message)
        if (error.response) {
          console.error(`   HTTP Status: ${error.response.status}`)
          console.error(`   Response:`, JSON.stringify(error.response.data).substring(0, 500))
        }
      }
    }

    console.log(`\n✅ Processing complete!`)
  } catch (error) {
    console.error(`\n❌ Fatal error:`, error)
    throw error
  } finally {
    await mongoose.connection.close()
    console.log(`\n🔌 Database connection closed`)
  }
}

// Run the script
main()
  .then(() => {
    console.log("\n✨ Script completed successfully")
    process.exit(0)
  })
  .catch((err) => {
    console.error("\n💥 Script failed:", err)
    process.exit(1)
  })

