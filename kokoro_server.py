import os
import sys
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
import base64
import json
import uuid

PORT = 5004
MODEL_DIR = os.path.join("resource", "kokoro")
MODEL_FILE = "kokoro-v1.0.onnx"
VOICES_FILE = "voices-v1.0.bin"

# URLs for Kokoro model and voice data
MODEL_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx"
VOICES_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"

# Global Kokoro instance
kokoro_instance = None

def check_and_download_model() -> tuple[bool, str]:
    """
    Checks if the Kokoro ONNX model and voices file exist locally.
    If missing, automatically downloads them.
    """
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, MODEL_FILE)
    voices_path = os.path.join(MODEL_DIR, VOICES_FILE)

    if os.path.exists(model_path) and os.path.exists(voices_path):
        return True, "Model is ready"

    try:
        if not os.path.exists(model_path):
            print(f"\n[INFO] Kokoro ONNX model not found locally.")
            print(f"[INFO] Downloading model from: {MODEL_URL}")
            urllib.request.urlretrieve(MODEL_URL, model_path)
            print("[INFO] Model download completed successfully.")

        if not os.path.exists(voices_path):
            print(f"\n[INFO] Kokoro voice data not found locally.")
            print(f"[INFO] Downloading voice data from: {VOICES_URL}")
            urllib.request.urlretrieve(VOICES_URL, voices_path)
            print("[INFO] Voice data download completed successfully.")

        return True, "Model is ready"
    except Exception as e:
        # Clean up partial files on failure
        if os.path.exists(model_path):
            try: os.remove(model_path)
            except Exception: pass
        if os.path.exists(voices_path):
            try: os.remove(voices_path)
            except Exception: pass
        return False, f"Failed to download Kokoro files: {str(e)}"

def has_thai(text: str) -> bool:
    """
    Returns True if the text contains Thai unicode characters.
    """
    return any(0x0e00 <= ord(c) <= 0x0e7f for c in text)

def romanize_thai(text: str) -> str:
    """
    A basic rule-based phonetic transliterator for Thai text to allow
    English TTS models like Kokoro/espeak to pronounce Thai words phonetically.
    """
    consonants = {
        'ก': 'k', 'ข': 'kh', 'ค': 'kh', 'ฆ': 'kh', 'ง': 'ng',
        'จ': 'ch', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's', 'ฌ': 'ch',
        'ญ': 'y', 'ฎ': 'd', 'ฏ': 't', 'ฐ': 'th', 'ฑ': 'th',
        'ฒ': 'th', 'ณ': 'n', 'ด': 'd', 'ต': 't', 'ถ': 'th',
        'ท': 'th', 'ธ': 'th', 'น': 'n', 'บ': 'b', 'ป': 'p',
        'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph', 'ฟ': 'f', 'ภ': 'ph',
        'ม': 'm', 'ย': 'y', 'ร': 'r', 'ล': 'l', 'ว': 'w',
        'ศ': 's', 'ษ': 's', 'ส': 's', 'ห': 'h', 'ฬ': 'l',
        'อ': 'o', 'ฮ': 'h'
    }
    
    vowels = {
        'ะ': 'a', 'า': 'a', 'ิ': 'i', 'ี': 'i', 'ึ': 'ue',
        'ื': 'ue', 'ุ': 'u', 'ู': 'u', '็': '', '์': '',
        'ั': 'a', 'ํ': 'am', 'ๅ': 'a', 'ๆ': '', 'ฯ': ''
    }
    
    prefixes = {
        'เ': 'e', 'แ': 'ae', 'โ': 'o', 'ใ': 'ai', 'ไ': 'ai'
    }
    
    numerals = {
        '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
        '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
    }
    
    result = []
    i = 0
    n = len(text)
    
    while i < n:
        char = text[i]
        
        if char in numerals:
            result.append(numerals[char])
            i += 1
            continue
            
        if char in prefixes:
            pref_val = prefixes[char]
            if i + 1 < n and text[i+1] in consonants:
                cons_val = consonants[text[i+1]]
                vow_val = ''
                next_idx = i + 2
                if next_idx < n and text[next_idx] in vowels:
                    vow_val = vowels[text[next_idx]]
                    next_idx += 1
                result.append(cons_val + pref_val + vow_val)
                i = next_idx
                continue
            else:
                result.append(pref_val)
                i += 1
                continue
                
        if char in consonants:
            cons_val = consonants[char]
            vow_val = ''
            next_idx = i + 1
            while next_idx < n and text[next_idx] in ['่', '้', '๊', '๋', '็', '์', 'ๆ']:
                next_idx += 1
            if next_idx < n and text[next_idx] in vowels:
                vow_val = vowels[text[next_idx]]
                next_idx += 1
            elif next_idx < n and text[next_idx] == 'ั':
                vow_val = 'a'
                next_idx += 1
                
            result.append(cons_val + vow_val)
            i = next_idx
            continue
            
        if char in vowels:
            result.append(vowels[char])
            i += 1
            continue
            
        result.append(char)
        i += 1
        
    romanized = "".join(result)
    
    # Common pronunciation adjustments
    substitutions = {
        'khrub': 'krap',
        'sawasdi': 'sawatdee',
        'sawas': 'sawat',
        'yindee': 'yindee',
        'khongkhun': 'khong-khun',
        'thilae': 'thee-dae'
    }
    for k, v in substitutions.items():
        romanized = romanized.replace(k, v)
        
    return romanized

class KokoroHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global kokoro_instance

        parsed_url = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed_url.query)

        if parsed_url.path != "/":
            self.send_response(404)
            self.end_headers()
            return

        text = params.get("text", [""])[0]
        speaker = params.get("speaker", ["af_sarah"])[0]

        if not text:
            self.send_response(400)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Error: Missing required 'text' query parameter.")
            return

        # Ensure soundfile is imported
        try:
            import soundfile as sf
        except ImportError:
            self.send_response(500)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Error: Required Python library 'soundfile' is not installed.")
            return

        # Check model initialized
        if not kokoro_instance:
            self.send_response(500)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Error: Kokoro ONNX model is not loaded.")
            return

        # Pre-process Thai characters to phonetic fallback representation
        if has_thai(text):
            romanized_text = romanize_thai(text)
            print(f"[DEBUG Kokoro Server] Thai detected. Romanized text from '{text}' to '{romanized_text}'")
            text = romanized_text

        temp_wav_path = os.path.join(MODEL_DIR, f"temp_{uuid.uuid4().hex}.wav")
        try:
            # Determine language code based on speaker
            lang_code = "en-us"
            if speaker.startswith("bf_") or speaker.startswith("bm_"):
                lang_code = "en-gb"
            elif speaker.startswith("jf_") or speaker.startswith("jm_"):
                lang_code = "ja"
            elif speaker.startswith("zf_") or speaker.startswith("zm_"):
                lang_code = "zh"
            elif speaker.startswith("ef_") or speaker.startswith("em_"):
                lang_code = "es"
            elif speaker.startswith("ff_"):
                lang_code = "fr"
            elif speaker.startswith("hf_") or speaker.startswith("hm_"):
                lang_code = "hi"

            samples, sample_rate = kokoro_instance.create(
                text,
                voice=speaker,
                speed=1.0,
                lang=lang_code
            )

            # Save float32 samples to temporary PCM 16-bit WAV file
            sf.write(temp_wav_path, samples, sample_rate, subtype='PCM_16')

            with open(temp_wav_path, "rb") as f:
                wav_data = f.read()

            audio_b64 = base64.b64encode(wav_data).decode("utf-8")

            payload = {
                "audio": audio_b64,
                "cues": []
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode("utf-8"))

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(f"Server Error: {str(e)}".encode("utf-8"))
        finally:
            if os.path.exists(temp_wav_path):
                try: os.remove(temp_wav_path)
                except Exception: pass

def run():
    global kokoro_instance
    # Make sure download directory exists
    os.makedirs(MODEL_DIR, exist_ok=True)
    success, msg = check_and_download_model()
    if not success:
        print(f"[ERROR] Failed to initialize model files: {msg}")
        sys.exit(1)
        
    try:
        from kokoro_onnx import Kokoro
        model_path = os.path.join(MODEL_DIR, MODEL_FILE)
        voices_path = os.path.join(MODEL_DIR, VOICES_FILE)
        print("Loading Kokoro ONNX model into memory (this will take a few seconds)...")
        kokoro_instance = Kokoro(model_path, voices_path)
        print("Kokoro ONNX model loaded successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to load Kokoro ONNX model: {e}")
        sys.exit(1)
        
    print(f"Starting zero-dependency Kokoro-82M HTTP Server on http://127.0.0.1:{PORT}")
    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, KokoroHTTPRequestHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Kokoro HTTP Server...")
        httpd.server_close()

if __name__ == "__main__":
    run()
