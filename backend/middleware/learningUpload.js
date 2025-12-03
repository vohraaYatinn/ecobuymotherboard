import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create learning-resources directory if it doesn't exist
const learningDir = path.join(__dirname, "../uploads/learning-resources")
if (!fs.existsSync(learningDir)) {
  fs.mkdirSync(learningDir, { recursive: true })
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, learningDir)
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    const originalName = path.basename(file.originalname, ext)
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9]/g, "-")
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`)
  },
})

// File filter based on type
const fileFilter = (req, file, cb) => {
  try {
    const fileType = req.body.type || req.query.type
    const fileName = file.originalname.toLowerCase()
    const ext = path.extname(fileName).toLowerCase()

    // Log for debugging
    console.log("File filter - Type:", fileType, "MIME:", file.mimetype, "Extension:", ext, "Filename:", file.originalname)

    if (!fileType) {
      return cb(new Error("File type is required. Please specify type (manual, video, or software)"), false)
    }

    if (fileType === "manual") {
      // Accept PDF files - prioritize extension check as MIME types can be unreliable
      const isPDFExtension = ext === ".pdf"
      const isPDFMimeType = file.mimetype === "application/pdf" || 
                           file.mimetype === "application/x-pdf" ||
                           file.mimetype === "application/acrobat" ||
                           file.mimetype === "applications/vnd.pdf" ||
                           file.mimetype === "application/octet-stream" // Some browsers send this for PDFs
      
      // Also accept AVIF files for image-based manuals
      const isAVIFExtension = ext === ".avif"
      const isAVIFMimeType = file.mimetype === "image/avif" ||
                            file.mimetype === "image/avif-sequence" ||
                            file.mimetype === "application/octet-stream" // Some browsers send this for AVIF
      
      // Accept if extension OR MIME type matches (prioritize extension)
      if (isPDFExtension || isPDFMimeType || isAVIFExtension || isAVIFMimeType) {
        cb(null, true)
      } else {
        cb(new Error("Only PDF or AVIF files are allowed for service manuals. Detected: " + ext + " (" + file.mimetype + ")"), false)
      }
    } else if (fileType === "video") {
      // Accept video files (AVI, MP4, MOV, and other common formats)
      // Also accept AVIF as it can be used for video thumbnails or image sequences
      const videoExtensions = [".avi", ".mp4", ".mov", ".mkv", ".webm", ".flv", ".wmv", ".m4v", ".3gp", ".avif"]
      const isVideoExtension = videoExtensions.includes(ext)
      const isVideoMimeType = file.mimetype.startsWith("video/") || 
                             file.mimetype === "image/avif" ||
                             file.mimetype === "image/avif-sequence" ||
                             file.mimetype === "application/octet-stream" // Some browsers send this for videos
      
      // Accept if extension OR MIME type matches (prioritize extension)
      if (isVideoExtension || isVideoMimeType) {
        cb(null, true)
      } else {
        cb(new Error("Only video files (AVI, MP4, MOV, etc.) or AVIF files are allowed for training videos. Detected: " + ext + " (" + file.mimetype + ")"), false)
      }
    } else if (fileType === "software") {
      // Accept ZIP files - prioritize extension check as MIME types can be unreliable
      const isZipExtension = ext === ".zip"
      const isZipMimeType = file.mimetype === "application/zip" || 
                           file.mimetype === "application/x-zip-compressed" ||
                           file.mimetype === "application/x-zip" ||
                           file.mimetype === "application/zip-compressed" ||
                           file.mimetype === "application/x-compress" ||
                           file.mimetype === "application/x-compressed" ||
                           file.mimetype === "multipart/x-zip" ||
                           file.mimetype === "application/octet-stream" // Some browsers send this for ZIPs
      
      // Accept if extension OR MIME type matches (prioritize extension)
      if (isZipExtension || isZipMimeType) {
        cb(null, true)
      } else {
        cb(new Error("Only ZIP files are allowed for software downloads. Detected: " + ext + " (" + file.mimetype + ")"), false)
      }
    } else {
      cb(new Error("Invalid file type. Must be manual, video, or software"), false)
    }
  } catch (error) {
    console.error("File filter error:", error)
    cb(new Error("Error validating file: " + (error.message || "Unknown error")), false)
  }
}

// Configure multer for learning resources
const learningUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for videos and large files
  },
})

export default learningUpload











