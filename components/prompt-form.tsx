"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"

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
            <div className="flex gap-2">
              <Input
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A serene landscape with mountains and a lake..."
                disabled={isGenerating}
                className="flex-1"
              />
              {isGenerating ? (
                <Button type="button" onClick={handleStopGeneration} variant="destructive">
                  Stop
                </Button>
              ) : (
                <Button type="submit" disabled={!prompt.trim()}>
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
