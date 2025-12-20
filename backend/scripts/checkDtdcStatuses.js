import mongoose from "mongoose"
import dotenv from "dotenv"
import connectDB from "../config/database.js"
import Order from "../models/Order.js"
import { trackConsignment, DTDC_CONFIG } from "../services/dtdcService.js"

dotenv.config()

async function main() {
  await connectDB()

  console.log(
    `DTDC environment: ${DTDC_CONFIG.environment} | Track URL: ${
      DTDC_CONFIG.environment === "staging" ? DTDC_CONFIG.staging.track : DTDC_CONFIG.production.track
    }`
  )

  // Find orders that already have an AWB
  const orders = await Order.find({
    awbNumber: { $ne: null, $exists: true },
  })
    .select("orderNumber awbNumber status")
    .lean()

  if (!orders.length) {
    console.log("No orders with AWB numbers were found.")
    await mongoose.connection.close()
    return
  }

  console.log(`Found ${orders.length} orders with AWB numbers.`)

  for (const order of orders) {
    const awb = (order.awbNumber || "").trim()
    if (!awb) {
      console.log(`\nSkipping order ${order.orderNumber} – empty AWB.`)
      continue
    }

    console.log(`\nOrder: ${order.orderNumber} | Status: ${order.status} | AWB: ${awb}`)

    try {
      const tracking = await trackConsignment(awb)

      const headerStatus = tracking?.statusText || tracking?.status || "Unknown"
      const headerDate = tracking?.statusDate || ""
      const headerTime = tracking?.statusTime || ""
      const latestEvent = Array.isArray(tracking?.trackingDetails) ? tracking.trackingDetails[0] : null

      console.log(`DTDC Status: ${headerStatus} ${headerDate} ${headerTime}`.trim())

      if (latestEvent) {
        console.log(
          `Latest Event: ${latestEvent.action || latestEvent.code || "N/A"} | ${latestEvent.origin || ""} -> ${
            latestEvent.destination || ""
          } | ${latestEvent.actionDate || ""} ${latestEvent.actionTime || ""}`.trim()
        )
      }

      if (tracking?.trackingDetails?.length) {
        console.log(`Events (${tracking.trackingDetails.length}):`)
        tracking.trackingDetails.forEach((evt, idx) => {
          console.log(
            `  ${idx + 1}. ${evt.action || evt.code || "N/A"} | ${evt.actionDate || ""} ${evt.actionTime || ""} | ${
              evt.origin || ""
            } -> ${evt.destination || ""} | ${evt.remarks || ""}`.trim()
          )
        })
      }
    } catch (err) {
      const status = err?.response?.status
      const body = err?.response?.data
      console.error(`Error fetching DTDC status for AWB ${awb}: ${err.message}`)
      if (status) console.error(`  HTTP status: ${status}`)
      if (body) console.error(`  Response body: ${JSON.stringify(body).slice(0, 800)}`)
    }
  }

  await mongoose.connection.close()
}

main()
  .then(() => {
    console.log("\nDone.")
    process.exit(0)
  })
  .catch((err) => {
    console.error("Unexpected error:", err)
    process.exit(1)
  })

