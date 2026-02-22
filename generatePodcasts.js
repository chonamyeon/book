import fs from 'fs';
import path from 'path';
import { bookScripts } from './src/data/bookScripts.js';

const API_KEY = 'AIzaSyA_IW1ltZSZM9RxVi7xBRgRtK4O1anVGVU';
const OUTPUT_DIR = './public/audio';

/**
 * XML 특수 문자 이스케이프
 */
function escapeXml(unsafe) {
    if (!unsafe) return "";
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

/**
 * 텍스트를 SSML로 변환 (문장 간 휴식 추가)
 */
function convertToSsml(text) {
    const escaped = escapeXml(text);
    // 문장 마침표 뒤에 0.3초 휴식 추가하여 띄어읽기 최적화
    const sentences = escaped.split(/(?<=[.!?])\s+/);
    const ssmlContent = sentences
        .map(s => `<s>${s}</s>`)
        .join('<break time="350ms"/>');

    // 쉼표에 짧은 휴식 추가
    const withCommaBreaks = ssmlContent.replace(/,/g, ', <break time="150ms"/>');

    return `<speak>${withCommaBreaks}</speak>`;
}

async function generatePodcast(id, script) {
    const outputPath = path.join(OUTPUT_DIR, `${id}.mp3`);
    console.log(`\nGenerating [${id}] - Ultimate Stability Mode (1.0x)...`);

    const buffers = [];

    for (let i = 0; i < script.length; i++) {
        const segment = script[i];
        try {
            const voice = segment.role === 'A' ? 'ko-KR-Chirp3-HD-Achird' : 'ko-KR-Chirp3-HD-Leda';
            const cleanText = segment.text.trim();
            const ssml = convertToSsml(cleanText);

            const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { ssml },
                    voice: { languageCode: 'ko-KR', name: voice },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: 1.0, // 사용자 요청에 따라 정배속(1.0)으로 고정
                    }
                })
            });

            const data = await response.json();
            if (data.audioContent) {
                buffers.push(Buffer.from(data.audioContent, 'base64'));

                // 화자 전환 시 자연스러운 여유 (0.7초)
                const silenceSize = 33600; // 약 0.7초 (48k @ 16bit mono 기준)
                const silence = Buffer.alloc(silenceSize, 0);
                buffers.push(silence);
                process.stdout.write(`.`);
            } else {
                console.error(`\nError for ${id} segment ${i}:`, data);
            }
        } catch (err) {
            console.error(`\nFailed segment for ${id}:`, err);
        }
    }

    if (buffers.length > 0) {
        fs.writeFileSync(outputPath, Buffer.concat(buffers));
        console.log(`\n✅ Generated: ${id}.mp3`);
    }
}

async function run() {
    console.log("🚀 Cleaning and Regenerating all podcasts...");
    if (fs.existsSync(OUTPUT_DIR)) {
        const files = fs.readdirSync(OUTPUT_DIR);
        for (const file of files) {
            if (file.endsWith('.mp3')) {
                fs.unlinkSync(path.join(OUTPUT_DIR, file));
            }
        }
    } else {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const entries = Object.entries(bookScripts);
    for (const [id, script] of entries) {
        await generatePodcast(id, script);
    }
    console.log("\n🔥 All podcasts successfully regenerated with 1.0x Stable settings!");
}

run().catch(console.error);
