import mongoose from "mongoose"
import dotenv from "dotenv"
import VendorUser from "../models/VendorUser.js"
import Vendor from "../models/Vendor.js"
import connectDB from "../config/database.js"

dotenv.config()

const linkVendorUser = async () => {
  try {
    await connectDB()
    console.log("✅ Connected to database")

    const mobile = "7995524585"
    const fullMobile = `91${mobile}`

    // Find vendor user
    const vendorUser = await VendorUser.findOne({ mobile: fullMobile })
    if (!vendorUser) {
      console.log(`❌ Vendor user not found for mobile: ${fullMobile}`)
      return
    }

    console.log(`📱 Found vendor user: ${vendorUser._id}`)
    console.log(`   Mobile: ${vendorUser.mobile}`)
    console.log(`   Current vendorId: ${vendorUser.vendorId}`)

    // Find vendor by phone (try multiple formats)
    const phoneVariations = [
      mobile, // 7995524585
      fullMobile, // 917995524585
      `+${fullMobile}`, // +917995524585
      `+91${mobile}`, // +917995524585
    ]

    let vendor = null
    for (const phone of phoneVariations) {
      vendor = await Vendor.findOne({
        $or: [
          { phone: phone },
          { phone: { $regex: phone.slice(-10) } },
        ],
      })
      if (vendor) {
        console.log(`✅ Found vendor with phone format: ${phone}`)
        break
      }
    }

    // Also try searching by last 10 digits
    if (!vendor) {
      vendor = await Vendor.findOne({
        phone: { $regex: mobile },
      })
    }

    if (!vendor) {
      console.log(`❌ Vendor not found for phone: ${mobile}`)
      console.log("   Searching all vendors...")
      const allVendors = await Vendor.find({}).select("name phone email status").limit(20)
      console.log("   Sample vendors:")
      allVendors.forEach((v) => {
        console.log(`   - ${v.name}: ${v.phone} (${v.status})`)
      })
      return
    }

    console.log(`✅ Found vendor: ${vendor._id}`)
    console.log(`   Name: ${vendor.name}`)
    console.log(`   Phone: ${vendor.phone}`)
    console.log(`   Status: ${vendor.status}`)
    console.log(`   isActive: ${vendor.isActive}`)

    // Link vendor user to vendor
    if (vendorUser.vendorId?.toString() !== vendor._id.toString()) {
      vendorUser.vendorId = vendor._id
      await vendorUser.save()
      console.log(`✅ Linked vendor user ${vendorUser._id} to vendor ${vendor._id}`)
    } else {
      console.log(`ℹ️  Vendor user is already linked to this vendor`)
    }

    // Verify the link
    const updatedUser = await VendorUser.findById(vendorUser._id).populate("vendorId")
    console.log("\n📋 Final Status:")
    console.log(`   Vendor User ID: ${updatedUser._id}`)
    console.log(`   Vendor ID: ${updatedUser.vendorId?._id || "null"}`)
    console.log(`   Vendor Name: ${updatedUser.vendorId?.name || "null"}`)
    console.log(`   Vendor Status: ${updatedUser.vendorId?.status || "null"}`)
    console.log(`   Vendor isActive: ${updatedUser.vendorId?.isActive || "null"}`)

    process.exit(0)
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

linkVendorUser()





