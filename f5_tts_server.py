import os
import sys
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
import base64
import json
import uuid

# Configure torchaudio to use soundfile backend to avoid torchcodec requirement on Windows
try:
    import torchaudio
    import torch
    import soundfile as sf
    _orig_torchaudio_load = torchaudio.load
    def _safe_torchaudio_load(filepath, **kwargs):
        try:
            data, samplerate = sf.read(filepath, dtype='float32')
            tensor = torch.from_numpy(data)
            if tensor.ndim == 1:
                tensor = tensor.unsqueeze(0)
            elif tensor.ndim == 2:
                tensor = tensor.T
            return tensor, samplerate
        except Exception:
            return _orig_torchaudio_load(filepath, **kwargs)
    torchaudio.load = _safe_torchaudio_load
except Exception:
    pass



PORT = 5005
MODEL_DIR = os.path.join("resource", "f5")
DEFAULT_REF_AUDIO = os.path.join(MODEL_DIR, "ref.wav")
DEFAULT_REF_TEXT = os.path.join(MODEL_DIR, "ref.txt")

# Global F5-TTS instance and engine flag
f5_instance = None
use_th_package = False

def has_thai(text: str) -> bool:
    """
    Returns True if the text contains Thai unicode characters.
    """
    return any(0x0e00 <= ord(c) <= 0x0e7f for c in text)

def romanize_thai(text: str) -> str:
    """
    A basic rule-based phonetic transliterator for Thai text to allow
    English/Multilingual TTS models to pronounce Thai words phonetically.
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

class F5TTSHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global f5_instance, use_th_package

        parsed_url = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed_url.query)

        if parsed_url.path != "/":
            self.send_response(404)
            self.end_headers()
            return

        text = params.get("text", [""])[0]
        ref_audio = params.get("ref_audio", [DEFAULT_REF_AUDIO])[0]
        ref_text = params.get("ref_text", [""])[0]

        if not text:
            self.send_response(400)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Error: Missing required 'text' query parameter.")
            return

        # Check model loaded
        if not f5_instance:
            self.send_response(500)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Error: F5-TTS model is not loaded. Ensure pip install f5-tts-th is run.")
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

        # Resolve ref_audio and ref_text paths and check existence
        if not os.path.exists(ref_audio):
            # Fallback check for output_test.wav in project root if default fails
            if ref_audio == DEFAULT_REF_AUDIO and os.path.exists("output_test.wav"):
                ref_audio = "output_test.wav"
                print(f"[DEBUG F5 Server] ref.wav missing. Using project output_test.wav instead.")
            else:
                self.send_response(400)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                error_msg = (
                    f"Error: Reference audio file '{ref_audio}' does not exist.\n"
                    "Please place your reference audio wav file in 'resource/f5/ref.wav' and its text transcript in 'resource/f5/ref.txt'."
                )
                self.wfile.write(error_msg.encode("utf-8"))
                return

        # Fetch transcription for reference if empty
        if not ref_text:
            ref_txt_path = ref_audio + ".txt" if ref_audio != "output_test.wav" else DEFAULT_REF_TEXT
            if os.path.exists(ref_txt_path):
                with open(ref_txt_path, "r", encoding="utf-8") as f:
                    ref_text = f.read().strip()
            elif os.path.exists(DEFAULT_REF_TEXT):
                with open(DEFAULT_REF_TEXT, "r", encoding="utf-8") as f:
                    ref_text = f.read().strip()
            else:
                ref_text = "This is the reference voice clip." # Fallback transcript guess

        temp_wav_path = os.path.join(MODEL_DIR, f"temp_{uuid.uuid4().hex}.wav")
        try:
            print(f"[DEBUG F5 Server] Synthesizing text: '{text}' using ref: '{ref_audio}' with transcript: '{ref_text}'")
            if use_th_package:
                res = f5_instance.infer(
                    ref_audio=ref_audio,
                    ref_text=ref_text,
                    gen_text=text
                )
                if isinstance(res, tuple):
                    audio = res[0]
                    sample_rate = res[1] if len(res) > 1 else 24000
                else:
                    audio = res
                    sample_rate = 24000
            else:
                if has_thai(text):
                    text = romanize_thai(text)
                audio, sample_rate, _spect = f5_instance.infer(
                    ref_file=ref_audio,
                    ref_text=ref_text,
                    gen_text=text
                )

            # Save float32 samples to temporary PCM 16-bit WAV file
            sf.write(temp_wav_path, audio, sample_rate, subtype='PCM_16')

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
            import traceback
            traceback.print_exc()
            self.send_response(500)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(f"Server Error: {str(e)}".encode("utf-8"))
        finally:
            if os.path.exists(temp_wav_path):
                try: os.remove(temp_wav_path)
                except Exception: pass

def run():
    global f5_instance, use_th_package
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # Try to initialize f5_tts_th first for native Thai support, then fallback to base f5_tts
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
        try:
            from f5_tts_th.tts import TTS as F5TTS_TH
            print(f"Loading native Thai F5-TTS-TH model on {device.upper()}...", flush=True)
            f5_instance = F5TTS_TH(model="v1")
            use_th_package = True
            print("F5-TTS-TH Thai model loaded successfully.", flush=True)
        except Exception as e_th:
            print(f"[INFO] Native f5-tts-th not loaded ({e_th}). Falling back to base F5-TTS...", flush=True)
            from f5_tts.api import F5TTS
            f5_instance = F5TTS(device=device)
            use_th_package = False
            print("Base F5-TTS model loaded successfully.", flush=True)
    except Exception as e:
        print(f"[WARN] Failed to load F5-TTS model on startup: {e}", flush=True)
        print("[WARN] F5-TTS will not be available until dependencies are resolved.", flush=True)
        
    print(f"Starting zero-dependency F5-TTS HTTP Server on http://127.0.0.1:{PORT}", flush=True)
    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, F5TTSHTTPRequestHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down F5-TTS HTTP Server...")
        httpd.server_close()

if __name__ == "__main__":
    run()

