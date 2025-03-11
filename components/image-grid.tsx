"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import PromptForm from "./prompt-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ImageInfo {
  name: string
  prompt: string
  path: string
  createdAt: number
  selected?: boolean
}

export default function ImageGrid() {
  const [images, setImages] = useState<ImageInfo[]>([])
  const [selectedCaptions, setSelectedCaptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()

  const sendSelectedCaptions = async () => {
    try {
      const response = await fetch("http://localhost:8001/save-selected-captions", { 
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedCaptions }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to save selected captions");
      }
  
      console.log("Selected captions saved successfully!");
    } catch (error) {
      console.error("Error saving selected captions:", error);
    }
  };

  // Call API whenever selectedCaptions changes
  useEffect(() => {
    sendSelectedCaptions();
  }, [selectedCaptions]);


  const clearImages = async () => {
    try {
      const response = await fetch("/api/images/clear", {
        method: "DELETE",
      });
  
      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Failed to delete images: ${errorMessage}`);
      }
  
      setImages([]); // Clear images from UI
    } catch (error) {
      console.error("Error clearing images:", error);
    }
  };  

  const fetchImages = useCallback(async () => {
    try {
      const response = await fetch("/api/images/list")
      if (!response.ok) {
        throw new Error("Failed to fetch images")
      }
      const newImages: ImageInfo[] = await response.json()
      setImages((prevImages) => {
        // Only add images that don't already exist in the list
        const existingPaths = new Set(prevImages.map((img) => img.path))
        const uniqueNewImages = newImages.filter((img) => !existingPaths.has(img.path))
        if (uniqueNewImages.length > 0) {
          return [...uniqueNewImages, ...prevImages]
        }
        return prevImages
      })
    } catch (error) {
      console.error("Error fetching images:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchImages()
    const intervalId = setInterval(fetchImages, 2000) // Poll every 2 seconds
    return () => clearInterval(intervalId)
  }, [fetchImages])

  const toggleImageSelection = (index: number) => {
    setImages((prevImages) =>
      prevImages.map((img, i) => ({
        ...img,
        selected: i === index ? !img.selected : img.selected,
      }))
    );
  
    setSelectedCaptions((prevCaptions) => {
      const selectedImage = images[index];
      if (!selectedImage.selected) {
        // If the image is now selected, add its caption
        return [...prevCaptions, selectedImage.prompt];
      } else {
        // If deselected, remove from the list
        return prevCaptions.filter((caption) => caption !== selectedImage.prompt);
      }
    });
  };

  const handleNewImage = useCallback(
    (imagePath: string) => {
      fetchImages() // Refresh the image list when a new image is generated
    },
    [fetchImages],
  )

  if (loading && images.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading images...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PromptForm onNewImage={handleNewImage} />
      <Alert className="bg-muted/50 border-primary/20">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4" />
        <div>
          <AlertTitle>Click to select images!</AlertTitle>
          <AlertDescription>
            Future generations will look more like selected images.
          </AlertDescription>
        </div>
      </div>
    </Alert>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Generated Images</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearImages} disabled={generating}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((image, index) => (
          <Card
            key={`${image.path}-${image.createdAt}`}
            className={`overflow-hidden cursor-pointer transition-all ${
              image.selected ? "ring-2 ring-primary scale-[0.98]" : ""
            }`}
            onClick={() => toggleImageSelection(index)}
          >
            <CardContent className="p-0 relative aspect-square">
              <Image
                src={`/api/images?path=${encodeURIComponent(image.path)}`}
                alt={`Generated image: ${image.prompt}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                className="object-cover"
                priority={index < 6} // Prioritize loading for first 6 images
              />
              {image.selected && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    Selected
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="p-3 bg-muted/50">
              <p className="text-sm text-muted-foreground">{image.prompt}</p>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
