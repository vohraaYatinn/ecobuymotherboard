import mongoose from "mongoose"
import dotenv from "dotenv"
import Notification from "../models/Notification.js"
import connectDB from "../config/database.js"

dotenv.config()

const cleanupAdminNotifications = async () => {
  try {
    // Connect to database
    await connectDB()

    // Define allowed notification types (return and cancelled only)
    const allowedTypes = ["order_cancelled", "return_requested", "return_accepted", "return_denied"]

    // Find all admin notifications that are NOT in the allowed types
    const filter = {
      userType: "admin",
      type: { $nin: allowedTypes }, // $nin = not in
    }

    // Count notifications to be deleted
    const countToDelete = await Notification.countDocuments(filter)
    
    if (countToDelete === 0) {
      console.log("✅ No admin notifications to clean up. All notifications are already filtered.")
      process.exit(0)
    }

    console.log(`📊 Found ${countToDelete} admin notification(s) to delete`)
    console.log(`   Allowed types: ${allowedTypes.join(", ")}`)
    console.log(`   Will delete all other notification types for admin users`)

    // Show breakdown by type before deletion
    const breakdown = await Notification.aggregate([
      { $match: filter },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    console.log("\n📋 Breakdown by notification type:")
    breakdown.forEach((item) => {
      console.log(`   - ${item._id}: ${item.count}`)
    })

    // Delete the notifications
    const result = await Notification.deleteMany(filter)

    console.log(`\n✅ Successfully deleted ${result.deletedCount} admin notification(s)`)
    console.log(`   Remaining admin notifications: Only return and cancelled types`)

    process.exit(0)
  } catch (error) {
    console.error("❌ Error cleaning up admin notifications:", error)
    process.exit(1)
  }
}

cleanupAdminNotifications()





