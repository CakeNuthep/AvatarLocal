import os
import sys
import urllib.request
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import subprocess
import base64
import json
import shutil

PORT = 5002
MODEL_DIR = os.path.join("resource", "tts")
DEFAULT_MODEL = "en_US-lessac-medium"

def check_and_download_model(model_name: str) -> tuple[bool, str]:
    """
    Checks if the model ONNX and JSON files exist locally.
    If missing, automatically downloads them from Rhasspy's Hugging Face repository.
    """
    onnx_path = os.path.join(MODEL_DIR, f"{model_name}.onnx")
    json_path = os.path.join(MODEL_DIR, f"{model_name}.onnx.json")

    if os.path.exists(onnx_path) and os.path.exists(json_path):
        return True, onnx_path

    try:
        # Reconstruct Hugging Face URL structure from model name
        # e.g., en_US-lessac-medium -> en/en_US/lessac/medium/en_US-lessac-medium.onnx
        parts = model_name.split("-")
        if len(parts) < 3:
            return False, f"Invalid model name format: {model_name}"

        lang_code = parts[0]                  # e.g., en_US
        lang_family = lang_code.split("_")[0] # e.g., en
        voice_name = parts[1]                 # e.g., lessac
        quality = parts[2]                    # e.g., medium

        onnx_url = f"https://huggingface.co/rhasspy/piper-voices/resolve/main/{lang_family}/{lang_code}/{voice_name}/{quality}/{model_name}.onnx"
        json_url = f"https://huggingface.co/rhasspy/piper-voices/resolve/main/{lang_family}/{lang_code}/{voice_name}/{quality}/{model_name}.onnx.json"

        os.makedirs(MODEL_DIR, exist_ok=True)

        print(f"\n[INFO] Model '{model_name}' not found locally.")
        print(f"[INFO] Downloading ONNX from: {onnx_url}")
        urllib.request.urlretrieve(onnx_url, onnx_path)
        print(f"[INFO] Downloading config from: {json_url}")
        urllib.request.urlretrieve(json_url, json_path)
        print("[INFO] Model download completed successfully.")
        return True, onnx_path
    except Exception as e:
        # Clean up partial files if download failed
        if os.path.exists(onnx_path):
            os.remove(onnx_path)
        if os.path.exists(json_path):
            os.remove(json_path)
        return False, f"Failed to auto-download model from Hugging Face: {str(e)}"

def run_rhubarb(wav_path: str) -> list:
    """
    Runs the Rhubarb Lip Sync CLI on the generated WAV file.
    Returns a parsed list of mouth cues, or an empty list if Rhubarb is not installed/fails.
    """
    rhubarb_bin = shutil.which("rhubarb")
    if not rhubarb_bin:
        rhubarb_bin = "rhubarb"  # Fallback to path

    cmd = [
        rhubarb_bin,
        "-f", "json",
        wav_path
    ]

    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = process.communicate()
        if process.returncode == 0:
            parsed = json.loads(stdout.decode("utf-8", errors="ignore"))
            return parsed.get("mouthCues", [])
        else:
            # Non-blocking warning
            print(f"[WARN] Rhubarb process returned error: {stderr.decode('utf-8', errors='ignore')}")
            return []
    except Exception as e:
        print(f"[INFO] Rhubarb CLI not available: {str(e)}")
        return []

class PiperHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed_url.query)

        # Only handle requests on the root path
        if parsed_url.path != "/":
            self.send_response(404)
            self.end_headers()
            return

        text = params.get("text", [""])[0]
        speaker = params.get("speaker", [DEFAULT_MODEL])[0]

        if not text:
            self.send_response(400)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Error: Missing required 'text' query parameter.")
            return

        # Ensure model is ready (either locally present or auto-downloaded)
        success, model_path_or_err = check_and_download_model(speaker)
        if not success:
            self.send_response(500)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(f"Error: {model_path_or_err}".encode("utf-8"))
            return

        # Run synthesis using Piper CLI in the virtual environment
        import uuid
        temp_wav_path = os.path.join(MODEL_DIR, f"temp_{uuid.uuid4().hex}.wav")
        try:
            # Locate piper binary in virtualenv Scripts
            python_dir = os.path.dirname(sys.executable)
            piper_bin = os.path.join(python_dir, "piper.exe")
            if not os.path.exists(piper_bin):
                piper_bin = "piper"  # Fallback to system path

            # Write directly to a temporary file path to bypass the Windows permission bug
            cmd = [
                piper_bin,
                "--model", model_path_or_err,
                "--output_file", temp_wav_path
            ]

            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Send text to stdin to synthesize
            _, stderr = process.communicate(input=text.encode("utf-8"))

            if process.returncode == 0 and os.path.exists(temp_wav_path):
                # Read the synthesized WAV data
                with open(temp_wav_path, "rb") as f:
                    wav_data = f.read()

                # Generate viseme cues using Rhubarb (if available)
                cues = run_rhubarb(temp_wav_path)

                # Base64 encode the audio data
                audio_b64 = base64.b64encode(wav_data).decode("utf-8")

                # Prepare envelope payload
                payload = {
                    "audio": audio_b64,
                    "cues": cues
                }

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                # Prevent CORS issues if called directly by browser
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(payload).encode("utf-8"))
            else:
                self.send_response(500)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(f"Piper Engine Error: {stderr.decode('utf-8', errors='ignore')}".encode("utf-8"))

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(f"Server Error: {str(e)}".encode("utf-8"))
        finally:
            # Clean up the temporary WAV file
            if os.path.exists(temp_wav_path):
                try:
                    os.remove(temp_wav_path)
                except Exception:
                    pass

def run():
    print(f"Starting zero-dependency Piper HTTP Server on http://127.0.0.1:{PORT}")
    print(f"Using models directory: {os.path.abspath(MODEL_DIR)}")
    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, PiperHTTPRequestHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Piper HTTP Server...")
        httpd.server_close()

if __name__ == "__main__":
    run()
