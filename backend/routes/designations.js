import express from "express"
import Designation from "../models/Designation.js"
import Employee from "../models/Employee.js"
import { verifyAdminToken, requirePermission } from "../middleware/auth.js"

const router = express.Router()

// Get all available permissions
router.get("/permissions", verifyAdminToken, requirePermission("designations:view", "designations:manage"), async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: Designation.getAvailablePermissions(),
    })
  } catch (error) {
    console.error("Get permissions error:", error)
    res.status(500).json({ success: false, message: "Error fetching permissions" })
  }
})

// Get all designations
router.get("/", verifyAdminToken, requirePermission("designations:view", "designations:manage", "employees:view", "employees:manage"), async (req, res) => {
  try {
    const { includeInactive } = req.query
    const filter = includeInactive === "true" ? {} : { isActive: true }

    const designations = await Designation.find(filter).sort({ name: 1 }).lean()

    const designationIds = designations.map((d) => d._id)
    const counts = await Employee.aggregate([
      { $match: { designation: { $in: designationIds } } },
      { $group: { _id: "$designation", count: { $sum: 1 } } },
    ])
    const countMap = {}
    counts.forEach((c) => {
      countMap[c._id.toString()] = c.count
    })

    const data = designations.map((d) => ({
      ...d,
      employeeCount: countMap[d._id.toString()] || 0,
    }))

    res.status(200).json({ success: true, data })
  } catch (error) {
    console.error("Get designations error:", error)
    res.status(500).json({ success: false, message: "Error fetching designations" })
  }
})

// Get single designation
router.get("/:id", verifyAdminToken, requirePermission("designations:view", "designations:manage"), async (req, res) => {
  try {
    const designation = await Designation.findById(req.params.id)
    if (!designation) {
      return res.status(404).json({ success: false, message: "Designation not found" })
    }
    res.status(200).json({ success: true, data: designation })
  } catch (error) {
    console.error("Get designation error:", error)
    res.status(500).json({ success: false, message: "Error fetching designation" })
  }
})

// Create designation
router.post("/", verifyAdminToken, requirePermission("designations:manage"), async (req, res) => {
  try {
    const { name, description, permissions } = req.body

    if (!name) {
      return res.status(400).json({ success: false, message: "Designation name is required" })
    }

    const existing = await Designation.findOne({ name: name.trim() })
    if (existing) {
      return res.status(400).json({ success: false, message: "Designation with this name already exists" })
    }

    const designation = new Designation({
      name: name.trim(),
      description: description?.trim() || "",
      permissions: permissions || [],
    })

    await designation.save()

    res.status(201).json({
      success: true,
      message: "Designation created successfully",
      data: designation,
    })
  } catch (error) {
    console.error("Create designation error:", error)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Designation with this name already exists" })
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)[0].message,
      })
    }
    res.status(500).json({ success: false, message: "Error creating designation" })
  }
})

// Update designation
router.put("/:id", verifyAdminToken, requirePermission("designations:manage"), async (req, res) => {
  try {
    const { name, description, permissions, isActive } = req.body

    const designation = await Designation.findById(req.params.id)
    if (!designation) {
      return res.status(404).json({ success: false, message: "Designation not found" })
    }

    if (name && name.trim() !== designation.name) {
      const existing = await Designation.findOne({
        name: name.trim(),
        _id: { $ne: designation._id },
      })
      if (existing) {
        return res.status(400).json({ success: false, message: "Designation with this name already exists" })
      }
      designation.name = name.trim()
    }

    if (description !== undefined) designation.description = description.trim()
    if (permissions !== undefined) designation.permissions = permissions
    if (isActive !== undefined) designation.isActive = isActive

    await designation.save()

    res.status(200).json({
      success: true,
      message: "Designation updated successfully",
      data: designation,
    })
  } catch (error) {
    console.error("Update designation error:", error)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Designation with this name already exists" })
    }
    res.status(500).json({ success: false, message: "Error updating designation" })
  }
})

// Delete designation
router.delete("/:id", verifyAdminToken, requirePermission("designations:manage"), async (req, res) => {
  try {
    const designation = await Designation.findById(req.params.id)
    if (!designation) {
      return res.status(404).json({ success: false, message: "Designation not found" })
    }

    const employeeCount = await Employee.countDocuments({ designation: designation._id, isActive: true })
    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete designation. ${employeeCount} active employee(s) are assigned to it. Reassign them first.`,
      })
    }

    designation.isActive = false
    await designation.save()

    res.status(200).json({ success: true, message: "Designation deleted successfully" })
  } catch (error) {
    console.error("Delete designation error:", error)
    res.status(500).json({ success: false, message: "Error deleting designation" })
  }
})

export default router
