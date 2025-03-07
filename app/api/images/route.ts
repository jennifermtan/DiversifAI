import { type NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const imagePath = searchParams.get("path")

  if (!imagePath) {
    return new NextResponse("Image path is required", { status: 400 })
  }

  try {
    // Validate the path to prevent directory traversal attacks
    const normalizedPath = path.normalize(imagePath)
    if (normalizedPath.includes("..")) {
      return new NextResponse("Invalid path", { status: 400 })
    }

    // Read the image file
    const imageBuffer = await fs.readFile(normalizedPath)

    // Determine content type based on file extension
    const ext = path.extname(normalizedPath).toLowerCase()
    let contentType = "image/jpeg" // Default

    if (ext === ".png") contentType = "image/png"
    else if (ext === ".webp") contentType = "image/webp"
    else if (ext === ".gif") contentType = "image/gif"

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
        "Content-Disposition": "inline",
      },
    })
  } catch (error) {
    console.error("Error serving image:", error)
    return new NextResponse("Error serving image", { status: 500 })
  }
}
