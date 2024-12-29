from itertools import cycle
from PIL import Image
from diffusers import StableDiffusionPipeline
from AsyncDiff.asyncdiff.async_sd import AsyncDiff
import torch.distributed as dist
from datetime import datetime
import torch
import uuid
import time
import os
import argparse

IMG_WIDTH = 384 * 2
IMG_HEIGHT = 384 * 2
NUM_IMAGES = 3
OUTPUT_FOLDER = "generated_images_async"

torch.cuda.empty_cache()
pipeline_cache = None

def load_pipeline():
    """Load and cache the Stable Diffusion pipeline."""
    global pipeline_cache
    if pipeline_cache is None:
        pipeline_cache = StableDiffusionPipeline.from_pretrained(
            "stabilityai/stable-diffusion-2-1",
            torch_dtype=torch.float16,
            use_safetensors=True,
            low_cpu_mem_usage=True
        )
        print("Pipeline loaded and cached.")
    return pipeline_cache

def generate_images(pipeline, prompt, num_images):
    """Generate a number of images for a prompt."""
    return pipeline([prompt] * num_images).images

def save_images(images, prompt):
    """Save generated images to a folder."""
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)

    for idx, image in enumerate(images):
        filename = f"{prompt.replace(' ', '_')}_{idx+1}.png"
        filepath = os.path.join(OUTPUT_FOLDER, filename)
        image.save(filepath)
        print(f"Image saved: {filepath}")

def main():
    parser = argparse.ArgumentParser(description="Generate images with Stable Diffusion.")
    parser.add_argument("prompt", type=str, help="Prompt for generating images")
    args = parser.parse_args()
    prompt = args.prompt

    start = time.time()
    
    # Load the pipeline
    pipeline = load_pipeline()
    print(f"Loading pipeline time taken: {time.time() - start:.2f} seconds.")

    # Initialize AsyncDiff
    async_diff = AsyncDiff(pipeline, model_n=2, stride=1, time_shift=False)
    async_diff.reset_state(warm_up=1)

    # Generate images
    start = time.time()
    images = generate_images(pipeline, prompt, NUM_IMAGES)
    print(f"Rank {dist.get_rank()} Time taken: {time.time() - start:.2f} seconds.")

    # Save images (only on rank 0)
    if dist.get_rank() == 0:
        save_images(images, prompt)

    dist.destroy_process_group()

if __name__ == "__main__":
    load_pipeline()
    main()
