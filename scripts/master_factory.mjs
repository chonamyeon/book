import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import nodemailer from 'nodemailer';
import Anthropic from '@anthropic-ai/sdk';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { getLockedVoice } from './utils/voice_lockdown.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFile = path.resolve(__dirname, '../factory_log.txt');
fs.writeFileSync(logFile, '');

function log(msg) {
    const timestamp = new Date().toLocaleString();
    const formattedMsg = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(logFile, formattedMsg);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TEMP_DIR = path.resolve(__dirname, '../temp_audio');
const PUBLIC_AUDIO_DIR = path.resolve(__dirname, '../public/audio');
const LIST_FILE = path.resolve(__dirname, '../../editorial_results.json');

[TEMP_DIR, PUBLIC_AUDIO_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function generateScript(book) {
    log(`🤖 [${book.title}] 대본 생성 중 (Claude Sonnet 4.6)...`);

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: `당신은 Whiteboard 오리지널 팟캐스트 대본(Script 2.0)을 쓰는 프로 작가입니다.
이 대본은 제임스와 스텔라가 책의 인사이트를 바탕으로 직장인과 현대인의 삶을 유쾌하고 깊이 있게 나누는 콘텐츠입니다.
- 화자는 제임스(남)와 스텔라(여) 두 명입니다.
- 두 화자가 자연스럽게 대화하며 책의 핵심 내용을 전달합니다.
- 반드시 JSON Array 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.`,
        messages: [{
            role: 'user',
            content: `'${book.title}'(저자: ${book.celeb})의 내용을 바탕으로 깊이 있는 팟캐스트 대본을 작성하세요.
- **정확한 50턴**: 대본은 반드시 **정확히 50턴**(제임스 25회, 스텔라 25회)으로 구성하며, 마지막 턴에서 완결성 있게 마무리하세요.
- **인사이트 밀도**: 책 속의 핵심 개념을 직장인의 실무(성과급, 보고, 회의, 사내 정치, 번아웃)와 1:1로 매칭시키세요.
- **분량 및 농도**: 50턴 안에 2500~3000자를 채울 때, 대사의 호흡을 길게 가져가세요.
- **각 대사**: 반드시 **3~5문장**으로 구성, 위트 있는 '뼈 때리는' 통찰 포함.
- 형식: [{"speaker": "제임스", "text": "..."}, {"speaker": "스텔라", "text": "..."}, ...]`
        }]
    });

    const text = response.content[0].text.trim();
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']') + 1;
    let script = JSON.parse(text.substring(jsonStart, jsonEnd));

    const intro = [
        { speaker: "제임스", text: `안녕하세요! Whiteboard 에디토리얼의 제임스입니다. 오늘 저희가 살펴볼 도서는 바로 '${book.title}'입니다.` },
        { speaker: "스텔라", text: `반갑습니다, 스텔라입니다. ${book.celeb}의 이 작품, 오늘 정말 기대되는데요. 바로 시작해보겠습니다.` }
    ];
    return [...intro, ...script];
}

