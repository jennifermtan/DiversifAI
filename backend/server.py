import torch
from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
import subprocess
import time
import os
import json
import shlex

app = Flask(__name__)
CORS(app)

OUTPUT_FOLDER = os.path.join(os.getcwd(), "generated_images")

@app.route("/")
def home():
    return jsonify({"message": "Server is running. Use /generate-images to generate images."})

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

        def stream():
            os.makedirs(OUTPUT_FOLDER, exist_ok=True)
            existing_files = set(os.listdir(OUTPUT_FOLDER))

            command = f"CUDA_VISIBLE_DEVICES=0,1 python -m torch.distributed.run --nproc_per_node=2 backend/main.py --prompt {shlex.quote(prompt)}"
            process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

            while process.poll() is None:
                current_files = set(os.listdir(OUTPUT_FOLDER))
                new_files = current_files - existing_files
                for new_file in new_files:
                    if new_file.endswith(".png"):
                        # Send update to client for every new image
                        yield f"data: {json.dumps({'image_path': f'/generated_images/{new_file}'})}\n\n"
                existing_files = current_files
                time.sleep(1)

            for line in process.stderr:
                print(f"Process error: {line.strip()}")

            # Check for new files after the process
            current_files = set(os.listdir(OUTPUT_FOLDER))
            new_files = current_files - existing_files
            for new_file in new_files:
                if new_file.endswith(".png"):
                    yield f"data: {json.dumps({'image_path': f'/generated_images/{new_file}'})}\n\n"
            yield "event: end\ndata: {}\n\n"

        return Response(stream(), content_type="text/event-stream")

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8001, debug=True)
