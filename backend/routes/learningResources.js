import express from "express"
import LearningResource from "../models/LearningResource.js"
import { verifyAdminToken } from "../middleware/auth.js"
import learningUpload from "../middleware/learningUpload.js"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Get all learning resources (public endpoint)
router.get("/", async (req, res) => {
  try {
    const { type } = req.query
    const query = { isActive: true }
    
    if (type && ["manual", "video", "software"].includes(type)) {
      query.type = type
    }

    const resources = await LearningResource.find(query)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .select("-__v")

    res.json({
      success: true,
      data: resources,
    })
  } catch (error) {
    console.error("Error fetching learning resources:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching learning resources",
    })
  }
})

// Get single learning resource (public endpoint)
router.get("/:id", async (req, res) => {
  try {
    const resource = await LearningResource.findOne({
      _id: req.params.id,
      isActive: true,
    })
      .populate("uploadedBy", "name email")
      .select("-__v")

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      })
    }

    res.json({
      success: true,
      data: resource,
    })
  } catch (error) {
    console.error("Error fetching learning resource:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching learning resource",
    })
  }
})

// Increment download count
router.post("/:id/download", async (req, res) => {
  try {
    const resource = await LearningResource.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    )

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      })
    }

    res.json({
      success: true,
      message: "Download count updated",
    })
  } catch (error) {
    console.error("Error updating download count:", error)
    res.status(500).json({
      success: false,
      message: "Error updating download count",
    })
  }
})

// Admin routes - Upload learning resource
router.post(
  "/upload",
  verifyAdminToken,
  learningUpload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        })
      }

      const { title, description, type } = req.body

      if (!title || !type) {
        // Delete uploaded file if validation fails
        const filePath = path.join(__dirname, "../uploads/learning-resources", req.file.filename)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
        return res.status(400).json({
          success: false,
          message: "Title and type are required",
        })
      }

      if (!["manual", "video", "software"].includes(type)) {
        // Delete uploaded file if validation fails
        const filePath = path.join(__dirname, "../uploads/learning-resources", req.file.filename)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
        return res.status(400).json({
          success: false,
          message: "Invalid type. Must be manual, video, or software",
        })
      }

      const resource = new LearningResource({
        title,
        description: description || "",
        type,
        fileUrl: `/uploads/learning-resources/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.admin._id,
      })

      await resource.save()

      res.status(201).json({
        success: true,
        message: "Resource uploaded successfully",
        data: resource,
      })
    } catch (error) {
      console.error("Error uploading resource:", error)
      res.status(500).json({
        success: false,
        message: "Error uploading resource",
      })
    }
  }
)

// Admin routes - Get all resources (including inactive)
router.get("/admin/all", verifyAdminToken, async (req, res) => {
  try {
    const { type } = req.query
    const query = {}
    
    if (type && ["manual", "video", "software"].includes(type)) {
      query.type = type
    }

    const resources = await LearningResource.find(query)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .select("-__v")

    res.json({
      success: true,
      data: resources,
    })
  } catch (error) {
    console.error("Error fetching learning resources:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching learning resources",
    })
  }
})

// Admin routes - Update resource
router.put("/:id", verifyAdminToken, async (req, res) => {
  try {
    const { title, description, isActive } = req.body

    const resource = await LearningResource.findByIdAndUpdate(
      req.params.id,
      {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true }
    )
      .populate("uploadedBy", "name email")
      .select("-__v")

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      })
    }

    res.json({
      success: true,
      message: "Resource updated successfully",
      data: resource,
    })
  } catch (error) {
    console.error("Error updating resource:", error)
    res.status(500).json({
      success: false,
      message: "Error updating resource",
    })
  }
})

// Admin routes - Delete resource
router.delete("/:id", verifyAdminToken, async (req, res) => {
  try {
    const resource = await LearningResource.findById(req.params.id)

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      })
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, "..", resource.fileUrl)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    // Delete from database
    await LearningResource.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "Resource deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting resource:", error)
    res.status(500).json({
      success: false,
      message: "Error deleting resource",
    })
  }
})

export default router





