import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const prompt = searchParams.get("prompt")

  const response = await fetch(`http://127.0.0.1:8001/generate-images?prompt=${encodeURIComponent(prompt || "")}`, {
    method: "GET",
  })

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

export async function POST() {
  const response = await fetch("http://127.0.0.1:8001/stop-generation", {
    method: "POST",
  })

  const data = await response.json()
  return NextResponse.json(data)
}
