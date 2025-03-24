"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Info } from "lucide-react";
import PromptForm from "./prompt-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ImageInfo {
  name: string;
  prompt: string;
  path: string;
  createdAt: number;
  selected?: boolean;
}

interface SelectedImage {
  filename: string;
  caption: string;
}

export default function ImageGrid() {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const sendSelectedImages = async () => {
    try {
      const response = await fetch(
        "http://localhost:8001/save-selected-captions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedCaptions: selectedImages }),
        }
      );

      if (!response.ok) throw new Error("Failed to save selected images");
      console.log("Selected images saved successfully!");
    } catch (error) {
      console.error("Error saving selected images:", error);
    }
  };

  useEffect(() => {
    sendSelectedImages();
  }, [selectedImages]);

  const clearImages = async () => {
    try {
      const response = await fetch("/api/images/clear", { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete images");

      setImages([]); // Clear images from UI
      setSelectedImages([]); // Clear selection
    } catch (error) {
      console.error("Error clearing images:", error);
    }
  };

  const fetchImages = useCallback(async () => {
    try {
      const response = await fetch("/api/images/list");
      if (!response.ok) throw new Error("Failed to fetch images");

      const newImages: ImageInfo[] = await response.json();
      setImages((prevImages) => {
        const existingImageMap = new Map(
          prevImages.map((img) => [img.path, img])
        );
        return newImages.map((img) => ({
          ...img,
          selected: existingImageMap.get(img.path)?.selected || false,
        }));
      });
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshImages = async () => {
    setImages([]);
    setSelectedImages([]);
    await fetchImages();
  };

  useEffect(() => {
    fetchImages();
    const intervalId = setInterval(fetchImages, 2000);
    return () => clearInterval(intervalId);
  }, [fetchImages]);

  const toggleImageSelection = (index: number) => {
    setImages((prevImages) =>
      prevImages.map((img, i) => ({
        ...img,
        selected: i === index ? !img.selected : img.selected,
      }))
    );

    setSelectedImages((prevSelected) => {
      const selectedImage = images[index];
      const filename = selectedImage.name;
      const caption = selectedImage.prompt;
      const isAlreadySelected = selectedImage.selected;

      if (!isAlreadySelected) {
        return [...prevSelected, { filename, caption }];
      } else {
        return prevSelected.filter((img) => img.filename !== filename);
      }
    });
  };

  const handleNewImage = useCallback(() => {
    fetchImages();
  }, [fetchImages]);

  if (loading && images.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading images...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PromptForm
        onNewImage={handleNewImage}
        onGeneratingChange={setGenerating}
      />

      <Alert className="bg-muted/50 border-primary/20">
        <div className="flex items-start gap-2">
          <Info className="h-6 w-6" />
          <div>
            <AlertTitle className="text-base">
              {selectedImages.length > 0
                ? `${selectedImages.length} ${
                    selectedImages.length === 1 ? "image" : "images"
                  } selected`
                : "Click to select images!"}
            </AlertTitle>
            <AlertDescription className="text-sm">
              Future generations will look more like selected images.
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Generated Images</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshImages}>
            Unselect All
          </Button>
          <Button variant="outline" onClick={clearImages} disabled={generating}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear Images
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((image, index) => (
          <Card
            key={`${image.path}-${image.createdAt}`}
            className={`overflow-hidden transition-all ${
              generating
                ? "cursor-not-allowed pointer-events-none"
                : "cursor-pointer"
            } ${image.selected ? "ring-2 ring-primary scale-[0.98]" : ""}`}
            onClick={() => {
              if (!generating) toggleImageSelection(index);
            }}
          >
            <CardContent className="p-0 relative aspect-square">
              <Image
                src={`/api/images?path=${encodeURIComponent(image.path)}`}
                alt={`Generated image: ${image.prompt}`}
                // intrinsic dimension to determine the aspect ratio
                width={768}
                height={768}
                className="object-cover w-full h-auto"
                priority={index < 6}
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
  );
}
