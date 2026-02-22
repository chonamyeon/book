// sayno 팟캐스트만 단독 생성
import fs from 'fs';
import path from 'path';
import { bookScripts } from './src/data/bookScripts.js';

const API_KEY = 'AIzaSyA_IW1ltZSZM9RxVi7xBRgRtK4O1anVGVU';
const OUTPUT_DIR = './public/audio';

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
        }
    });
}

async function generateSayno() {
    const script = bookScripts['sayno'];
    const outputPath = path.join(OUTPUT_DIR, 'sayno.mp3');
    console.log('\n🎙️  세이노의 가르침 팟캐스트 재생성 시작...');

    const buffers = [];

    for (let i = 0; i < script.length; i++) {
        const segment = script[i];
        try {
            const voice = segment.role === 'A' ? 'ko-KR-Chirp3-HD-Achird' : 'ko-KR-Chirp3-HD-Leda';
            const cleanText = segment.text.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
            const escapedContent = escapeXml(cleanText);

            const ssmlText = escapedContent
                .replace(/,/g, ', <break time="200ms"/>')
                .replace(/\?/g, '? <break time="350ms"/>')
                .replace(/\!/g, '! <break time="350ms"/>')
                .replace(/\. /g, '. <break time="450ms"/>')
                .replace(/\.\n/g, '. <break time="450ms"/>');

            const ssml = `<speak><prosody rate="1.0" pitch="0st" volume="+1dB">${ssmlText}</prosody></speak>`;

            const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { ssml },
                    voice: { languageCode: 'ko-KR', name: voice },
                    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: 0.0 }
                })
            });

            const data = await response.json();
            if (data.audioContent) {
                buffers.push(Buffer.from(data.audioContent, 'base64'));
                const silence = Buffer.alloc(24000, 0); // ~500ms silence
                buffers.push(silence);
                process.stdout.write(`  [${i + 1}/${script.length}] ✓\n`);
            } else {
                console.error(`\n❌ 오류 - segment ${i}:`, JSON.stringify(data));
            }
        } catch (err) {
            console.error(`\n❌ 실패 - segment ${i}:`, err.message);
        }
    }

    if (buffers.length > 0) {
        if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(outputPath, Buffer.concat(buffers));
        console.log(`\n✅ 완료! → public/audio/sayno.mp3 (${(Buffer.concat(buffers).length / 1024 / 1024).toFixed(2)} MB)`);
    }
}

generateSayno().catch(console.error);
