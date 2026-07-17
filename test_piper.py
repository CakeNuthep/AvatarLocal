import os
import urllib.request
import sys
import subprocess

MODEL_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx"
CONFIG_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json"

MODEL_DIR = os.path.join("resource", "tts")
MODEL_PATH = os.path.join(MODEL_DIR, "en_US-lessac-medium.onnx")
CONFIG_PATH = os.path.join(MODEL_DIR, "en_US-lessac-medium.onnx.json")
OUTPUT_PATH = "output_test.wav"

def download_file(url, dest):
    print(f"Downloading {url} to {dest}...")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    urllib.request.urlretrieve(url, dest)
    print("Download completed.")

def main():
    # 1. Download model if missing
    if not os.path.exists(MODEL_PATH):
        download_file(MODEL_URL, MODEL_PATH)
    if not os.path.exists(CONFIG_PATH):
        download_file(CONFIG_URL, CONFIG_PATH)

    # 2. Run synthesis using piper CLI in the current virtual environment
    text = "Hello! I am your AI avatar. I am running locally on your computer."
    print(f"Synthesizing text: '{text}'")

    # Determine command to run Piper CLI
    python_exe = sys.executable
    print(f"Running via: {python_exe}")
    
    # Piper can be run as a module or executable. The python package installs a 'piper' script or we can import it.
    # Alternatively, we can use the python module if imported. Let's run the piper CLI command.
    try:
        # Piper CLI is usually installed in virtualenv Scripts
        piper_bin = os.path.join(os.path.dirname(python_exe), "piper.exe")
        if not os.path.exists(piper_bin):
            piper_bin = "piper" # Fallback to path

        cmd = [
            piper_bin,
            "--model", MODEL_PATH,
            "--config", CONFIG_PATH,
            "--output_file", OUTPUT_PATH
        ]
        
        print(f"Executing: {' '.join(cmd)}")
        process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate(input=text)
        
        if process.returncode == 0:
            print(f"Success! Saved synthesized audio to: {os.path.abspath(OUTPUT_PATH)}")
        else:
            print(f"Error during synthesis (exit code {process.returncode}):")
            print(stderr)
    except Exception as e:
        print(f"Failed to run synthesis: {e}")

if __name__ == "__main__":
    main()
