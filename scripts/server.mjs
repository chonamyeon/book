import express from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
// auto_podcast_pipeline.mjs 내부에서 dotenv를 이미 처리하지만, 
// 명시적으로 한 번 더 처리하여 환경변수 로드 보장
import 'dotenv/config';
import {
    extractTextFromFile,
    generatePodcastScript,
    generateAudioGemini,
    mergeAudio,
    generateBookReview
} from './auto_podcast_pipeline.mjs';
import { execSync as _execSync } from 'child_process';

// MP3 저장 후 타임스탬프 자동 생성
function generateTimestamps(bookId, log = console.log) {
    try {
        const scriptPath = path.resolve(__dirname, 'sync-timestamps.cjs');
        log(`⏱ [${bookId}] 타임스탬프 생성 중...`);
        _execSync(`node "${scriptPath}" ${bookId}`, {
            cwd: path.resolve(__dirname, '..'),
            stdio: 'pipe',
            timeout: 120000
        });
        log(`✅ [${bookId}] 타임스탬프 생성 완료 → public/timestamps/${bookId}.json`);
    } catch (e) {
        log(`⚠️ [${bookId}] 타임스탬프 생성 실패: ${e.message}`);
    }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_AUDIO_DIR = path.resolve(__dirname, '../public/audio');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

// Chrome Private Network Access 허용 (HTTPS → localhost 요청 차단 해제)
app.use((req, res, next) => {
    // 1. 요청에 Private Network Access 헤더가 있는지 확인
    if (req.headers['access-control-request-private-network']) {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    // 2. OPTIONS preflight 요청에 대해서는 명시적으로 헤더 추가
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Private-Network');
        return res.sendStatus(204); // CORS 미들웨어가 처리하기 전에 먼저 응답
    }
    next();
});
app.use(cors());
app.use(express.json());

// 멀터 설정 (파일 업로드)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.resolve(__dirname, '../ebook_inputs');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// 성우 MP3 업로드 전용 multer 설정
const voiceUploadDir = path.resolve(__dirname, '../temp_audio/voice_uploads');
const voiceStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(voiceUploadDir)) fs.mkdirSync(voiceUploadDir, { recursive: true });
        cb(null, voiceUploadDir);
    },
    filename: (req, file, cb) => {
        const bookId = req.body.bookId || 'unknown';
        cb(null, `${bookId}_voice_raw.mp3`);
    }
});
const voiceUpload = multer({ storage: voiceStorage, limits: { fileSize: 500 * 1024 * 1024 } });

// 로버스트한 모델 획득 함수 (fallback 지원)
async function getRobustModel(genAI) {
    const models = [
        "models/gemini-2.5-flash",
        "models/gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-pro"
    ];
    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            return { model, name: modelName };
        } catch (e) {
            console.warn(`[ROBUST] ${modelName} 모델 획득 실패, 다음 시도...`);
        }
    }
    throw new Error("가용한 Gemini 모델이 없습니다.");
}

// 원고(대본용 요약문) 생성 API
app.post('/api/podcast/generate-text', async (req, res) => {
    const { bookId } = req.body;
    try {
        // v1 안정 버전 명시
        const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
        const { model, name } = await getRobustModel(genAI);
        console.log(`[SERVER] 원고 생성에 선택된 모델: ${name}`);

        const prompt = `${bookId}라는 도서의 핵심 요약과 팟캐스트를 위한 배경 지식을 아주 깊이 있게 정리해줘.
        이 텍스트는 나중에 제임스와 스텔라가 팟캐스트를 녹음할 때 원문으로 사용될 거야.
        성공 리스트, 단 하나의 일, 도미노 효과 등 핵심 키워드를 반드시 포함해서 A4 용지 반 페이지 분량으로 써줘.
        형식은 [도서 정보], [핵심 요약], [본문 심층 분석], [결론] 순서로 작성해줘.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        res.json({ text });
    } catch (error) {
        console.error('Text Gen Error:', error);
        // 디버깅: 실패 시 사용 가능한 모델 리스트 출력
        try {
            const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
            console.log("--- Debug: 가용한 모델 확인 중 ---");
            // fetch로 직접 확인
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${process.env.VITE_GEMINI_API_KEY}`);
            const data = await resp.json();
            console.log("Available models:", data.models?.map(m => m.name).join(', '));
        } catch (e) {
            console.error("Failed to list models in error handler:", e.message);
        }
        res.status(500).json({ error: error.message });
    }
});

// 현재 진행 중인 로그를 클라이언트에 전송하는 헬퍼
function createLogger(socket) {
    return {
        log: (msg) => {
            console.log(msg);
            socket.emit('log', { type: 'info', message: msg });
        },
        error: (msg) => {
            console.error(msg);
            socket.emit('log', { type: 'error', message: msg });
        },
        progress: (percent, status) => {
            socket.emit('progress', { percent, status });
        }
    };
}

// 팟캐스트 생성 API
app.post('/api/podcast/generate', upload.single('file'), async (req, res) => {
    const { bookId, outputName, content } = req.body;
    let fileName = req.file ? req.file.originalname : req.body.fileName;

    // 만약 파일이 없는데 직접 입력한 내용(content)이 있다면 임시 파일 생성
    if (!req.file && content) {
        const uploadDir = path.resolve(__dirname, '../ebook_inputs');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        fileName = `manual_${bookId}_${Date.now()}.txt`;
        fs.writeFileSync(path.join(uploadDir, fileName), content);
    }

    if (!fileName) {
        return res.status(400).json({ error: '파일 또는 텍스트 내용이 필요합니다.' });
    }

    res.json({ message: '팟캐스트 생성이 시작되었습니다.', bookId });

    // 비동기로 작업 시작 (Socket.io로 상태 보고)
    generatePodcastTask(bookId, fileName, outputName);
});

