import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from diffusers import StableDiffusionPipeline # type: ignore
from AsyncDiff.asyncdiff.async_sd import AsyncDiff
import torch.distributed as dist
import torch
import time
import atexit

IMG_WIDTH = 768
IMG_HEIGHT = 768
OUTPUT_FOLDER = "generated_images"
PROMPT_FILE = "backend/prompt.txt"
SELECTED_IMAGES_FILE = "backend/selected_images.txt"

def cleanup():
    if dist.is_initialized():
        dist.destroy_process_group()

def load_pipeline():
    pipeline = StableDiffusionPipeline.from_pretrained(
        "stabilityai/stable-diffusion-2-1",
        torch_dtype=torch.float16,
        use_safetensors=True,
        low_cpu_mem_usage=True,
    ).to("cuda")
    return pipeline


def load_prompts():
    """Load prompt from prompt.txt"""
    if not os.path.exists(PROMPT_FILE):
        print(f"Prompt file '{PROMPT_FILE}' not found.")
        return []
    
    with open(PROMPT_FILE, "r") as f:
        prompts = [line.strip() for line in f.readlines() if line.strip()]
        return prompts

def generate_and_save_images(pipeline, prompt):
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    
    start_time = time.time()

    # Generate the image using the pipeline
    image = pipeline(prompt).images[0]
    print(f"Rank {dist.get_rank()}: Image generated in {time.time() - start_time:.2f} seconds.")
    
    # Save the image only in 1 rank to prevent duplicates
    if dist.get_rank() == 0:
        timestamp = int(time.time() * 1000) # Create unique timestamp for filename
        filename = f"{prompt.replace(' ', '_')}_{timestamp}.png"
        filepath = os.path.join(OUTPUT_FOLDER, filename)
        image.save(filepath)
        print(f"Image saved: {filepath}")

        while not os.path.exists(filepath):
            time.sleep(0.1)  # Wait for file to be fully written

        yield filepath  # Yield the path for real-time processing or streaming


# Main function to run in a distributed setup
def main():
    # Run cleanup when script exits
    atexit.register(cleanup)

    # Initialisation
    pipeline = load_pipeline()
    async_diff = AsyncDiff(pipeline, model_n=2, stride=1, time_shift=False)
    async_diff.reset_state(warm_up=1)

    try:
        prompts = load_prompts()

        if prompts != []:
            for prompt in prompts:
                prompts = load_prompts()
                # Break condition
                if prompts == []:
                    print("Image generation stopped")
                    break

                print(f"Rank {dist.get_rank()}: Generating image for '{prompt}'")
                for filepath in generate_and_save_images(pipeline, prompt):
                    if dist.get_rank() == 0:
                        print(f"Rank {dist.get_rank()}: Image available at: {filepath}")
        else:
            print(f"Rank {dist.get_rank()}: No prompt found. Waiting...")
    
    finally:
        cleanup()

if __name__ == "__main__":
    main()
