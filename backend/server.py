from flask import Flask, jsonify, request
from flask_cors import CORS
import torch.distributed as dist
import subprocess
import time
import os

app = Flask(__name__)
CORS(app)

@app.route("/generate-images", methods=["POST"])
def generate_images():
    try:
        data = request.get_json()
        prompt = data.get("prompt")  # Get the prompt from the request

        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400
        # Set env variables
        env = os.environ.copy()
        env["CUDA_VISIBLE_DEVICES"] = "0,1"

        start_time = time.time()

        # Run the command
        command = f"CUDA_VISIBLE_DEVICES=0,1 python -m torch.distributed.run --nproc_per_node=2 backend/main.py --prompt '{prompt}'"
        result = subprocess.run(command, shell=True)

        total_time = time.time() - start_time

        if result.returncode != 0:
            return jsonify({
                "error": result.stderr.strip() if result.stderr else None
            }), 500
        
        return jsonify({
            "time_taken": f"{total_time:.2f} seconds"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8001, debug=True)
