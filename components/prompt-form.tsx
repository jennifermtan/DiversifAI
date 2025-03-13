"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation"

export default function PromptForm({ onNewImage }: { onNewImage: (imagePath: string) => void }) {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [progressValue, setProgressValue] = useState(0);
  const router = useRouter()

  useEffect(() => {
    if (isGenerating) {
      setProgressValue(0);
      const interval = setInterval(() => {
        setProgressValue((prev) => (prev >= 100 ? 100 : prev + 2));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      if (progressValue != 0) {
        setProgressValue(100);
      } 
    }
  }, [isGenerating]);  

  const generateImages = useCallback(
    async (prompt: string) => {
      setIsGenerating(true)
      try {
        const response = await fetch(`/api/generate?prompt=${encodeURIComponent(prompt)}`)
        const reader = response.body?.getReader()
        if (!reader) throw new Error("Failed to start image generation")

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data:")) {
              const data = JSON.parse(line.slice(5))
              if (data.image_path) {
                onNewImage(data.image_path)
              }
            }
          }
        }
      } catch (error) {
        console.error("Error generating images:", error)
      } finally {
        setIsGenerating(false)
        router.refresh()
      }
    },
    [onNewImage, router],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    generateImages(prompt)
  }

  const handleStopGeneration = async () => {
    try {
      await fetch("/api/generate", { method: "POST" })
      setProgressValue(0);
      setIsGenerating(false)
    } catch (error) {
      console.error("Error stopping generation:", error)
    }
  }

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <label htmlFor="prompt" className="text-lg font-medium">
              Enter your prompt
            </label>
            <div className="flex w-full items-center gap-2">
              <div className="relative flex flex-1 items-center">
                <Input
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A serene landscape with mountains and a lake..."
                  disabled={isGenerating}
                  className="pr-12 h-10 w-full"
                />
              </div>
              {isGenerating ? (
                <Button type="button" onClick={handleStopGeneration} variant="destructive" className="w-[100px]">
                  Stop
                </Button>
              ) : (
                <Button type="submit" disabled={!prompt.trim()} className="w-[100px]">
                  Generate
                </Button>
              )}
            </div>
            <Progress value={progressValue}/>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
