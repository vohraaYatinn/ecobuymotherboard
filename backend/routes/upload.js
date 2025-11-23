import express from "express"
import upload from "../middleware/upload.js"
import { verifyAdminToken } from "../middleware/auth.js"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Upload single image
router.post("/image", verifyAdminToken, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      })
    }

    // Return the file path relative to the public directory
    const filePath = `/uploads/${req.file.filename}`

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        url: filePath,
        filename: req.file.filename,
      },
    })
  } catch (error) {
    console.error("Upload error:", error)
    res.status(500).json({
      success: false,
      message: "Error uploading image",
    })
  }
})

// Upload multiple images
router.post("/images", verifyAdminToken, upload.array("images", 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      })
    }

    const files = req.files.map((file) => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
    }))

    res.status(200).json({
      success: true,
      message: "Images uploaded successfully",
      data: files,
    })
  } catch (error) {
    console.error("Upload error:", error)
    res.status(500).json({
      success: false,
      message: "Error uploading images",
    })
  }
})

export default router




