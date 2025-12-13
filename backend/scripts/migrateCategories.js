import mongoose from "mongoose"
import dotenv from "dotenv"
import connectDB from "../config/database.js"
import Product from "../models/Product.js"
import Category from "../models/Category.js"

dotenv.config()

// Category mapping from old enum values to new category data
const categoryMapping = [
  {
    slug: "tv-inverter",
    name: "Television Inverter Boards",
    description: "TV inverter boards for various television models",
  },
  {
    slug: "tv-motherboard",
    name: "Television Motherboard",
    description: "TV motherboards for various television models",
  },
  {
    slug: "tv-pcb",
    name: "Television PCB Board",
    description: "TV PCB boards for various television models",
  },
  {
    slug: "power-supply",
    name: "Power Supply Boards",
    description: "Power supply boards for various television models",
  },
  {
    slug: "t-con",
    name: "T-Con Board",
    description: "T-Con boards for various television models",
  },
  {
    slug: "universal-motherboard",
    name: "Universal Motherboard",
    description: "Universal motherboards compatible with multiple TV models",
  },
]

async function migrateCategories() {
  try {
    console.log("🔄 Starting category migration...")

    // Connect to database
    await connectDB()
    console.log("✅ Connected to database")

    // Step 1: Create categories if they don't exist
    console.log("\n📦 Creating categories...")
    const createdCategories = {}

    for (const catData of categoryMapping) {
      let category = await Category.findOne({ slug: catData.slug })

      if (!category) {
        category = new Category({
          name: catData.name,
          slug: catData.slug,
          description: catData.description,
          isActive: true,
        })
        await category.save()
        console.log(`  ✅ Created category: ${catData.name} (${catData.slug})`)
      } else {
        console.log(`  ℹ️  Category already exists: ${catData.name} (${catData.slug})`)
      }

      createdCategories[catData.slug] = category._id
    }

    // Step 2: Update products to use category ObjectIds
    console.log("\n🔄 Updating products...")

    // Get all products with string categories
    const products = await Product.find({
      category: { $type: "string" },
    })

    console.log(`  Found ${products.length} products to migrate`)

    let updated = 0
    let failed = 0

    for (const product of products) {
      try {
        const oldCategory = product.category

        // Check if category exists in mapping
        if (createdCategories[oldCategory]) {
          product.category = createdCategories[oldCategory]
          await product.save()
          updated++
          console.log(`  ✅ Updated product ${product.sku}: ${oldCategory} → ${createdCategories[oldCategory]}`)
        } else {
          console.log(`  ⚠️  Product ${product.sku} has unknown category: ${oldCategory}`)
          failed++
        }
      } catch (error) {
        console.error(`  ❌ Error updating product ${product.sku}:`, error.message)
        failed++
      }
    }

    console.log("\n📊 Migration Summary:")
    console.log(`  ✅ Updated: ${updated}`)
    console.log(`  ❌ Failed: ${failed}`)
    console.log(`  📦 Total categories: ${Object.keys(createdCategories).length}`)

    console.log("\n✅ Migration completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Migration error:", error)
    process.exit(1)
  }
}

// Run migration
migrateCategories()












