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
      const response = await fetch("http://127.0.0.1:8001/generate-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: "Cartoon dogs cute" }), // Test prompt
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.error}`);
        return;
      }
  
      const data = await response.json();
      setMessage(`Images generated successfully, time taken: ${data.time_taken}`);

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
    </div>
  );
}
