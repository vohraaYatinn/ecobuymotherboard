import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Store packing videos under /uploads/packing-videos so they are served by server.js static /uploads route
const packingVideosDir = path.join(__dirname, "../uploads/packing-videos")
if (!fs.existsSync(packingVideosDir)) {
  fs.mkdirSync(packingVideosDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, packingVideosDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname) || ""
    cb(null, `packing-${uniqueSuffix}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("video/")) {
    cb(null, true)
  } else {
    cb(new Error("Only video files are allowed for packing verification"), false)
  }
}

const packingVideoUpload = multer({
  storage,
  fileFilter,
  limits: {
    // Allow reasonably sized short packing videos; adjust if needed based on infra limits.
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 1,
  },
})

export default packingVideoUpload

