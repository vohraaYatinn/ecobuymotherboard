import mongoose from "mongoose"
import dotenv from "dotenv"
import Admin from "../models/Admin.js"
import connectDB from "../config/database.js"

dotenv.config()

const seedAdmin = async () => {
  try {
    // Connect to database
    await connectDB()

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: "admin@login.com" })

    if (existingAdmin) {
      console.log("Admin user already exists!")
      process.exit(0)
    }

    // Create admin user
    const admin = new Admin({
      email: "admin@login.com",
      password: "admin123",
      role: "admin",
      isActive: true
    })

    await admin.save()

    console.log("Admin user created successfully!")
    console.log("Email: admin@login.com")
    console.log("Password: admin123")
    process.exit(0)
  } catch (error) {
    console.error("Error seeding admin:", error)
    process.exit(1)
  }
}

seedAdmin()




