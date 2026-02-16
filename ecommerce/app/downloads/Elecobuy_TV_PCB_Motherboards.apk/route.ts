import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  const filePath = path.join(process.cwd(), "downloads", "Elecobuy_TV_PCB_Motherboards.apk")

  try {
    const file = await fs.promises.readFile(filePath)

    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="Elecobuy_TV_PCB_Motherboards.apk"',
      },
    })
  } catch (error) {
    console.error("Error reading Elecobuy_TV_PCB_Motherboards.apk", error)
    return new NextResponse("File not found", { status: 404 })
  }
}