async function generatePodcastTask(bookId, fileName, outputName) {
    const socket = io.sockets; // 일단 전체 브로드캐스트
    const logger = {
        log: (msg) => socket.emit('log', { bookId, message: msg }),
        progress: (percent, status) => socket.emit('progress', { bookId, percent, status })
    };

    // outputName을 bookId.mp3로 강제 고정 (AudioContext 호환성)
    const fixedOutputName = `${bookId}.mp3`;

    try {
        logger.log(`🚀 [${bookId}] 팟캐스트 생성을 시작합니다...`);

        // 1. 텍스트 추출
        const text = await extractTextFromFile(fileName);
        logger.log(`📖 텍스트 추출 완료.`);
        logger.progress(10, '대본 생성 중...');

        // 2. 대본 생성
        const script = await generatePodcastScript(text);

        // 대본 저장 (UI 연동용)
        const scriptFileName = fixedOutputName.replace('.mp3', '_script.json');
        const scriptPath = path.join(__dirname, '../final_podcast', scriptFileName);
        fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));

        logger.log(`✍️ 대본 생성 완료 (${script.length}개 대사).`);
        logger.progress(30, '음성 합성 중...');

        // 3. 음성 합성
        const audioFiles = await generateAudioGemini(script, (data) => {
            logger.log(data.message);
            logger.progress(data.percent, '음성 합성 중...');
        });

        logger.log(`🎙️ 음성 합성 완료.`);
        logger.progress(85, '오디오 병합 중...');

        // 4. 병합
        await mergeAudio(audioFiles, fixedOutputName);

        // 5. 이동 (public/audio)
        const finalPath = path.join(__dirname, '../final_podcast', fixedOutputName);
        const destPath = path.join(PUBLIC_AUDIO_DIR, fixedOutputName);
        if (!fs.existsSync(PUBLIC_AUDIO_DIR)) fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
        fs.copyFileSync(finalPath, destPath);

        logger.log(`✅ 모든 작업 완료! 파일이 public/audio/${fixedOutputName}에 저장되었습니다.`);
        logger.progress(100, '완료');

        // 6. DB(celebrities.js) 업데이트는 로컬 파일 수정으로 대체하거나 
        // 클라이언트에서 갱신된 파일을 로드하도록 유도. 
        // 여기서는 celebrities.js를 직접 수정하는 로직을 추가할 수도 있음.
        updateCelebrityData(bookId, fixedOutputName);
        updateBookScripts(bookId, script);

    } catch (error) {
        logger.log(`❌ 에러 발생: ${error.message}`);
        console.error(error);
    }
}

// celebrities.js 파일 업데이트 함수
function updateCelebrityData(bookId, mp3Name) {
    const filePath = path.resolve(__dirname, '../src/data/celebrities.js');
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf-8');

    // id: "bookId" 또는 id: 'bookId' 대응
    const regex = new RegExp(`id:\\s*["']${bookId}["'],`, 'g');
    if (content.match(regex)) {
        // 중복 방지 체크
        if (!content.includes(`podcastFile: "/audio/${mp3Name}"`)) {
            content = content.replace(regex, (match) => {
                return `${match}\n                isPodcast: true,\n                podcastFile: "/audio/${mp3Name}",`;
            });
            fs.writeFileSync(filePath, content);
            console.log(`Updated celebrities.js for ${bookId}`);
        }
    }
}

// bookScripts.js 파일 업데이트 함수
function updateBookScripts(bookId, script) {
    const filePath = path.resolve(__dirname, '../src/data/bookScripts.js');
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf-8');

    // 스크립트 형식 변환 (speaker -> role)
    const formattedScript = script.map(turn => ({
        role: turn.speaker === '제임스' ? 'A' : 'B',
        text: turn.text
    }));

    // 이미 존재하는 경우 교체, 없으면 추가
    const entryRegex = new RegExp(`["']?${bookId}["']?:\\s*\\[[\\s\\S]*?\\],?`, 'g');

    if (content.match(entryRegex)) {
        content = content.replace(entryRegex, `"${bookId}": ${JSON.stringify(formattedScript, null, 4)},`);
    } else {
        // 마지막 }; 앞에 추가
        const lastBraceIndex = content.lastIndexOf('};');
        if (lastBraceIndex !== -1) {
            const newEntry = `    "${bookId}": ${JSON.stringify(formattedScript, null, 4)},\n`;
            content = content.slice(0, lastBraceIndex) + newEntry + content.slice(lastBraceIndex);
        }
    }

    fs.writeFileSync(filePath, content);
    console.log(`Updated bookScripts.js for ${bookId}`);
}

// ============================================================
// 새 책 원스톱 등록 시스템
// ============================================================

