import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  const filePath = path.join(process.cwd(), "downloads", "Elecobuy_Vendor.apk")

  try {
    const file = await fs.promises.readFile(filePath)

    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="Elecobuy_Vendor.apk"',
      },
    })
  } catch (error) {
    console.error("Error reading Elecobuy_Vendor.apk", error)
    return new NextResponse("File not found", { status: 404 })
  }
}

