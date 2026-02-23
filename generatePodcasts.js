import fs from 'fs';
import path from 'path';
import { bookScripts } from './src/data/bookScripts.js';

const API_KEY = 'AIzaSyA_IW1ltZSZM9RxVi7xBRgRtK4O1anVGVU';
const OUTPUT_DIR = './public/audio';

// Voice Mapping
const GURU_BOOKS = ['stoner', 'small-things', 'property-money', 'cool-jazz', 'your-name', 'sapiens'];

function getVoice(id, role) {
    const isGuru = GURU_BOOKS.includes(id);
    if (isGuru) {
        // Guru's Choice: 제임스(Enceladus), 스텔라(Kore)
        return role === 'A' ? 'ko-KR-Chirp3-HD-Enceladus' : 'ko-KR-Chirp3-HD-Kore';
    } else {
        // Editors' Picks: 다니엘(Achird), 쥬디(Leda)
        return role === 'A' ? 'ko-KR-Chirp3-HD-Achird' : 'ko-KR-Chirp3-HD-Leda';
    }
}

/**
 * XML 특수 문자 이스케이프 및 SSML 최적화
 * 자연스럽고 잔잔한 대화 스타일
 */
function convertToSsml(text) {
    const escaped = text.replace(/[<>&'"]/g, c => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });

    const sentences = escaped.split(/(?<=[.!?])\s+/);

    // 잔잔한 톤을 위해 rate를 0.92 정도로 낮추고, 문장 간 휴지기를 600ms로 늘립니다.
    const ssmlContent = sentences
        .map(s => {
            return `<s style="legato"><prosody rate="0.92" pitch="-0.5st">${s}</prosody></s><break time="600ms"/>`;
        })
        .join('');

    // 쉼표 휴지기도 약간 늘려 여유를 줍니다.
    const withBreathing = ssmlContent.replace(/,/g, ',<break time="250ms"/>');

    return `<speak>${withBreathing}</speak>`;
}

async function generatePodcast(id, script) {
    const outputPath = path.join(OUTPUT_DIR, `${id}.mp3`);
    console.log(`\nGenerating [${id}] - Calm & Conversational Mode...`);

    const buffers = [];

    for (let i = 0; i < script.length; i++) {
        const segment = script[i];
        try {
            const voice = getVoice(id, segment.role);
            const isFemale = voice.includes('Leda') || voice.includes('Kore');

            // 볼륨 밸런스 조정: 남성 음성은 키우고(+2), 여성 음성은 낮춥니다(-4)
            const volumeGainDb = isFemale ? -4.0 : 2.5;

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
                        speakingRate: 1.0, // SSML 내 prosody rate로 제어 (0.92)
                        pitch: 0.0,
                        volumeGainDb: volumeGainDb
                    }
                })
            });

            const data = await response.json();
            if (data.audioContent) {
                buffers.push(Buffer.from(data.audioContent, 'base64'));

                // 화자 전환 간격: '잔잔한 대화'를 위해 1.2초 무음 삽입 (0.8초 -> 1.2초)
                // MP3 병합 시의 노이즈 문제를 피하기 위해, synthesizer 자체가 지원하는 silence 대신 
                // 빈 Buffer를 붙이는 것은 MP3 포맷 규칙상 위험할 수 있어 여기서는 최소화하거나 
                // 차라리 마지막 문장 break time을 늘리는 방식을 씁니다.
                // (이전 회차에서 Buffer.alloc(0)이 깨짐 원인이었을 수 있음)
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
    console.log("🚀 Custom Podcast Audio Generation starting (Calm Mode)...");
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const entries = Object.entries(bookScripts);
    for (const [id, script] of entries) {
        await generatePodcast(id, script);
    }
    console.log("\n🔥 All specialized podcasts successfully regenerated!");
}

run().catch(console.error);