function addNewBookEntry(bookId, title, author, celebritySlug, category, desc, purchaseLink, section) {
    const filePath = path.resolve(__dirname, '../src/data/celebrities.js');
    let content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes(`id: "${bookId}"`)) { console.log(`[Skip] ${bookId} 이미 존재`); return; }

    const slugMatch = content.match(new RegExp(`slug:\\s*["']${celebritySlug}["']`));
    if (!slugMatch) { console.error(`Celebrity "${celebritySlug}" not found`); return; }

    const afterSlug = content.substring(slugMatch.index);
    const booksMatch = afterSlug.match(/books:\s*\[/);
    if (!booksMatch) return;

    const insertPos = slugMatch.index + booksMatch.index + booksMatch[0].length;
    const entry = `\n                {\n                    id: "${bookId}",\n                    title: "${title}",\n                    author: "${author}",\n                    category: "${category}",\n                    section: "${section || 'EDITORS_PICK'}",\n                    cover: "/images/covers/${bookId}.jpg",\n                    desc: "${desc}",\n                    isPodcast: true,\n                    podcastFile: "/audio/${bookId}.mp3",${purchaseLink ? `\n                    purchaseLink: "${purchaseLink}",` : ''}\n                    review: \`\`\n                },`;
    content = content.slice(0, insertPos) + entry + content.slice(insertPos);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ celebrities.js에 "${title}" (${section}) 추가 완료`);
}

function addBookTitleMapping(bookId, title) {
    const filePath = path.resolve(__dirname, 'auto_podcast_pipeline.mjs');
    let content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes(`'${bookId}':`)) return;
    const titleStart = content.indexOf('const BOOK_TITLES = {');
    if (titleStart === -1) return;
    const closingPos = content.indexOf('\n};', titleStart);
    if (closingPos === -1) return;
    content = content.slice(0, closingPos) + `,\n    '${bookId}': '${title}'` + content.slice(closingPos);
    fs.writeFileSync(filePath, content, 'utf-8');
}

async function fetchCoverForBook(bookId, title) {
    const coversDir = path.resolve(__dirname, '../public/images/covers');
    const coverPath = path.join(coversDir, `${bookId}.jpg`);
    if (fs.existsSync(coverPath)) return;
    if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });
    try {
        const q = encodeURIComponent(title);
        let res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&langRestrict=ko`);
        let data = await res.json();
        if (!data.items) { res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5`); data = await res.json(); }
        if (!data.items) return;
        let url = null;
        for (const item of data.items) {
            const l = item.volumeInfo?.imageLinks;
            if (l) { url = l.extraLarge || l.large || l.medium || l.small || l.thumbnail; if (url) break; }
        }
        if (!url) return;
        url = url.replace('zoom=1', 'zoom=3').replace('&edge=curl', '').replace('http://', 'https://');
        const imgRes = await fetch(url);
        if (!imgRes.ok) return;
        fs.writeFileSync(coverPath, Buffer.from(await imgRes.arrayBuffer()));
    } catch (e) { console.warn(`커버 실패: ${e.message}`); }
}

async function generateSourceText(bookId, title, author) {
    const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
    const { model } = await getRobustModel(genAI);
    const prompt = `"${title}" (저자: ${author})에 대해 깊이 있게 분석해줘. A4 2~3페이지 분량으로:\n1. 도서 정보\n2. 핵심 내용 상세 요약\n3. 주요 개념/등장인물\n4. 핵심 메시지와 교훈\n5. 사회적 영향\n6. 독자 반응\n7. 저자 배경`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const dir = path.resolve(__dirname, '../ebook_inputs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${bookId}.txt`), text);
    return `${bookId}.txt`;
}

app.post('/api/book/register', async (req, res) => {
    const { bookId, title, author, celebritySlug, category, desc, purchaseLink } = req.body;
    if (!bookId || !title || !author || !celebritySlug) {
        return res.status(400).json({ error: 'Book ID, 제목, 저자, 셀럽은 필수입니다.' });
    }
    res.json({ message: `"${title}" 원스톱 등록 시작!`, bookId });
    registerBookTask(bookId, title, author, celebritySlug, category || 'NOVEL', desc || `${author}의 ${title}`, purchaseLink || '');
});

