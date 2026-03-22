import express from "express"
import jwt from "jsonwebtoken"
import Employee from "../models/Employee.js"
import Designation from "../models/Designation.js"
import { verifyAdminToken, verifyEmployeeToken, requirePermission } from "../middleware/auth.js"

const router = express.Router()

// ─── Employee Login ───
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" })
    }

    const employee = await Employee.findOne({ email: email.toLowerCase() }).populate("designation")

    if (!employee) {
      return res.status(401).json({ success: false, message: "Invalid email or password" })
    }
    if (!employee.isActive) {
      return res.status(403).json({ success: false, message: "Employee account is deactivated" })
    }
    if (!employee.designation || !employee.designation.isActive) {
      return res.status(403).json({ success: false, message: "Your designation has been deactivated. Contact admin." })
    }

    const isPasswordValid = await employee.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" })
    }

    const token = jwt.sign(
      {
        id: employee._id,
        email: employee.email,
        type: "employee",
      },
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
    )

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        designation: {
          id: employee.designation._id,
          name: employee.designation.name,
        },
        permissions: employee.designation.permissions,
      },
    })
  } catch (error) {
    console.error("Employee login error:", error)
    res.status(500).json({ success: false, message: "Server error. Please try again later." })
  }
})

// ─── Verify Employee Token ───
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" })
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
    )

    if (decoded.type !== "employee") {
      return res.status(401).json({ success: false, message: "Invalid token type" })
    }

    const employee = await Employee.findById(decoded.id).select("-password").populate("designation")
    if (!employee || !employee.isActive) {
      return res.status(401).json({ success: false, message: "Invalid or inactive employee" })
    }
    if (!employee.designation || !employee.designation.isActive) {
      return res.status(403).json({ success: false, message: "Designation deactivated" })
    }

    res.status(200).json({
      success: true,
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        designation: {
          id: employee.designation._id,
          name: employee.designation.name,
        },
        permissions: employee.designation.permissions,
      },
    })
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired token" })
  }
})

// ─── Employee Logout ───
router.post("/logout", (req, res) => {
  res.status(200).json({ success: true, message: "Logout successful" })
})

// ─── CRUD (Admin-only) ───

// List all employees
router.get("/", verifyAdminToken, requirePermission("employees:view", "employees:manage"), async (req, res) => {
  try {
    const { search, designation, includeInactive, page = 1, limit = 50 } = req.query
    const filter = {}

    if (includeInactive !== "true") filter.isActive = true
    if (designation) filter.designation = designation
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ]
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .select("-password")
        .populate("designation", "name permissions isActive")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Employee.countDocuments(filter),
    ])

    res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error("Get employees error:", error)
    res.status(500).json({ success: false, message: "Error fetching employees" })
  }
})

// Get single employee
router.get("/:id", verifyAdminToken, requirePermission("employees:view", "employees:manage"), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .select("-password")
      .populate("designation", "name permissions isActive")

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" })
    }

    res.status(200).json({ success: true, data: employee })
  } catch (error) {
    console.error("Get employee error:", error)
    res.status(500).json({ success: false, message: "Error fetching employee" })
  }
})

// Create employee
router.post("/", verifyAdminToken, requirePermission("employees:manage"), async (req, res) => {
  try {
    const { name, email, password, phone, designation } = req.body

    if (!name || !email || !password || !designation) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and designation are required",
      })
    }

    const existingEmployee = await Employee.findOne({ email: email.toLowerCase() })
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: "Employee with this email already exists" })
    }

    const designationDoc = await Designation.findById(designation)
    if (!designationDoc || !designationDoc.isActive) {
      return res.status(400).json({ success: false, message: "Invalid or inactive designation" })
    }

    const employee = new Employee({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone?.trim() || "",
      designation,
    })

    await employee.save()

    const populated = await Employee.findById(employee._id)
      .select("-password")
      .populate("designation", "name permissions isActive")

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: populated,
    })
  } catch (error) {
    console.error("Create employee error:", error)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Employee with this email already exists" })
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)[0].message,
      })
    }
    res.status(500).json({ success: false, message: "Error creating employee" })
  }
})

// Update employee
router.put("/:id", verifyAdminToken, requirePermission("employees:manage"), async (req, res) => {
  try {
    const { name, email, password, phone, designation, isActive } = req.body

    const employee = await Employee.findById(req.params.id)
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" })
    }

    if (email && email.toLowerCase().trim() !== employee.email) {
      const existing = await Employee.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: employee._id },
      })
      if (existing) {
        return res.status(400).json({ success: false, message: "Email already in use by another employee" })
      }
      employee.email = email.toLowerCase().trim()
    }

    if (designation) {
      const designationDoc = await Designation.findById(designation)
      if (!designationDoc || !designationDoc.isActive) {
        return res.status(400).json({ success: false, message: "Invalid or inactive designation" })
      }
      employee.designation = designation
    }

    if (name !== undefined) employee.name = name.trim()
    if (phone !== undefined) employee.phone = phone.trim()
    if (isActive !== undefined) employee.isActive = isActive
    if (password) employee.password = password

    await employee.save()

    const populated = await Employee.findById(employee._id)
      .select("-password")
      .populate("designation", "name permissions isActive")

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: populated,
    })
  } catch (error) {
    console.error("Update employee error:", error)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Email already in use" })
    }
    res.status(500).json({ success: false, message: "Error updating employee" })
  }
})

// Delete employee (soft)
router.delete("/:id", verifyAdminToken, requirePermission("employees:manage"), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" })
    }

    employee.isActive = false
    await employee.save()

    res.status(200).json({ success: true, message: "Employee deactivated successfully" })
  } catch (error) {
    console.error("Delete employee error:", error)
    res.status(500).json({ success: false, message: "Error deleting employee" })
  }
})

export default router
