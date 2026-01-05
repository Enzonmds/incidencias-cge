
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
        const urlRes = await axios.get(`https://graph.facebook.com/v17.0/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` }
        });

        const remoteUrl = urlRes.data.url;
        const mimeType = urlRes.data.mime_type; // e.g., image/jpeg, application/pdf

        // 2. Determine Extension
        let ext = 'bin';
        if (mimeType === 'image/jpeg') ext = 'jpg';
        else if (mimeType === 'image/png') ext = 'png';
        else if (mimeType === 'application/pdf') ext = 'pdf';
        else if (mimeType === 'audio/ogg') ext = 'ogg'; // Voice notes
        else if (mimeType === 'audio/mpeg') ext = 'mp3';
        else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ext = 'xlsx';

        // 3. Download Binary
        const fileRes = await axios.get(remoteUrl, {
            responseType: 'arraybuffer',
            headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` }
        });

        // 4. Save to Disk
        const filename = `wa_${mediaId}_${Date.now()}.${ext}`;
        const outputDir = path.join(process.cwd(), 'public', 'uploads');

        // Ensure dir exists (already done by mkdir, but good practice)
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filePath = path.join(outputDir, filename);
        fs.writeFileSync(filePath, fileRes.data);

        console.log(`✅ File saved to: ${filePath}`);

        // 5. Return Public URL
        const publicUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${filename}`;

        return {
            url: publicUrl,
            filename: filename,
            mimeType: mimeType
        };

    } catch (error) {
        console.error('❌ Error downloading media:', error.message);
        return null;
    }
};
