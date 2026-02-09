import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

export const transcribeAudio = async (filePath) => {
    try {
        console.log(`🎙️ [WHISPER] Transcribing audio file: ${filePath}`);

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        // Call Local Whisper Microservice
        // Container-to-Container networking: http://whisper:5000
        const response = await axios.post('http://whisper:5000/transcribe', form, {
            headers: {
                ...form.getHeaders()
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        console.log('✅ Transcription Success:', response.data);
        return response.data.text || "[No se pudo transcribir el audio]";

    } catch (error) {
        console.error('❌ Whisper Transcription Error:', error.message);
        return "[Error al procesar audio por favor revise el archivo adjunto]";
    }
};
