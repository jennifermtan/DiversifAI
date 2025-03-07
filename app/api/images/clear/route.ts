import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const imagesDir = path.join(process.cwd(), "generated_images"); // Adjust path if needed

    if (!fs.existsSync(imagesDir)) {
      return NextResponse.json({ message: "No images to delete" }, { status: 404 });
    }

    // Read all files in the directory
    const files = fs.readdirSync(imagesDir);

    // Delete each file
    files.forEach((file) => {
      fs.unlinkSync(path.join(imagesDir, file));
    });

    return NextResponse.json({ message: "All images deleted successfully" });
  } catch (error) {
    console.error("Error deleting images:", error);
    return NextResponse.json({ message: "Error deleting images" }, { status: 500 });
  }
}
