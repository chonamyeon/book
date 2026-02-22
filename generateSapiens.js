import fs from 'fs';
import path from 'path';
import { bookScripts } from './src/data/bookScripts.js';

const API_KEY = 'AIzaSyA_IW1ltZSZM9RxVi7xBRgRtK4O1anVGVU';
const OUTPUT_DIR = './public/audio';

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

async function generatePodcast(id, script) {
    const outputPath = path.join(OUTPUT_DIR, `${id}.mp3`);
    console.log(`\nGenerating [${id}]...`);

    const buffers = [];

    for (let i = 0; i < script.length; i++) {
        const segment = script[i];
        try {
            const voice = segment.role === 'A' ? 'ko-KR-Chirp3-HD-Achird' : 'ko-KR-Chirp3-HD-Leda';
            const cleanText = segment.text.trim();
            const escapedContent = escapeXml(cleanText);

            const ssml = `<speak><p>${escapedContent}</p></speak>`;

            const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { ssml },
                    voice: { languageCode: 'ko-KR', name: voice },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: 1.02,
                        pitch: 0.0
                    }
                })
            });

            const data = await response.json();
            if (data.audioContent) {
                buffers.push(Buffer.from(data.audioContent, 'base64'));
                // 0.6s silence between turns
                const silence = Buffer.alloc(28800, 0);
                buffers.push(silence);
                process.stdout.write(`.`);
            } else {
                console.error(`\nError:`, data);
            }
        } catch (err) {
            console.error(`\nFailed:`, err);
        }
    }

    if (buffers.length > 0) {
        if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(outputPath, Buffer.concat(buffers));
        console.log(`\n✅ Generated: ${outputPath}`);
    }
}

const sapiensScript = bookScripts.sapiens;
if (sapiensScript) {
    generatePodcast('sapiens', sapiensScript).catch(console.error);
} else {
    console.error("Sapiens script not found!");
}
