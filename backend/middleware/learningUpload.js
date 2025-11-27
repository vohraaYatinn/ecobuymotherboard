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
  const fileType = req.body.type || req.query.type

  if (fileType === "manual") {
    // Accept only PDF files
    if (file.mimetype === "application/pdf") {
      cb(null, true)
    } else {
      cb(new Error("Only PDF files are allowed for service manuals"), false)
    }
  } else if (fileType === "video") {
    // Accept video files (AVI and other common formats)
    if (file.mimetype.startsWith("video/") || file.originalname.toLowerCase().endsWith(".avi")) {
      cb(null, true)
    } else {
      cb(new Error("Only video files (AVI format) are allowed for training videos"), false)
    }
  } else if (fileType === "software") {
    // Accept ZIP files
    if (file.mimetype === "application/zip" || file.mimetype === "application/x-zip-compressed" || file.originalname.toLowerCase().endsWith(".zip")) {
      cb(null, true)
    } else {
      cb(new Error("Only ZIP files are allowed for software downloads"), false)
    }
  } else {
    cb(new Error("Invalid file type. Must be manual, video, or software"), false)
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




