"use client";
import { useState } from "react";

export default function GenerateImagesButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [prompt, setPrompt] = useState("");

  const generateImages = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("http://127.0.0.1:8001/generate-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
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
      <input
        type="text"
        placeholder="Enter your prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="rounded-md border p-2 w-full mb-4 text-black"
      />
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