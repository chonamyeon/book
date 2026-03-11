
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const INTRO_JINGLE = path.join(PROJECT_ROOT, 'public', 'music', 'intro_jingle.mp3');
const AUDIO_OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'audio');
const SYNC_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'sync-audio.js');

function processFile(wavPath) {
    if (!fs.existsSync(wavPath)) {
        console.error(`Error: ${wavPath} not found.`);
        return;
    }

    // Clean up filename: remove .wav, _tts, and parenthetical trailing numbers like (1)
    let baseName = path.basename(wavPath, path.extname(wavPath));
    baseName = baseName.replace(/_tts/gi, '')
        .replace(/\s*\(\d+\)$/, '')
        .trim();

    const outputMp3 = path.join(AUDIO_OUTPUT_DIR, `${baseName}.mp3`);

    // Skip if already exists to avoid redundant processing and duplicates
    if (fs.existsSync(outputMp3)) {
        console.log(`Skipping: ${baseName}.mp3 already exists.`);
        return;
    }

    console.log(`Processing: ${wavPath} -> ${outputMp3}`);

    // FFmpeg command to merge intro + target + intro with 44.1kHz Stereo resampling
    try {
        const filterComplex =
            `[0:a]aresample=44100:osr=44100:ochl=stereo[a0];` +
            `[1:a]aresample=44100:osr=44100:ochl=stereo[a1];` +
            `[2:a]aresample=44100:osr=44100:ochl=stereo[a2];` +
            `[a0][a1][a2]concat=n=3:v=0:a=1[out]`;

        const cmd = `ffmpeg -y -i "${INTRO_JINGLE}" -i "${wavPath}" -i "${INTRO_JINGLE}" -filter_complex "${filterComplex}" -map "[out]" -b:a 192k "${outputMp3}"`;

        execSync(cmd, { stdio: 'inherit' });
        console.log(`Successfully created ${outputMp3}`);
    } catch (err) {
        console.error(`FFmpeg error processing ${wavPath}:`, err.message);
    }
}

function main() {
    const DOWNLOADS_DIR = path.join(process.env.USERPROFILE || 'C:\\Users\\admin', 'Downloads');

    const searchDirs = [PROJECT_ROOT, DOWNLOADS_DIR];
    let allWavFiles = [];

    console.log("Searching for WAV files in:");
    searchDirs.forEach(dir => {
        if (!fs.existsSync(dir)) return;
        console.log(` - ${dir}`);
        const files = fs.readdirSync(dir);
        const wavs = files
            .filter(f => f.toLowerCase().endsWith('.wav') && !f.toLowerCase().includes('jingle'))
            .map(f => path.join(dir, f));
        allWavFiles = allWavFiles.concat(wavs);
    });

    if (allWavFiles.length === 0) {
        console.log("No pending .wav files found in project root or Downloads.");
        return;
    }

    console.log(`Found ${allWavFiles.length} files to process.`);
    for (const wavPath of allWavFiles) {
        processFile(wavPath);
    }

    console.log("\nRunning sync-audio.js...");
    try {
        execSync(`node "${SYNC_SCRIPT}"`, { stdio: 'inherit' });
    } catch (err) {
        console.error("Error running sync-audio.js:", err.message);
    }

    console.log("\nAll files processed successfully.");
}

main();
