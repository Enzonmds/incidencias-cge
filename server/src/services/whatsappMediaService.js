
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Helper to download media
// Returns: { type: 'image'|'document'|'audio', url: 'http://localhost:3001/uploads/filename.ext', filename: 'filename.ext' }
export const downloadWhatsAppMedia = async (mediaId, mediaType) => {
    try {
        if (!mediaId) return null;

        console.log(`📥 Downloading Media ID: ${mediaId} (${mediaType})...`);

        // 1. Get URL from Meta
        // Note: Use a dedicated error catch for this step to distinguish from download errors
        let urlRes;
        try {
            urlRes = await axios.get(`https://graph.facebook.com/v17.0/${mediaId}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (e) {
            console.error(`❌ Meta API Error (Get URL): ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
            return null;
        }

        const remoteUrl = urlRes.data.url;
        const mimeType = urlRes.data.mime_type;
        console.log(`🔗 Media URL Resolved: ${remoteUrl.substring(0, 50)}... [${mimeType}]`);

        // 2. Determine Extension
        let ext = 'bin';
        if (mimeType.includes('image/jpeg')) ext = 'jpg';
        else if (mimeType.includes('image/png')) ext = 'png';
        else if (mimeType.includes('application/pdf')) ext = 'pdf';
        else if (mimeType.includes('audio/ogg')) ext = 'ogg';
        else if (mimeType.includes('audio/mpeg')) ext = 'mp3';
        else if (mimeType.includes('spreadsheet')) ext = 'xlsx';

        // 3. Download Binary
        // IMPORTANT: Accessing the Media URL requires the SAME Access Token.
        const fileRes = await axios.get(remoteUrl, {
            responseType: 'arraybuffer',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'User-Agent': 'Node.js/TicketeraCGE' // Sometimes helps
            }
        });

        // 4. Save to Disk
        const filename = `wa_${mediaId}_${Date.now()}.${ext}`;
        const outputDir = path.join(process.cwd(), 'public', 'uploads');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filePath = path.join(outputDir, filename);
        fs.writeFileSync(filePath, fileRes.data);

        console.log(`✅ File saved to: ${filePath}`);

        const publicUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${filename}`;

        return {
            url: publicUrl,
            filename: filename,
            mimeType: mimeType,
            filePath: filePath // Return local path for Whisper
        };

    } catch (error) {
        console.error('❌ Error downloading media:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            // Try to parse arraybuffer error if possible, though unlikely to be JSON
        }
        return null;
    }
};
