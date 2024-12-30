from itertools import cycle
from PIL import Image
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import torch.distributed as dist
from diffusers import StableDiffusionPipeline
from AsyncDiff.asyncdiff.async_sd import AsyncDiff
import torch
import time
import os

IMG_WIDTH = 384 * 2
IMG_HEIGHT = 384 * 2
NUM_IMAGES = 3
OUTPUT_FOLDER = "generated_images_async"
PROMPT = "A painting of a beach"

pipeline = None

def load_pipeline():
    """Load and cache the Stable Diffusion pipeline."""
    global pipeline
    if pipeline is None:
        pipeline = StableDiffusionPipeline.from_pretrained(
            "stabilityai/stable-diffusion-2-1",
            torch_dtype=torch.float16,
            use_safetensors=True,
            low_cpu_mem_usage=True
        ).to("cuda")
        print("Pipeline loaded.")
    return pipeline

def generate_images(pipeline, prompt, num_images):
    """Generate a number of images for a prompt."""
    return pipeline([prompt] * num_images).images

def save_images(images, prompt):
    """Save generated images to a folder."""
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    for i, image in enumerate(images):
        filename = f"{prompt.replace(' ', '_')}_{i+1}.png"
        filepath = os.path.join(OUTPUT_FOLDER, filename)
        image.save(filepath)
        print(f"Image saved: {filepath}")

# FastAPI setup
def create_app():
    app = FastAPI(lifespan=lifespan)

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    async def read_root():
        return {"message": "Welcome to the FastAPI server!"}

    @app.post("/generate-images")
    async def generate_images_endpoint():
        global pipeline
        start_time = time.time()
        try:
            images = generate_images(pipeline, PROMPT, NUM_IMAGES)
            save_images(images, PROMPT)

            elapsed_time = time.time() - start_time
            return {
                "message": "Images generated successfully",
                "time_taken": f"{elapsed_time:.2f} seconds",
            }
        except Exception as e:
            return {"error": str(e)}

    return app

async def lifespan(app):
    global pipeline
    print("Loading Stable Diffusion Pipeline...")
    pipeline = load_pipeline()
    print("Pipeline loaded successfully.")
    yield # Signals to start serving requests
    print("Shutting down...")
    del pipeline
    torch.cuda.empty_cache()

# CLI functionality for standalone usage
def main():
    dist.init_process_group(backend="nccl", init_method="env://")
    local_rank = int(os.environ["LOCAL_RANK"])
    torch.cuda.set_device(local_rank)

    print(f"Rank {dist.get_rank()} is loading the pipeline...")
    pipeline = load_pipeline()
    async_diff = AsyncDiff(pipeline, model_n=2, stride=1, time_shift=False)
    async_diff.reset_state(warm_up=1)

    start_time = time.time()
    images = generate_images(pipeline, PROMPT, NUM_IMAGES)
    print(f"Rank {dist.get_rank()} Time taken: {time.time() - start_time:.2f} seconds.")
    if dist.get_rank() == 0:
        save_images(images, PROMPT)
    dist.destroy_process_group()

# Explicitly create the FastAPI app
app = create_app()

if __name__ == "__main__":
    main()