async function registerBookTask(bookId, title, author, slug, category, desc, purchaseLink) {
    const socket = io.sockets;
    const log = (msg) => { console.log(msg); socket.emit('log', { bookId, message: msg }); };
    const prog = (p) => socket.emit('progress', { bookId, percent: p });
    try {
        log(`📚 [1/7] celebrities.js 엔트리 추가...`); addNewBookEntry(bookId, title, author, slug, category, desc, purchaseLink); prog(5);
        log(`📝 [2/7] BOOK_TITLES 매핑 추가...`); addBookTitleMapping(bookId, title); prog(10);
        log(`🖼️ [3/7] 커버 다운로드 중...`); await fetchCoverForBook(bookId, title); prog(15);
        log(`📄 [4/7] 원본 텍스트 생성 중 (Gemini)...`); const fileName = await generateSourceText(bookId, title, author); prog(20);

        log(`🎙️ [5/7] 대본 생성 중...`);
        const text = await extractTextFromFile(fileName);
        const script = await generatePodcastScript(text);
        const scriptDir = path.resolve(__dirname, '../final_podcast');
        if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });
        fs.writeFileSync(path.join(scriptDir, `${bookId}_script.json`), JSON.stringify(script, null, 2));
        log(`✍️ 대본 완료 (${script.length}개 대사)`); prog(35);

        // Step 6: 리뷰 먼저 생성 (TTS 실패해도 리뷰는 남기기 위해)
        log(`📖 [6/7] 리뷰 생성 중...`);
        const review = await generateBookReview(text, title, author, '');
        const celebPath = path.resolve(__dirname, '../src/data/celebrities.js');
        let cc = fs.readFileSync(celebPath, 'utf-8');
        const escaped = review.replace(/`/g, "'").replace(/\$/g, '\\$');
        const rr = new RegExp(`(id:\\s*["']${bookId}["'][\\s\\S]*?review:\\s*)\`[\\s\\S]*?\``);
        if (cc.match(rr)) { cc = cc.replace(rr, `$1\`${escaped}\``); fs.writeFileSync(celebPath, cc, 'utf-8'); }
        log(`📖 리뷰 완료 (${review.length}자)`); prog(50);

        // Step 7: bookScripts.js 먼저 저장 (TTS 전에)
        log(`🎙️ [7/7] bookScripts.js 업데이트...`);
        updateBookScripts(bookId, script);
        prog(55);

        // Step 5.5: TTS (실패해도 위의 결과물은 유지됨)
        let audioSuccess = false;
        try {
            log(`🔊 [5.5] TTS 음성 생성 중... (5~15분 소요)`);
            const tempDir = path.resolve(__dirname, '../temp_audio', bookId);
            const audioFiles = await generateAudioGemini(script, tempDir);
            const finalName = `${bookId}.mp3`;
            await mergeAudio(audioFiles, finalName, title);
            const src = path.join(scriptDir, finalName), dst = path.join(PUBLIC_AUDIO_DIR, finalName);
            if (fs.existsSync(src)) fs.copyFileSync(src, dst);
            updateCelebrityData(bookId, finalName);
            generateTimestamps(bookId, log);
            audioSuccess = true;
            log(`🎵 오디오 완료: ${finalName}`);
        } catch (ttsErr) {
            log(`⚠️ TTS 실패 (리뷰/대본은 저장됨): ${ttsErr.message}`);
            log(`💡 나중에 팟캐스트 탭에서 개별 생성 가능합니다.`);
        }
        prog(100);

        log(`\n✨ ===== "${title}" 원스톱 등록 완료! =====`);
        log(audioSuccess ? `📖 리뷰 | 🎙️ 대본 | 🔊 오디오 | 🖼️ 커버` : `📖 리뷰 | 🎙️ 대본 | 🖼️ 커버 (오디오 없음)`);
        log(`⚠️ 배포: npm run deploy`);
    } catch (e) { log(`❌ 등록 실패: ${e.message}`); console.error(e); }
}

// ── 성우 다이렉트 MP3 병합 API ────────────────────────────────
app.post('/api/voice/merge', voiceUpload.single('voiceFile'), async (req, res) => {
    const { bookId, introType, outroType } = req.body;
    const voiceFilePath = req.file?.path;

    if (!bookId || !voiceFilePath) {
        return res.status(400).json({ error: 'bookId와 voiceFile이 필요합니다.' });
    }

    res.json({ message: `'${bookId}' 성우 병합 작업을 시작합니다.` });

    // 소켓 emit 헬퍼
    const vlog = (msg) => {
        console.log(`[VOICE] ${msg}`);
        io.emit('voice-log', { message: msg });
    };
    const vprog = (percent) => io.emit('voice-progress', { percent });

    try {
        const { execSync } = await import('child_process');
        const ffmpegInstaller = (await import('@ffmpeg-installer/ffmpeg')).default;
        const ffmpegPath = ffmpegInstaller.path;

        const outDir = path.resolve(__dirname, '../public/audio');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        const outputFileName = `${bookId}_voice.mp3`;
        const outputPath = path.join(outDir, outputFileName);

        const introPath = path.resolve(__dirname, '../public/music/intro_jingle.mp3');
        const outroPath = fs.existsSync(path.resolve(__dirname, '../public/music/outro_jingle.mp3'))
            ? path.resolve(__dirname, '../public/music/outro_jingle.mp3')
            : introPath; // outro 없으면 intro 재사용

        vlog(`📂 파일 확인 중... (bookId: ${bookId})`);
        vprog(5);

        // 병합할 파일 목록 구성
        const filesToMerge = [];
        if (introType !== 'none' && fs.existsSync(introPath)) {
            filesToMerge.push(introPath);
            vlog(`✅ 인트로 추가됨`);
        }
        filesToMerge.push(voiceFilePath);
        vlog(`✅ 성우 MP3 추가됨: ${path.basename(voiceFilePath)}`);
        if (outroType !== 'none' && fs.existsSync(outroPath)) {
            filesToMerge.push(outroPath);
            vlog(`✅ 아웃트로 추가됨`);
        }

        vprog(20);
        vlog(`🔗 ${filesToMerge.length}개 파일 병합 시작...`);

        // concat list 파일 생성
        const listFilePath = path.join(voiceUploadDir, `${bookId}_concat_list.txt`);
        const listContent = filesToMerge.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
        fs.writeFileSync(listFilePath, listContent);

        vprog(40);

        // ffmpeg 병합 실행
        execSync(
            `"${ffmpegPath}" -y -f concat -safe 0 -i "${listFilePath}" -c:a libmp3lame -b:a 192k "${outputPath}"`,
            { windowsHide: true, stdio: 'inherit' }
        );

        vprog(85);
        vlog(`🎵 병합 완료! → public/audio/${outputFileName}`);

        // 임시 파일 정리
        try {
            fs.unlinkSync(listFilePath);
            fs.unlinkSync(voiceFilePath);
        } catch (_) { }

        vprog(100);
        vlog(`✨ '${bookId}' 성우 병합 완료! Firestore 자동 저장 중...`);

        // 타임스탬프 자동 생성
        generateTimestamps(bookId, vlog);

        // 프론트엔드에서 Firestore 자동 업데이트하도록 이벤트 전송
        io.emit('voice-complete', {
            bookId,
            voiceAudioUrl: `/audio/${outputFileName}`,
        });

    } catch (err) {
        vlog(`❌ 병합 실패: ${err.message}`);
        console.error('[VOICE MERGE ERROR]', err);
    }
});
// ──────────────────────────────────────────────────────────────

// ── AI 대본 생성 (Claude API) ─────────────────────────────────
app.post('/api/script/generate', async (req, res) => {
    const {
        bookId, title, author, themes,
        targetMin = 2500, targetMax = 3000,
        turnLimit = 50,
        speakerA = '제임스', speakerB = '스텔라'
    } = req.body;

    if (!bookId || !title || !author) {
        return res.status(400).json({ error: 'bookId, title, author는 필수입니다.' });
    }

    res.json({ message: '대본 생성이 시작되었습니다.', bookId });

    const slog = (msg) => {
        console.log(`[SCRIPT] ${msg}`);
        io.emit('script-log', { message: msg });
    };
    const sprog = (percent) => io.emit('script-progress', { percent });

    slog(`🚀 "${title}" 대본 생성 시작 (Claude API)...`);
    sprog(5);

    const themesBlock = themes
        ? `- 핵심 주제 / 반드시 다룰 내용:\n${themes.split('\n').filter(Boolean).map(t => `  ${t}`).join('\n')}`
        : '';

    const prompt = `당신은 아카이뷰 오리지널 팟캐스트 대본(Script 2.0)을 쓰는 프로 작가입니다.
이 대본은 제임스와 스텔라가 책의 인사이트를 바탕으로 직장인과 현대인의 삶을 유쾌하고 깊이 있게 나누는 콘텐츠입니다.

[책 정보]
- 제목: ${title}
- 저자: ${author}
${themesBlock}

[❗️중요: 작성 지침 - 반드시 준수❗️]
1) **상황 몰입 중심 (Scenario-First)**: 책의 챕터나 내용을 나열하는 설명적 비중은 대폭 줄이세요. 그 대신, 책의 인사이트를 우리의 실제 삶(일상, 직장)에 어떻게 '대입'할 수 있는지에 대한 구체적인 상황극과 대화의 비중을 80% 이상으로 구성하세요.
2) **내용의 사실성 (Fact-Only)**: 책의 핵심 지식은 반드시 제공된 팩트에 기반해야 합니다. 다만 그것을 설명하기보다 "이거 딱 우리 부장님 이야기 아니야?" 혹은 "어제 카페에서 본 그 상황이랑 똑같네" 식의 연결고리로 활용하세요.
3) **위트와 유머**: 직장인들이 무릎을 칠만한 위트와 유머를 섞어주세요. 딱딱한 교양 정보가 아니라, 무조건 재미있어야 합니다.
4) **생활 밀착형 상황**: 지하철, 마트, 운동, 친구 모임 등 일상 전반의 다채로운 상황을 에피소드로 활용하세요.

[화자 정보]
- **제임스 (${speakerA}, 남성)**: 책의 지혜를 위트 있게 현실로 끌어오는 가이드.
- **스텔라 (${speakerB}, 여성)**: 현실적인 관점에서 뼈 때리는 질문을 던지는 리액터.

【대본 작성 규칙 - ❗️인사이트 농도 극대화 (직장인 맞춤형)❗️】
- **캐릭터 페르소나**:
  - **스텔라**: 현실적인 질문자. 대중이 궁금해할 "왜 대부분 성공하지 못할까?"와 같은 날카로운 **핵심 질문**을 던짐.
  - **제임스**: 해결사. 스텔라의 질문에 책의 통찰과 **실제 사례**를 결합해 대화하듯 답함. 강의조 절대 금지.
- **필수 포함 요소**:
  - **1개의 강력한 갈등 질문**: 청취자의 호기심을 자극할 핵심 질문 기반 대본
  - **2개의 구체적 사례**: 위트가 섞인 실제 현실 사례
  - **3개의 행동 지침**: 내일 당장 적용 가능한 실전 지시
- **스토리텔링 흐름 (준수 필수)**:
  1. [1~4턴: 상황] 현실 공감 상황극
  2. [5~8턴: 질문] **갈등 질문** 제기 (청취자 몰입 유도)
  3. [9~20턴: 통찰] 핵심 인사이트 (스텔라의 질문 → 제임스의 통찰 위주)
  4. [21~30턴: 사례] **실제 사례 2개** (현실 대입)
  5. [31~36턴: 행동] **행동 지침 3개** (실전 적용 가이드)
  6. [37~39턴: 요약] 대화의 정수를 찌르는 핵심 요약
  7. [40턴: 마무리] 친근한 반말 클로징 ("오늘도 아카이뷰와 함께 깨달음 있는 하루 보내길 바랄게. 우린 다음에 또 만나!")
- **자연스러운 서사**: 상황 → 질문 → 통찰 → 사례 → 행동 순으로 매끄럽고 재미있게 연결하세요.
- **무조건 40턴**: 정확히 40턴을 꽉 채워야 합니다. 중간에 끊기면 안 됩니다.
- ⚠️ 인트로 금지: 바로 상황 속 에피소드로 시작하세요.
- 톤앤매너: 핵심 인사이트 위주로 풍부하게 전달하되 친근한 대화체 유지.
- 출력 최적화: 전체 출력 토큰 제한(4000토큰) 내에서 작성하세요.

[출력 형식 - 반드시 준수]
- **순수 JSON 배열만 출력**하세요. (Markdown 코드 블록 \` \` \` json 등을 절대 사용하지 마세요.)
- 인사말이나 중간 설명 없이 오직 \`[\`으로 시작해서 \`]\`으로 끝나는 JSON 형식만 출력하세요.
- 전체 분량(약 2500~2900자)이 총 출력 토큰 제한(4000토큰) 내에 무조건 들어오도록 매우 짧게 작성하세요.
- 모든 따옴표는 표준 " (쌍따옴표)를 사용하고, 줄바꿈이 필요한 경우 \\n 을 사용하세요.

[
  {"speaker": "${speakerA}", "text": "..."},
  {"speaker": "${speakerB}", "text": "..."}
]`;

    try {
        slog('🤖 Claude API 호출 중... (30~90초 소요)');
        sprog(10);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 4000,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Claude API 오류: ${response.status} - ${err}`);
        }

        sprog(70);
        slog('✅ Claude 응답 수신, 대본 파싱 중...');

        const data = await response.json();
        const rawText = data.content[0].text.trim();

        let jsonStr = rawText;
        const firstBracket = jsonStr.indexOf('[');
        const lastBracket = jsonStr.lastIndexOf(']');

        if (firstBracket !== -1 && lastBracket !== -1) {
            jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
        } else {
            throw new Error('응답에서 JSON 배열 형식을 찾을 수 없습니다.');
        }

        let script;
        try {
            script = JSON.parse(jsonStr);
        } catch (e) {
            slog(`❌ JSON 파싱 에러 발생: ${e.message}`);
            // 특수문자나 줄바꿈으로 인한 문제일 경우를 위해 한 번 더 정제 시도
            try {
                const cleanedJson = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
                script = JSON.parse(cleanedJson);
            } catch (e2) {
                throw new Error(`대본 파싱에 실패했습니다: ${e.message}`);
            }
        }

        const charCount = script.reduce((sum, t) => sum + t.text.replace(/[\s\uFEFF\xA0]/g, '').length, 0);
        slog(`📊 ${script.length}턴, ${charCount}자 생성 완료`);
        sprog(85);

        // final_podcast에 저장
        const scriptDir = path.resolve(__dirname, '../final_podcast');
        if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });
        const scriptPath = path.join(scriptDir, `${bookId}_script.json`);
        fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));
        slog(`💾 저장됨: final_podcast/${bookId}_script.json`);

        // bookScripts.js 업데이트
        updateBookScripts(bookId, script);
        slog(`📝 bookScripts.js 업데이트 완료`);

        sprog(100);
        slog(`✨ "${title}" 대본 생성 완료! 성우에게 전달 준비가 됐습니다.`);
        io.emit('script-complete', { bookId, script });

    } catch (err) {
        slog(`❌ 오류: ${err.message}`);
        sprog(0);
        console.error('[SCRIPT GEN ERROR]', err);
    }
});
// ─────────────────────────────────────────────────────────────
// TTS 변환 (대본 → MP3)
app.post('/api/tts/run', async (req, res) => {
    const { bookId, script, title } = req.body;
    if (!bookId || !script?.length) return res.status(400).json({ error: 'bookId, script는 필수입니다.' });
    res.json({ message: 'TTS 변환 시작', bookId });

    const log = (msg) => { console.log(msg); io.emit('tts-log', { message: msg }); };
    const prog = (p) => io.emit('tts-progress', { percent: p });

    try {
        // 1. final_podcast에 스크립트 저장
        const scriptDir = path.resolve(__dirname, '../final_podcast');
        if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });
        fs.writeFileSync(path.join(scriptDir, `${bookId}_script.json`), JSON.stringify(script, null, 2));
        log(`💾 대본 저장 완료 (${script.length}턴)`);
        prog(5);

        // 2. TTS 생성
        log(`🎙️ TTS 변환 시작... (Gemini 2.5 Pro, 5~15분 소요)`);
        const tempDir = path.resolve(__dirname, '../temp_audio', bookId);
        const audioFiles = await generateAudioGemini(script, tempDir, title || bookId);
        prog(80);

        // 3. MP3 병합
        log(`🎵 오디오 병합 중...`);
        const finalName = `${bookId}.mp3`;
        await mergeAudio(audioFiles, finalName, title || bookId);
        prog(95);

        // 4. public/audio에 복사
        const src = path.join(scriptDir, finalName);
        const dst = path.join(PUBLIC_AUDIO_DIR, finalName);
        if (fs.existsSync(src)) fs.copyFileSync(src, dst);
        log(`✅ 완료! /public/audio/${finalName} 저장됨`);
        generateTimestamps(bookId, log);
        prog(100);
        io.emit('tts-complete', { bookId, audioPath: `/audio/${finalName}` });
    } catch (err) {
        log(`❌ TTS 오류: ${err.message}`);
        prog(0);
    }
});
// ── 도서 정보 크롤링 (교보/예스24) ─────────────────────────────────
app.post('/api/book/crawl', async (req, res) => {
    const { title, author } = req.body;
    if (!title) return res.status(400).json({ error: '제목은 필수입니다.' });

    try {
        console.log(`[CRAWL] 도서 정보 크롤링 시작: ${title} / ${author || ''}`);

        // 텍스트 정제 함수
        const cleanText = (raw) => {
            if (!raw) return "";
            return raw
                .replace(/&lt;br\s*\/?&gt;/gi, '\n') // &lt;br/&gt; 처리
                .replace(/<br\s*\/?>/gi, '\n')      // <br> 처리
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/<[^>]*>?/gm, '')         // 나머지 HTML 태그 제거
                .replace(/_\d{2,4}/g, '')          // _007 등 페이지 번호 패턴 제거
                .replace(/펼쳐보기|접어보기/g, '')      // 불필요한 UI 텍스트 제거
                .replace(/\d+$/, '')               // 줄 끝의 숫자 제거
                .replace(/\s*&lt;br\s*\/?&gt;\s*/gi, '\n') // 중복 방지 한 번 더
                .replace(/\n\s*\n/g, '\n\n')       // 공백 라인 정리
                .trim();
        };

        // 1. 교보문고 시도
        let description = "";
        let finalUrl = "";
        let coverUrl = "";

        try {
            const searchUrl = `https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(title + ' ' + (author || ''))}`;
            const searchRes = await fetch(searchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            });
            const searchHtml = await searchRes.text();
            const $search = cheerio.load(searchHtml);
            const detailLink = $search('.prod_link').first().attr('href');


            if (detailLink) {
                finalUrl = detailLink;
                const bookId = detailLink.split('/').pop().replace(/[^A-Z0-9]/gi, ''); // Clean ID
                console.log(`[CRAWL] 교보문고 도서 ID 추출: ${bookId}`);

                const fetchKyoboAPI = async (subPath) => {
                    try {
                        const url = `https://product.kyobobook.co.kr/api/gw/pdt/product/${bookId}/${subPath}`;
                        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } });
                        if (res.ok) return await res.json();
                    } catch (e) { console.error(`[KYOB O API ERROR] ${subPath}`, e.message); }
                    return null;
                };

                const introData = await fetchKyoboAPI('introduction');
                const contentsData = await fetchKyoboAPI('contents');
                const reviewData = await fetchKyoboAPI('publisherReview');
                const bookCardData = await fetchKyoboAPI('book-card');

                if (introData && introData.data) description += `■ 책소개\n${cleanText(introData.data.introduction || "")}\n\n`;
                if (contentsData && contentsData.data) description += `■ 목차\n${cleanText(contentsData.data.contents || "")}\n\n`;
                if (reviewData && reviewData.data) description += `■ 출판사 서평\n${cleanText(reviewData.data.publisherReview || "")}\n\n`;
                
                if (bookCardData && bookCardData.data && bookCardData.data.picutreUrl) {
                    coverUrl = bookCardData.data.picutreUrl;
                }

                if (description) {
                    console.log(`[CRAWL] 교보문고 데이터 획득 성공 (JSON API)`);
                }
            }

        } catch (e) { console.error('[KYOB O CRAWL ERROR]', e.message); }

        // 2. YES24 시도 (결과가 없거나 부족할 때 보완)
        if (!description || description.length < 200) {
            console.log(`[CRAWL] YES24 검색 시작...`);
            try {
                const yesSearchUrl = `https://www.yes24.com/Product/Search?domain=ALL&query=${encodeURIComponent(title + ' ' + (author || ''))}`;
                const yesSearchRes = await fetch(yesSearchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                const yesSearchHtml = await yesSearchRes.text();
                const $yesSearch = cheerio.load(yesSearchHtml);
                const yesDetailPath = $yesSearch('.gd_name').first().attr('href');

                if (yesDetailPath) {
                    const yesDetailUrl = yesDetailPath.startsWith('http') ? yesDetailPath : `https://www.yes24.com${yesDetailPath}`;
                    console.log(`[CRAWL] YES24 상세 페이지 발견: ${yesDetailUrl}`);
                    const yesDetailRes = await fetch(yesDetailUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    const yesDetailHtml = await yesDetailRes.text();
                    const $y = cheerio.load(yesDetailHtml);

                    const yExtract = (id) => cleanText($y(id).find('.infoSetCont_wrap').html() || "");
                    const yRes = {
                        intro: yExtract('#infoset_introduce'),
                        toc: yExtract('#infoset_toc'),
                        inside: yExtract('#infoset_inBook'),
                        review: yExtract('#infoset_pubReview')
                    };

                    // 표지 이미지 추출 (YES24)
                    const yCoverImg = $y('.gd_img img').first().attr('src');
                    if (yCoverImg && !coverUrl) coverUrl = yCoverImg;

                    if (yRes.intro) {
                        description += `■ 책소개 (YES24)\n${yRes.intro}\n\n`;
                        if (yRes.toc && !description.includes('■ 목차')) description += `■ 목차\n${yRes.toc}\n\n`;
                        if (yRes.inside && !description.includes('■ 책속으로')) description += `■ 책속으로\n${yRes.inside}\n\n`;
                        if (yRes.review && !description.includes('■ 출판사 서평')) description += `■ 출판사 서평\n${yRes.review}\n\n`;
                        if (!finalUrl) finalUrl = yesDetailUrl;
                        console.log(`[CRAWL] YES24 데이터 획득 성공`);
                    }
                }
            } catch (e) { console.error('[YES24 CRAWL ERROR]', e.message); }
        }

        if (!description) {
            return res.status(404).json({ error: '교보문고 및 YES24에서 도서 정보를 찾을 수 없습니다.' });
        }

        res.json({
            success: true,
            description: description.trim(),
            url: finalUrl,
            coverUrl: coverUrl
        });
    } catch (error) {
        console.error('[CRAWL FATAL ERROR]', error);
        res.status(500).json({ error: error.message });
    }
});

