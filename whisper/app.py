
import os
import tempfile
import subprocess
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel

app = Flask(__name__)

# Load model on startup (running on CPU for compatibility, can be changed to cuda)
# 'tiny', 'base', 'small', 'medium', 'large'
MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")
print(f"Loading Whisper Model: {MODEL_SIZE}...")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
print("Model loaded.")

def convert_to_wav(input_path):
    """Converts input audio to 16kHz mono WAV using ffmpeg."""
    output_path = tempfile.mktemp(suffix=".wav")
    try:
        # ffmpeg -i input.ogg -ar 16000 -ac 1 -c:a pcm_s16le output.wav
        subprocess.check_call([
            "ffmpeg", "-y", "-i", input_path,
            "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
            output_path
        ], stderr=subprocess.DEVNULL)
        return output_path
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg conversion failed: {e}")
        return None

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # Save temp file
    temp_input = tempfile.mktemp(suffix=os.path.splitext(file.filename)[1] or ".tmp")
    file.save(temp_input)
    
    try:
        # Convert to WAV (Standardize input)
        wav_path = convert_to_wav(temp_input)
        if not wav_path:
             return jsonify({"error": "Audio conversion failed"}), 500

        # Transcribe
        segments, info = model.transcribe(wav_path, beam_size=5)
        
        full_text = " ".join([segment.text for segment in segments])
        
        # Cleanup
        if os.path.exists(wav_path):
            os.remove(wav_path)
            
        return jsonify({
            "text": full_text.strip(),
            "language": info.language,
            "probability": info.language_probability
        })

    except Exception as e:
        print(f"Transcribe Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_input):
            os.remove(temp_input)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model": MODEL_SIZE})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
