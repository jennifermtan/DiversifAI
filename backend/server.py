import asyncio
from fastapi import FastAPI
from pydantic import BaseModel
import os

app = FastAPI()

class PromptRequest(BaseModel):
    prompt: str

@app.get("/")
async def read_root():
    return {"message": "Welcome to the FastAPI server!"}

@app.post("/generate-images")
async def generate_images(prompt_request: PromptRequest):
    env = os.environ.copy()
    env["CUDA_VISIBLE_DEVICES"] = "0,1"  # Set CUDA devices

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

    if process.returncode != 0:
        return {
            "error": "Image generation failed",
            "stderr": stderr.decode("utf-8", errors="ignore"),
        }

    return {
        "stdout": stdout.decode("utf-8", errors="ignore"),
        "stderr": stderr.decode("utf-8", errors="ignore"),
    }
