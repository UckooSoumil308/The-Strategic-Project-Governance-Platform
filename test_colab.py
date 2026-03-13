import requests
import os
from dotenv import load_dotenv

def test_connection():
    # 1. Load the URL
    dotenv_path = os.path.join(os.path.dirname(__file__), 'mini_proj', 'server', '.env')
    load_dotenv(dotenv_path)
    url = os.getenv("COLAB_JUDGE_URL", "NOT_FOUND").rstrip('/')
    
    print(f"--- DIAGNOSTIC START ---")
    print(f"Target URL: {url}")
    
    if url == "NOT_FOUND":
        print("ERROR: COLAB_JUDGE_URL not found in .env file!")
        return

    # 2. Test Health Endpoint
    print(f"\n1. Testing health endpoint...")
    try:
        health_resp = requests.get(f"{url}/health", timeout=10, headers={"ngrok-skip-browser-warning": "69420"})
        print(f"Status Code: {health_resp.status_code}")
        print(f"Response: {health_resp.text}")
    except Exception as e:
        print(f"FAILED to reach health endpoint: {e}")

    # 3. Test dummy generation (short prompt)
    print(f"\n2. Testing dummy schedule generation (short prompt)...")
    payload = {"project_description": "Add a single task called 'Test'"}
    try:
        gen_resp = requests.post(
            f"{url}/api/ai/generate-schedule",
            json=payload,
            headers={"ngrok-skip-browser-warning": "69420", "Content-Type": "application/json"},
            timeout=120
        )
        print(f"Status Code: {gen_resp.status_code}")
        if gen_resp.status_code == 200:
            print("SUCCESS! AI is working.")
        else:
            print(f"FAILED! Response Body: {gen_resp.text}")
    except Exception as e:
        print(f"FAILED to reach generation endpoint: {e}")

    print(f"\n--- DIAGNOSTIC END ---")

if __name__ == "__main__":
    test_connection()
