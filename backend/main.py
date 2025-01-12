from PIL import Image
from diffusers import StableDiffusionPipeline
from AsyncDiff.asyncdiff.async_sd import AsyncDiff
import torch.distributed as dist
import torch
import time
import os
import argparse

IMG_WIDTH = 768
IMG_HEIGHT = 768
NUM_IMAGES = 3
OUTPUT_FOLDER = "generated_images"

def load_pipeline():
    """Load and cache the Stable Diffusion pipeline."""
    pipeline = StableDiffusionPipeline.from_pretrained(
        "stabilityai/stable-diffusion-2-1",
        torch_dtype=torch.float16,
        use_safetensors=True,
        low_cpu_mem_usage=True,
    ).to("cuda")
    print("Pipeline loaded.")
    return pipeline

def generate_and_save_images(pipeline, prompt, num_images):
    """Generate and save images one at a time."""
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    
    for i in range(num_images):
        start_time = time.time()
        
        # Generate a single image
        image = pipeline(prompt).images[0]
        print(f"Image {i + 1} generated in {time.time() - start_time:.2f} seconds.")
        
        # Save the image
        filename = f"{prompt.replace(' ', '_')}_{i + 1}.png"
        filepath = os.path.join(OUTPUT_FOLDER, filename)
        image.save(filepath)
        print(f"Image saved: {filepath}")
        
        yield filepath  # Yield the path for real-time processing or streaming

def main():
    main_start_time = time.time()
    parser = argparse.ArgumentParser(description="Generate images using Stable Diffusion.")
    parser.add_argument("--prompt", type=str, required=True, help="Prompt to generate images for")
    args = parser.parse_args()

    pipeline = load_pipeline()
    prompt = args.prompt
    async_diff = AsyncDiff(pipeline, model_n=2, stride=1, time_shift=False)
    async_diff.reset_state(warm_up=1)

    # Generate and save images one by one
    for filepath in generate_and_save_images(pipeline, prompt, NUM_IMAGES):
        print(f"Image available at: {filepath}")

    print(f"Total time taken: {time.time() - main_start_time:.2f} seconds.")

if __name__ == "__main__":
    main()
