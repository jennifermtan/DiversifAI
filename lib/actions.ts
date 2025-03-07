"use server"

import fs from "fs/promises"
import path from "path"

const OUTPUT_FOLDER = "generated_images"

export async function getGeneratedImages(): Promise<string[]> {
  try {
    // Ensure the output directory exists
    await fs.mkdir(OUTPUT_FOLDER, { recursive: true })

    // Read the directory
    const files = await fs.readdir(OUTPUT_FOLDER)

    // Filter for image files and sort by creation time (newest first)
    const imagePaths = files
      .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file))
      .map((file) => path.join(OUTPUT_FOLDER, file))

    // Get file stats for sorting
    const fileStats = await Promise.all(
      imagePaths.map(async (filePath) => {
        const stats = await fs.stat(filePath)
        return { path: filePath, ctime: stats.ctime }
      }),
    )

    // Sort by creation time (newest first)
    fileStats.sort((a, b) => b.ctime.getTime() - a.ctime.getTime())

    // Return just the paths
    return fileStats.map((file) => file.path)
  } catch (error) {
    console.error("Error getting generated images:", error)
    return []
  }
}

export async function generateSimilarImages(selectedImagePaths: string[]): Promise<void> {
  try {
    const selectedPrompts = selectedImagePaths.map((path) => {
      const filename = path.split("/").pop() || ""
      return filename
        .split("_")[0]
        .replace(/[^a-z0-9]/gi, " ")
        .trim()
    })

    const similarPrompt = `Similar to: ${selectedPrompts.join(", ")}`

    // Use the same generateImages function (client-side) for similar images
    // This will be handled in the PromptForm component
    return
  } catch (error) {
    console.error("Error generating similar images:", error)
    throw new Error("Failed to generate similar images")
  }
}
