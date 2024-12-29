import asyncio
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
import time

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow requests from the Next.js app
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

class PromptRequest(BaseModel):
    prompt: str

@app.get("/")
async def read_root():
    return {"message": "Welcome to the FastAPI server!"}

@app.post("/generate-images")
async def generate_images(prompt_request: PromptRequest):
    env = os.environ.copy()
    env["CUDA_VISIBLE_DEVICES"] = "0,1"  # Set CUDA devices

    start_time = time.time()

    process = await asyncio.create_subprocess_exec(
        "python",
        "-m", "torch.distributed.run",
        "--nproc_per_node=2",
        "backend/main.py",
        prompt_request.prompt,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env
    )
    stdout, stderr = await process.communicate()

    elapsed_time = time.time() - start_time

    if process.returncode != 0:
        return {
            "error": "Image generation failed",
            "stderr": stderr.decode("utf-8", errors="ignore"),
        }

    return {
        "stdout": stdout.decode("utf-8", errors="ignore"),
        "stderr": stderr.decode("utf-8", errors="ignore"),
        "time_taken": f"{elapsed_time:.2f} seconds",
    }
