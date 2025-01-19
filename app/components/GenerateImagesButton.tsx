"use client";
import { useState } from "react";

export default function GenerateImagesButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const generateImages = () => {
    setLoading(true);
    setMessage("");
    setImages([]);

    const eventSource = new EventSource(
      `http://127.0.0.1:8001/generate-images?prompt=${encodeURIComponent(prompt)}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.image_path) {
          setImages((prevImages) => [
            ...prevImages,
            `http://127.0.0.1:8001${data.image_path}`,
          ]);
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    eventSource.onerror = () => {
      console.error("Error in EventSource");
      eventSource.close();
      setLoading(false);
      setMessage("An error occurred while generating images.");
    };

    eventSource.onopen = () => {
      console.log("Connection established.");
    };

    eventSource.addEventListener("end", () => {
      eventSource.close();
      setLoading(false);
      setMessage("Image generation completed.");
    });

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Enter your prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="rounded-md border p-2 w-full mb-4 text-black"
      />
      <button
        onClick={generateImages}
        className="rounded-full border border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Images"}
      </button>
      {message && <p>{message}</p>}
      <div className="image-gallery grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {images.map((src, index) => (
          <img
            key={index}
            src={src}
            alt={`Generated Image ${index + 1}`}
            className="rounded-md"
            style={{
              width: "200px",
              height: "200px",
              objectFit: "cover",
            }}
          />
        ))}
      </div>
    </div>
  );
}