async function generateTTS(script, bookId) {
    log(`🎙️ [${bookId}] TTS 생성 시작 (3초 지연 + 즉시 키 교체)`);
    const audioFiles = [];
    const TARGET_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";

    for (let i = 0; i < script.length; i++) {
        const turn = script[i];
        const tempFile = path.join(TEMP_DIR, `turn_${i}.wav`);

        let success = false;
        let retryCount = 0;

        while (!success && retryCount < API_KEYS.length * 3) {
            try {
                if (i > 0 || retryCount > 0) await new Promise(r => setTimeout(r, 3000));

                const key = getCurrentKey();
                // [Lockdown] 인덱스 기반 절대 고정: 짝수=Puck(남/제임스), 홀수=Kore(여/스텔라)
                const voiceName = getLockedVoice(turn.speaker, i); // voice_lockdown.mjs → Puck/Kore

                const response = await fetch(`${TARGET_URL}?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: turn.text }]
                        }],
                        generationConfig: {
                            responseModalities: ["audio"],
                            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
                        }
                    })
                });

                if (response.status === 429) {
                    log(`   ⏳ [${i + 1}] 429 에러. 즉시 키 교체...`);
                    getNextKey();
                    retryCount++;
                    continue;
                }

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (!audioPart) throw new Error("Audio missing");

                fs.writeFileSync(tempFile, Buffer.from(audioPart.inlineData.data, 'base64'));
                audioFiles.push(tempFile);
                success = true;
                log(`   ✅ [${i + 1}/${script.length}] 완료`);
            } catch (err) {
                log(`   ❌ TTS 실패: ${err.message}. 다음 키 시도...`);
                getNextKey();
                retryCount++;
            }
        }
        if (!success) throw new Error(`${i}번 대사 실패`);
    }
    return audioFiles;
}

async function sendEmail(bookTitle) {
    if (!process.env.EMAIL_PASS) return;
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER || 'gosipass902@gmail.com', pass: process.env.EMAIL_PASS }
    });
    try {
        await transporter.sendMail({
            from: 'Whiteboard Factory',
            to: 'gosipass902@gmail.com',
            subject: `[완료 보고] ${bookTitle} 연동 완료`,
            text: `${bookTitle} 도서의 팟캐스트 생성이 완료되어 실서버에 연동되었습니다.`
        });
        log(`📧 이메일 발송 성공: ${bookTitle}`);
    } catch (err) {
        log(`📧 이메일 발송 실패: ${err.message}`);
    }
}

async function start() {
    log("🚀 [Final Master Mode] 공장 가동 시작!");
    const books = JSON.parse(fs.readFileSync(LIST_FILE, 'utf-8'));

    for (const book of books) {
        try {
            const outPath = path.join(PUBLIC_AUDIO_DIR, `${book.id}.mp3`);
            if (fs.existsSync(outPath)) {
                log(`⏭️ ${book.title} 이미 존재함. 건너뜀.`);
                continue;
            }

            log(`\n--- [현재 작업: ${book.title}] ---`);
            // 이전 임시 파일 정리
            fs.readdirSync(TEMP_DIR).forEach(f => fs.unlinkSync(path.join(TEMP_DIR, f)));

            const script = await generateScript(book);
            const audioFiles = await generateTTS(script, book.id);

            // 각 WAV(RAW PCM s16le 24000Hz 1ch)을 표준 포맷으로 개별 변환 후 concat
            const normalizedFiles = [];
            for (let ni = 0; ni < audioFiles.length; ni++) {
                const normOut = path.join(TEMP_DIR, `norm_${ni}.wav`);
                execSync(`"${ffmpegInstaller.path}" -y -f s16le -ar 24000 -ac 1 -i "${audioFiles[ni]}" -ar 44100 -ac 2 "${normOut}"`, { stdio: 'inherit' });
                normalizedFiles.push(normOut);
            }
            const listFile = path.join(TEMP_DIR, 'concat_list.txt');
            fs.writeFileSync(listFile, normalizedFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
            execSync(`"${ffmpegInstaller.path}" -y -f concat -safe 0 -i "${listFile}" -c:a libmp3lame -b:a 192k "${outPath}"`, { stdio: 'inherit' });

            // 데이터 연동
            const celebFile = path.resolve(__dirname, '../src/data/celebrities.js');
            let content = fs.readFileSync(celebFile, 'utf-8');
            const entryId = book.id === "onething" ? "one-thing" : book.id;
            const regex = new RegExp(`id:\\s*["']${entryId}["'],`, 'g');
            if (content.match(regex) && !content.includes(`podcastFile: "/audio/${book.id}.mp3"`)) {
                content = content.replace(regex, `$&\n        isPodcast: true,\n        podcastFile: "/audio/${book.id}.mp3",`);
                fs.writeFileSync(celebFile, content);
            }

            log(`✨ ${book.title} 최종 완료!`);
            await sendEmail(book.title);

            // 다음 도서 시작 전 잠시 휴식
            await new Promise(r => setTimeout(r, 5000));
        } catch (err) {
            log(`💥 ${book.title} 중단: ${err.message}`);
        }
    }
    log("\n🏁 모든 도서 작업 완료.");
}

start();
