import { type NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

const OUTPUT_FOLDER = "generated_images"

export async function GET(request: NextRequest) {
  try {
    // Ensure the output directory exists
    await fs.mkdir(OUTPUT_FOLDER, { recursive: true })

    const imagePaths = await fs.readdir(OUTPUT_FOLDER)
    const images = await Promise.all(
      imagePaths
        .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file))
        .map(async (file) => {
          const filePath = path.join(OUTPUT_FOLDER, file)
          const stats = await fs.stat(filePath)
          return {
            name: file,
            // Get the full prompt from the filename before the timestamp
            prompt: file.split("_").slice(0, -1).join("_").replace(/_/g, " "),
            path: filePath,
            createdAt: stats.birthtime.getTime(),
          }
        }),
    )

    // Sort images by creation time, newest first
    images.sort((a, b) => b.createdAt - a.createdAt)

    return NextResponse.json(images)
  } catch (error) {
    console.error("Error listing images:", error)
    return NextResponse.json({ error: "Failed to list images" }, { status: 500 })
  }
}