// ── 도서 심층 분석 (Gemini 2.0) ─────────────────────────────────
app.post('/api/book/analyze', async (req, res) => {
    const { title, author, description } = req.body;
    if (!description) return res.status(400).json({ error: '분석할 도서 정보가 없습니다.' });

    try {
        console.log(`[ANALYZE] Gemini 2.0 도서 분석 시작: ${title}`);
        const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
        const { model } = await getRobustModel(genAI);

        const prompt = `
당신은 도서 분석 및 콘텐츠 기획 전문가입니다. 제공된 도서 정보(설명, 목차, 서평 등)를 바탕으로, 팟캐스트 대본 제작을 위한 '심층 인사이트 리포트'를 작성해주세요.

도서명: ${title}
저자: ${author || '알 수 없음'}
도서 정보:
${description}

작성 가이드라인:
1. **도서 구조 분석**: 책의 전체적인 흐름과 구성을 논리적으로 분석해주세요.
2. **핵심 주제 명시**: 팟캐스트에서 반드시 다뤄야 할 핵심 주제 3~5가지를 다음 형식을 지켜서 작성해주세요. (이후 프로그램에서 자동으로 추출됩니다)
   - ■ 핵심 주제 1: (주제 제목) - (상세 설명)
   - ■ 핵심 주제 2: (주제 제목) - (상세 설명)
3. **풍성한 사례**: 각 주제를 뒷받침하는 책 속의 구체적인 에피소드나 데이터를 포함해주세요.
4. **팟캐스트 연출 팁**: 제임스와 스텔라가 이 내용을 어떻게 재미있게 풀어나가면 좋을지 제언해주세요.

이 리포트는 나중에 팟캐스트 대본의 기초 자료로 사용될 것입니다.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({
            success: true,
            analysis: text,
        });
    } catch (error) {
        console.error('[ANALYZE ERROR]', error);
        res.status(500).json({ error: error.message });
    }
});
// ── 타임스탬프 생성 API ───────────────────────────────────────
import { execSync as execSyncTs } from 'child_process';

app.post('/api/timestamps/generate', async (req, res) => {
    const { bookId, script } = req.body;
    if (!bookId) return res.status(400).json({ error: 'bookId 필요' });

    const mp3Path = path.resolve(__dirname, `../public/audio/${bookId}.mp3`);
    if (!fs.existsSync(mp3Path)) {
        return res.status(404).json({ error: `오디오 파일 없음: ${bookId}.mp3` });
    }

    try {
        // 총 길이
        const durRaw = execSyncTs(
            `ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp3Path}"`,
            { encoding: 'utf8' }
        ).trim();
        const duration = parseFloat(durRaw);

        let segments;
        let method;

        // silencedetect 시도 (-25dB:0.15)
        const silenceRaw = execSyncTs(
            `ffmpeg -i "${mp3Path}" -af "silencedetect=noise=-25dB:duration=0.15" -f null - 2>&1`,
            { encoding: 'utf8' }
        );
        const silences = [];
        const silRe = /silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;
        let sm;
        while ((sm = silRe.exec(silenceRaw)) !== null) {
            const end = parseFloat(sm[1]), dur2 = parseFloat(sm[2]);
            silences.push({ end, dur: dur2, start: end - dur2 });
        }

        const needed = (script?.length || 0) - 1;
        const usesSilence = script?.length > 0 && silences.length >= needed * 0.6;

        if (usesSilence) {
            const bounds = silences
                .sort((a, b) => b.dur - a.dur)
                .slice(0, needed)
                .sort((a, b) => a.start - b.start)
                .map(s => (s.start + s.end) / 2);

            segments = [];
            let prev = 0;
            for (let i = 0; i < bounds.length; i++) {
                segments.push({
                    index: i,
                    speaker: script[i]?.speaker || (i % 2 === 0 ? '제임스' : '스텔라'),
                    start: +prev.toFixed(3),
                    end: +bounds[i].toFixed(3),
                    text: script[i]?.text || '',
                });
                prev = bounds[i];
            }
            segments.push({
                index: bounds.length,
                speaker: script[bounds.length]?.speaker || '제임스',
                start: +prev.toFixed(3),
                end: +duration.toFixed(3),
                text: script[bounds.length]?.text || '',
            });
            method = 'silencedetect-25dB';
        } else {
            // char-ratio fallback
            if (!script?.length) return res.status(400).json({ error: '스크립트가 없습니다' });
            const totalChars = script.reduce((s, t) => s + (t.text || '').length, 0);
            let acc = 0;
            segments = script.map((turn, i) => {
                const start = (acc / totalChars) * duration;
                acc += (turn.text || '').length;
                const end = (acc / totalChars) * duration;
                return {
                    index: i,
                    speaker: turn.speaker || (i % 2 === 0 ? '제임스' : '스텔라'),
                    start: +start.toFixed(3),
                    end: +end.toFixed(3),
                    text: turn.text || '',
                };
            });
            method = 'char-ratio';
        }

        // 로컬 파일에도 저장
        const tsPath = path.resolve(__dirname, `../public/timestamps/${bookId}.json`);
        fs.writeFileSync(tsPath, JSON.stringify({ method, bookId, segments }, null, 2));

        console.log(`[TIMESTAMPS] ${bookId}: ${segments.length} segs, method=${method}`);
        res.json({ success: true, method, segments, duration });
    } catch (e) {
        console.error('[TIMESTAMPS ERROR]', e);
        res.status(500).json({ error: e.message });
    }
});
// ─────────────────────────────────────────────────────────────
app.post('/api/adsense/register', (req, res) => {
    const { id, title, author, category, gradient, icon, desc, fullReview, script, actionGuide } = req.body;
    if (!id || !title) return res.status(400).json({ error: 'ID와 제목은 필수입니다.' });

    try {
        const filePath = path.resolve(__dirname, '../src/data/adsense/books.js');
        let content = fs.readFileSync(filePath, 'utf-8');
        const lastBraceIndex = content.lastIndexOf('];');
        
        if (lastBraceIndex !== -1) {
            // object string
            let newObjStr = `\n    {\n`;
            newObjStr += `        id: "${id.replace(/"/g, '\\"')}",\n`;
            newObjStr += `        title: "${title.replace(/"/g, '\\"')}",\n`;
            newObjStr += `        author: "${(author || '').replace(/"/g, '\\"')}",\n`;
            newObjStr += `        category: "${(category || '').replace(/"/g, '\\"')}",\n`;
            newObjStr += `        desc: "${(desc || '').replace(/"/g, '\\"')}",\n`;
            newObjStr += `        gradient: "${(gradient || 'from-green-700 to-teal-950')}",\n`;
            newObjStr += `        icon: "${(icon || 'book')}",\n`;
            newObjStr += `        fullReview: \`${(fullReview || '').replace(/`/g, '\\`')}\`,\n`;
            
            if (script && Array.isArray(script)) {
                newObjStr += `        script: ${JSON.stringify(script, null, 12).replace(/\\n/g, ' ')},\n`;
            } else {
                newObjStr += `        script: [],\n`;
            }
            if (actionGuide && Array.isArray(actionGuide)) {
                newObjStr += `        actionGuide: ${JSON.stringify(actionGuide, null, 12).replace(/\\n/g, ' ')}\n`;
            } else {
                newObjStr += `        actionGuide: []\n`;
            }
            newObjStr += `    }\n`;

            const inserted = `    ,${newObjStr}`;
            content = content.slice(0, lastBraceIndex) + inserted + content.slice(lastBraceIndex);
            fs.writeFileSync(filePath, content, 'utf-8');
            res.json({ success: true, message: 'AdSense review added successfully.', id });
        } else {
            res.status(500).json({ error: 'Could not find array end in books.js' });
        }
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});
// ─────────────────────────────────────────────────────────────

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
