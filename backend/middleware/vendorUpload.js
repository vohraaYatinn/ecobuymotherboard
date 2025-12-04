import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create uploads directory for vendor documents if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads/vendor-documents")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, `vendor-doc-${uniqueSuffix}${ext}`)
  },
})

// File filter - accept PDFs, images, and common document formats
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  ]

  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"]
  const ext = path.extname(file.originalname).toLowerCase()

  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error("Only PDF, images, and document files are allowed"), false)
  }
}

// Configure multer
const vendorUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

export default vendorUpload

