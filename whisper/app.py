import os
import subprocess
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel

app = Flask(__name__)

# Load model (small is good balance for CPU)
# download_root can be mapped to a volume to persist the model
model_size = "small" 
model = WhisperModel(model_size, device="cpu", compute_type="int8", download_root="/root/.cache/huggingface")

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Save temp file
    input_path = f"/tmp/{file.filename}"
    file.save(input_path)

    try:
        # Convert to WAV (16kHz mono) if necessary, or let Whisper handle it. 
        # ffmpeg is safer for OGG/OPUS from WhatsApp.
        # output_path = input_path + ".wav"
        # subprocess.run(["ffmpeg", "-i", input_path, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", output_path, "-y"], check=True)
        
        # faster-whisper handles many formats directly via av/ffmpeg
        segments, info = model.transcribe(input_path, beam_size=5)

        text = " ".join([segment.text for segment in segments])

        return jsonify({
            "text": text.strip(),
            "language": info.language,
            "probability": info.language_probability
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # Cleanup
        if os.path.exists(input_path):
            os.remove(input_path)
        # if os.path.exists(output_path):
        #     os.remove(output_path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
