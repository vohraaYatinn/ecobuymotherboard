import mongoose from "mongoose"
import dotenv from "dotenv"
import connectDB from "../config/database.js"

dotenv.config()

const fixCartIndex = async () => {
  try {
    // Connect to database
    await connectDB()

    const db = mongoose.connection.db
    const collection = db.collection("carts")

    // Get all indexes
    const indexes = await collection.indexes()
    console.log("Current indexes:", indexes)

    // Drop old index if it exists (customer_1 or customerId_1 without sparse)
    try {
      // Try to drop customer_1 (old index name)
      await collection.dropIndex("customer_1")
      console.log("Dropped old index: customer_1")
    } catch (error) {
      if (error.code !== 27) { // 27 = IndexNotFound
        console.log("No customer_1 index to drop")
      }
    }

    try {
      // Try to drop customerId_1 if it's not sparse
      const customerIdIndex = indexes.find(idx => 
        idx.key && (idx.key.customerId === 1 || idx.key.customer === 1)
      )
      
      if (customerIdIndex && !customerIdIndex.sparse) {
        await collection.dropIndex(customerIdIndex.name)
        console.log(`Dropped non-sparse index: ${customerIdIndex.name}`)
      }
    } catch (error) {
      console.log("Error dropping customerId index:", error.message)
    }

    // Create new sparse unique index
    try {
      await collection.createIndex(
        { customerId: 1 },
        { unique: true, sparse: true, name: "customerId_1" }
      )
      console.log("Created new sparse unique index on customerId")
    } catch (error) {
      if (error.code === 85) { // IndexAlreadyExists
        console.log("Index already exists, skipping creation")
      } else {
        throw error
      }
    }

    // Verify indexes
    const finalIndexes = await collection.indexes()
    console.log("\nFinal indexes:")
    finalIndexes.forEach(idx => {
      console.log(`- ${idx.name}: ${JSON.stringify(idx.key)}, sparse: ${idx.sparse || false}, unique: ${idx.unique || false}`)
    })

    console.log("\nCart index fix completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("Error fixing cart index:", error)
    process.exit(1)
  }
}

fixCartIndex()



