"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function PromptForm({ onNewImage }: { onNewImage: (imagePath: string) => void }) {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()

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
      setIsGenerating(false)
    } catch (error) {
      console.error("Error stopping generation:", error)
    }
  }

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
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
                {isGenerating && (
                  <Loader2 className="absolute right-3 h-5 w-5 animate-spin text-gray-600" />
                )}
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
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
