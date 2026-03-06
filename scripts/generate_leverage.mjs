import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractTextFromFile, generatePodcastScript, generateBookReview } from './auto_podcast_pipeline.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '../final_podcast');
const SCRIPT_PATH = path.resolve(__dirname, '../final_podcast/leverage_script.json');
const REVIEW_PATH = path.resolve(__dirname, '../final_podcast/leverage_review.txt');

async function main() {
    // 1. Delete existing
    if (fs.existsSync(SCRIPT_PATH)) fs.unlinkSync(SCRIPT_PATH);
    if (fs.existsSync(REVIEW_PATH)) fs.unlinkSync(REVIEW_PATH);
    console.log("Deleted existing script and review if they existed.");

    // 2. Extract text
    const text = await extractTextFromFile('leverage.txt');

    // 3. Generate script
    console.log("Generating Script for leverage...");
    const script = await generatePodcastScript(text);
    fs.writeFileSync(SCRIPT_PATH, JSON.stringify(script, null, 2));
    console.log(`Script saved to ${SCRIPT_PATH}`);

    // 4. Update bookScripts.js
    let bookScriptsContent = fs.readFileSync(path.resolve(__dirname, '../src/data/bookScripts.js'), 'utf-8');
    const formattedScript = script.map(turn => ({
        role: turn.speaker === '제임스' ? 'A' : 'B',
        text: turn.text
    }));
    const entry = JSON.stringify(formattedScript, null, 8);
    const entryRegex = new RegExp(`["']?leverage["']?:\\s*\\[[\\s\\S]*?\\],?`, 'g');
    if (bookScriptsContent.match(entryRegex)) {
        bookScriptsContent = bookScriptsContent.replace(entryRegex, `"leverage": ${entry},`);
    } else {
        const lastBraceIndex = bookScriptsContent.lastIndexOf('};');
        if (lastBraceIndex !== -1) {
            bookScriptsContent = bookScriptsContent.slice(0, lastBraceIndex) + `    "leverage": ${entry},\n` + bookScriptsContent.slice(lastBraceIndex);
        }
    }
    fs.writeFileSync(path.resolve(__dirname, '../src/data/bookScripts.js'), bookScriptsContent);
    console.log("bookScripts.js updated.");

    // 5. Generate Review
    console.log("Generating Review for leverage...");
    const review = await generateBookReview(text, '레버리지', '롭 무어', '다산북스');
    fs.writeFileSync(REVIEW_PATH, review);
    console.log(`Review saved to ${REVIEW_PATH}`);

    // 6. Update celebrities.js
    const celebFilePath = path.resolve(__dirname, '../src/data/celebrities.js');
    if (fs.existsSync(celebFilePath)) {
        let content = fs.readFileSync(celebFilePath, 'utf-8');
        const escaped = review.replace(/`/g, "'").replace(/\$/g, '\\$');
        const reviewRegex = new RegExp(`(id:\\s*["']leverage["'][\\s\\S]{1,1000}review:\\s*)\`[\\s\\S]*?\``);
        if (content.match(reviewRegex)) {
            content = content.replace(reviewRegex, `$1\`${escaped}\``);
            fs.writeFileSync(celebFilePath, content, 'utf-8');
            console.log("celebrities.js review updated.");
        } else {
            console.warn("Could not find review field for 'leverage' in celebrities.js");
        }
    }

    console.log("Done generating! Ready for ElevenLabs injection.");
}

main().catch(console.error);
