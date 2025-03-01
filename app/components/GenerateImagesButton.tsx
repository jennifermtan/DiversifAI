"use client";
import { useState, useRef } from "react";

export default function GenerateImagesButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const toggleGeneration = () => {
    if (loading) {
      stopGenerating();
    } else {
      generateImages();
    }
  };

  const generateImages = () => {
    setLoading(true);
    setMessage("");
    setImages([]);

    const eventSource = new EventSource(
      `http://127.0.0.1:8001/generate-images?prompt=${encodeURIComponent(prompt)}`
    );
    eventSourceRef.current = eventSource;

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
      stopGenerating();
      setMessage("An error occurred while generating images.");
    };

    eventSource.onopen = () => {
      console.log("Connection established.");
    };

    eventSource.addEventListener("end", () => {
      stopGenerating();
      setMessage("Image generation completed.");
    });
  };

  const stopGenerating = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setLoading(false);
    setMessage("Stopping image generation...");

    // Send stop request to the backend
    try {
      await fetch("http://127.0.0.1:8001/stop-generation", { method: "POST" });
      setMessage("Image generation stopped.");
    } catch (error) {
      console.error("Failed to stop generation:", error);
      setMessage("Failed to stop generation.");
    }
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
        onClick={toggleGeneration}
        className={`rounded-full border transition-colors flex items-center justify-center gap-2 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 ${
          loading
            ? "border-red-500 bg-red-500 text-white hover:bg-red-700"
            : "border-transparent bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
        }`}
      >
        {loading ? "Stop" : "Generate"}
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
