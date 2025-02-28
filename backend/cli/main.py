"""
Script running the AsyncDiff model in a command-line interface (CLI).
Prompts are to be written in prompt.txt, and generated images will be stored in a generated_images folder.
"""
import sys
import os

# Add the parent directory (backend/) to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
from PIL import Image
from diffusers import StableDiffusionPipeline
from AsyncDiff.asyncdiff.async_sd import AsyncDiff
import torch
import time

IMG_WIDTH = 768
IMG_HEIGHT = 768
NUM_IMAGES = 1
OUTPUT_FOLDER = "generated_images"
PROMPT_FILE = "prompt.txt"

pipeline = StableDiffusionPipeline.from_pretrained(
        "stabilityai/stable-diffusion-2-1",
        torch_dtype=torch.float16,
        use_safetensors=True,
        low_cpu_mem_usage=True,
    ).to("cuda")

def load_prompt():
    """Load prompt from the shared file."""
    if os.path.exists(PROMPT_FILE):
        with open(PROMPT_FILE, "r") as f:
            prompt = f.read().strip()
            if prompt:
                return prompt
    return ""

def initialize_async_diff(pipeline):
    """Initialize AsyncDiff."""
    async_diff = AsyncDiff(pipeline, model_n=2, stride=1, time_shift=False)
    async_diff.reset_state(warm_up=1)
    print("AsyncDiff initialized.")
    return async_diff

def generate_and_save_images(prompt, num_images):
    """Generate and save images one at a time."""
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    
    for i in range(num_images):
        start_time = time.time()
        
        # Generate a single image
        image = pipeline(prompt).images[0]
        print(f"Image {i + 1} generated in {time.time() - start_time:.2f} seconds.")
        
        # Save the image
        timestamp = int(time.time() * 1000) # Create unique timestamp for filename
        filename = f"{prompt.replace(' ', '_')}_{timestamp}_{i + 1}.png"
        filepath = os.path.join(OUTPUT_FOLDER, filename)
        image.save(filepath)
        print(f"Image saved: {filepath}")
        
        yield filepath  # Yield the path for real-time processing or streaming

def main():
    print("Listening for prompts... Press Ctrl+C or close the terminal to exit.")

    try:
        while True:
            prompt = load_prompt()
            if prompt:
                print(f"Generating images for prompt: {prompt}")
                for filepath in generate_and_save_images(prompt, NUM_IMAGES):
                    print(f"Image available at: {filepath}")
            else:
                print("No prompts found. Waiting...")
            time.sleep(1)
    
    finally:
        # Clear the prompt file when exiting
        with open(PROMPT_FILE, "w") as f:
            f.write("")
        print("\nPrompt file cleared on exit.")

if __name__ == "__main__":
    main()
