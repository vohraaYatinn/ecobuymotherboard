import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname) || ""
    cb(null, `return-${uniqueSuffix}${ext}`)
  },
})

const allowedMimeTypes = [
  "image/",
  "video/",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]

const fileFilter = (req, file, cb) => {
  const isAllowed = allowedMimeTypes.some(
    (type) => file.mimetype.startsWith(type) || file.mimetype === type
  )

  if (isAllowed) {
    cb(null, true)
  } else {
    cb(
      new Error(
        "Invalid file type. Allowed: images, videos, pdf, doc, docx, xls, xlsx, txt."
      ),
      false
    )
  }
}

const returnUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file to support short videos/documents
    files: 5,
  },
})

export default returnUpload




