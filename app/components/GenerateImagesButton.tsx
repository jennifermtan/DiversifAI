"use client";
import { useState } from "react";

export default function GenerateImagesButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const generateImages = async () => {
    setLoading(true);
    setMessage("");
    setImages([]);

    try {
      const response = await fetch("/api/stablediffusion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: "New york city painting" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.error}`);
      } else {
        const data = await response.json();
        setMessage(data.message || "Images generated successfully!");

        // Update this to handle image URLs if the API provides them
        if (data.output) {
          const generatedImages = JSON.parse(data.output); // Adjust if `output` contains image paths/URLs
          setImages(generatedImages);
        }
      }
    } catch (error) {
      console.error("Error generating images:", error);
      setMessage("An error occurred while generating images.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={generateImages}
        className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Images"}
      </button>
      {message && <p>{message}</p>}
      <div className="image-gallery">
        {images.map((image, index) => (
          <img key={index} src={image} alt={`Generated Image ${index + 1}`} />
        ))}
      </div>
    </div>
  );
}
