from PIL import Image
from diffusers import StableDiffusionPipeline
from AsyncDiff.asyncdiff.async_sd import AsyncDiff
import torch.distributed as dist
import torch
import time
import os

IMG_WIDTH = 768
IMG_HEIGHT = 768
NUM_IMAGES = 3
OUTPUT_FOLDER = "generated_images"
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
        )
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

def main():
    pipeline = load_pipeline()

    async_diff = AsyncDiff(pipeline, model_n=2, stride=1, time_shift=False)
    async_diff.reset_state(warm_up=1)

    start_time = time.time()
    images = generate_images(pipeline, PROMPT, NUM_IMAGES)
    print(f"Rank {dist.get_rank()} Time taken: {time.time() - start_time:.2f} seconds.")
    if dist.get_rank() == 0:
        save_images(images, PROMPT)

if __name__ == "__main__":
    main()