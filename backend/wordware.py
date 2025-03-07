import json
import requests
from dotenv import load_dotenv
import os

load_dotenv()

def get_api_key():
    try:
        with open("backend/api_key.txt", "r") as file:
            return file.read().strip()
    except FileNotFoundError:
        print("Error: `api_key.txt` not found.")
    except Exception as e:
        print(f"Error reading API key: {e}")
    return None

API_KEY = get_api_key()

"""Interacts with the Wordware API to generate diverse variations of user prompts."""
def diversify_prompts(user_prompt):
    prompt_id = "3a371ca7-4225-45a2-905d-462e5d06d1c5"
    api_key = API_KEY

    if not api_key:
        print("API key is missing. Please check your environment variables.")
        return
    
    url = f"https://app.wordware.ai/api/released-app/{prompt_id}/run"
    payload = {"inputs": {"user_generation": user_prompt, "version": "^2.6"}}
    headers = {"Authorization": f"Bearer {api_key}"}

    try:
        response = requests.post(url, json=payload, headers=headers, stream=True)
        response.raise_for_status()  # Raises HTTPError for bad responses (4xx and 5xx)
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return

    new_prompts = []
    for line in response.iter_lines():
        if line:
            try:
                content = json.loads(line.decode("utf-8"))
                value = content.get("value", {})
                if value.get("type") == "outputs":
                    raw_output = value.get("values", {}).get("diverse_variations", "")
                    outputs = raw_output.split("\n")
                    for output in outputs:
                        output = output.strip()
                        if output:
                            parts = output.split(".", 1)
                            if len(parts) > 1:
                                new_prompts.append(parts[1].strip())
                            else:
                                print(f"Failed parsing wordware response: '{output}'")
            except json.JSONDecodeError:
                print("Failed to decode JSON response.")
    
    return new_prompts