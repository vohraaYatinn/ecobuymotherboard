import express from "express"
import LearningResource from "../models/LearningResource.js"
import { verifyAdminToken } from "../middleware/auth.js"
import learningUpload from "../middleware/learningUpload.js"
import multer from "multer"
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
  (req, res, next) => {
    // Set a longer timeout for file uploads (5 minutes)
    req.setTimeout(5 * 60 * 1000, () => {
      console.error("❌ [LEARNING RESOURCES] Request timeout")
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: "Upload timeout. The file may be too large or your connection is slow. Please try again.",
        })
      }
    })

    // Log request size for debugging
    if (req.headers['content-length']) {
      const contentLength = parseInt(req.headers['content-length'])
      const sizeMB = (contentLength / 1024 / 1024).toFixed(2)
      console.log(`📦 [LEARNING RESOURCES] Request size: ${sizeMB} MB`)
      
      // Check if request is too large before processing
      if (contentLength > 500 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          message: `File size (${sizeMB} MB) exceeds the 500MB limit. Please upload a smaller file.`,
        })
      }
    }

    console.log(`📤 [LEARNING RESOURCES] Starting file upload processing...`)

    learningUpload.single("file")(req, res, (err) => {
      if (err) {
        console.error("❌ [LEARNING RESOURCES] Multer error:", err)
        console.error("❌ [LEARNING RESOURCES] Error details:", {
          code: err.code,
          message: err.message,
          field: err.field,
          name: err.name,
        })
        // Handle multer errors
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
              success: false,
              message: "File size exceeds the 500MB limit. Please upload a smaller file.",
            })
          }
          if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({
              success: false,
              message: "Unexpected file field. Please use 'file' as the field name.",
            })
          }
          return res.status(400).json({
            success: false,
            message: err.message || "File upload error",
          })
        }
        // Handle file filter errors and other upload errors
        return res.status(400).json({
          success: false,
          message: err.message || "Error uploading file. Please try again.",
        })
      }
      next()
    })
  },
  async (req, res) => {
    try {
      // Check if request was too large (before multer processing)
      if (req.headers['content-length'] && parseInt(req.headers['content-length']) > 500 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          message: "File size exceeds 500MB limit. Please upload a smaller file.",
        })
      }

      if (!req.file) {
        // Check if it's a size limit issue
        if (req.headers['content-length'] && parseInt(req.headers['content-length']) > 0) {
          return res.status(400).json({
            success: false,
            message: "No file uploaded or file size exceeds limit. Maximum file size is 500MB.",
          })
        }
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        })
      }

      const { title, description, type } = req.body
      
      console.log("📤 [LEARNING RESOURCES] Upload request received")
      console.log("📤 [LEARNING RESOURCES] Body:", req.body)
      console.log("📤 [LEARNING RESOURCES] Type:", type)
      console.log("📤 [LEARNING RESOURCES] File:", req.file ? {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      } : "No file")

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

      // Validate file extension matches the type
      const fileExt = path.extname(req.file.originalname).toLowerCase()
      let isValidFile = false
      
      console.log("🔍 [LEARNING RESOURCES] Validating file:", {
        type,
        fileExt,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      })
      
      if (type === "manual") {
        isValidFile = fileExt === ".pdf" || fileExt === ".avif"
      } else if (type === "video") {
        isValidFile = [".avi", ".mp4", ".mov", ".mkv", ".webm", ".flv", ".wmv", ".m4v", ".3gp", ".avif"].includes(fileExt)
      } else if (type === "software") {
        // For software, accept .zip extension (case-insensitive check already done)
        isValidFile = fileExt === ".zip"
        console.log("🔍 [LEARNING RESOURCES] Software file validation:", {
          fileExt,
          isValidFile,
          mimetype: req.file.mimetype,
        })
      }

      if (!isValidFile) {
        console.error("❌ [LEARNING RESOURCES] File validation failed:", {
          type,
          fileExt,
          originalname: req.file.originalname,
        })
        // Delete uploaded file if validation fails
        const filePath = path.join(__dirname, "../uploads/learning-resources", req.file.filename)
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath)
          } catch (unlinkError) {
            console.error("⚠️ [LEARNING RESOURCES] Error deleting file:", unlinkError)
          }
        }
        return res.status(400).json({
          success: false,
          message: `File type mismatch. Expected ${type === "manual" ? "PDF or AVIF" : type === "video" ? "video file (AVI, MP4, MOV, etc.) or AVIF" : "ZIP"} but got ${fileExt || "unknown extension"}`,
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
      console.error("❌ [LEARNING RESOURCES] Error uploading resource:", error)
      console.error("❌ [LEARNING RESOURCES] Error stack:", error.stack)
      console.error("❌ [LEARNING RESOURCES] Request details:", {
        hasFile: !!req.file,
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
        body: req.body,
      })
      
      // Delete uploaded file if database save fails
      if (req.file) {
        const filePath = path.join(__dirname, "../uploads/learning-resources", req.file.filename)
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath)
            console.log("✅ [LEARNING RESOURCES] Cleaned up uploaded file")
          } catch (unlinkError) {
            console.error("⚠️ [LEARNING RESOURCES] Error deleting file:", unlinkError)
          }
        }
      }
      
      // Check for specific error types
      let errorMessage = "Error uploading resource. Please try again."
      if (error.message) {
        if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
          errorMessage = "Upload timeout. The file may be too large or the connection is slow. Please try again with a smaller file or check your connection."
        } else if (error.message.includes("ECONNRESET") || error.message.includes("socket")) {
          errorMessage = "Connection error during upload. Please try again."
        } else if (error.message.includes("ENOENT") || error.message.includes("file")) {
          errorMessage = "File system error. Please try again."
        } else {
          errorMessage = `Error uploading resource: ${error.message}`
        }
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
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











