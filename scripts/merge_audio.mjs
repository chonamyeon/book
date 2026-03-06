import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.resolve(__dirname, '../temp_audio');
const OUTPUT_FILE = path.resolve(__dirname, '../public/audio/sayno.mp3');

console.log("Reading from:", TEMP_DIR);
const files = fs.readdirSync(TEMP_DIR).filter(f => f.startsWith('gemini_audio_') && f.endsWith('.wav')).sort();
console.log("Found files:", files.length);

if (files.length === 0) {
    console.error("No audio files found!");
    process.exit(1);
}

const pcmPath = path.join(TEMP_DIR, 'concat_new.pcm');
const buffers = files.map(f => fs.readFileSync(path.join(TEMP_DIR, f)));
fs.writeFileSync(pcmPath, Buffer.concat(buffers));

console.log("Wrote PCM:", pcmPath);

const ffmpegPath = ffmpegInstaller.path;

try {
    execSync(`"${ffmpegPath}" -f s16le -ar 24000 -ac 1 -i concat_new.pcm -c:a libmp3lame -q:a 2 -y "${OUTPUT_FILE.replace(/\\/g, '/')}"`, { cwd: TEMP_DIR, stdio: 'inherit' });
    console.log("Merged successfully to:", OUTPUT_FILE);
} catch (e) {
    console.error("Merge error:", e.message);
}
