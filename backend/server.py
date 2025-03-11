from flask import Flask, jsonify, request, send_from_directory, Response # type: ignore
from flask_cors import CORS # type: ignore
import subprocess
import time
import os
import json
import atexit

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

OUTPUT_FOLDER = os.path.join(os.getcwd(), "generated_images")
PROMPT_FILE = os.path.join(os.getcwd(), "backend/prompt.txt")
SELECTED_IMAGES_FILE = os.path.join(os.getcwd(), "backend/selected_images.txt")

generation_process = None

@app.route("/")
def home():
    return jsonify({"message": "Server is running. Use /generate-images to generate images."})

@app.route("/save-selected-captions", methods=["POST"])
def save_selected_captions():
    try:
        data = request.get_json()
        selected_captions = data.get("selectedCaptions", [])

        if not isinstance(selected_captions, list):
            return jsonify({"error": "Invalid data format"}), 400

        print("Received selected captions:", selected_captions)

        # Save to selected_images.txt (overwrite with new selections)
        with open(SELECTED_IMAGES_FILE, "w") as f:
            for caption in selected_captions:
                f.write(caption + "\n")

        return jsonify({"message": "Captions saved successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/generated_images/<filename>")
def serve_image(filename):
    if not os.path.exists(os.path.join(OUTPUT_FOLDER, filename)):
        return jsonify({"error": "File not found"}), 404
    return send_from_directory(OUTPUT_FOLDER, filename)

@app.route("/generate-images", methods=["GET"])
def generate_images():
    try:
        prompt = request.args.get("prompt", "").strip()

        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400
        
        # Write only the latest prompt to the text file
        with open(PROMPT_FILE, "w") as f:  # Overwrite the file with the latest prompt
            f.write(prompt)

        def stream():
            global generation_process
            os.makedirs(OUTPUT_FOLDER, exist_ok=True)
            existing_files = set(os.listdir(OUTPUT_FOLDER))

            command = "CUDA_VISIBLE_DEVICES=0,1 python -m torch.distributed.run --nproc_per_node=2 backend/main.py"
            generation_process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

            # Print logs for debugging
            for line in generation_process.stdout:
                print("[STDOUT]", line.strip())  # Print standard output
            for line in generation_process.stderr:
                print("[STDERR]", line.strip())  # Print errors


            while generation_process.poll() is None:
                current_files = set(os.listdir(OUTPUT_FOLDER))
                new_files = current_files - existing_files

                for new_file in new_files:
                    if new_file.endswith(".png"):
                        yield f"data: {json.dumps({'image_path': f'/generated_images/{new_file}'})}\n\n"

                existing_files = current_files
                time.sleep(1)

            yield "event: end\ndata: {}\n\n"

        return Response(stream(), content_type="text/event-stream")

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/stop-generation", methods=["POST"])
def stop_generation():
    global generation_process
    try:
        if generation_process and generation_process.poll() is None:
            print("Stopping image generation process...")
            with open(PROMPT_FILE, "w") as f:
                f.write("STOP")
            generation_process.terminate()  # Try to terminate gracefully
            generation_process.wait()  # Ensure it exits
            print("Image generation stopped.")

        return jsonify({"message": "Image generation stopped"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def cleanup():
    global generation_process
    if generation_process and generation_process.poll() is None:
        print("Cleaning up process before exit...")
        generation_process.terminate()
        generation_process.wait()
    
atexit.register(cleanup)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8001, debug=True)
