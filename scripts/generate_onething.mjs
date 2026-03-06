import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractTextFromFile, generatePodcastScript, generateBookReview } from './auto_podcast_pipeline.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '../final_podcast');
const SCRIPT_PATH_1 = path.resolve(__dirname, '../final_podcast/onething_script.json');
const SCRIPT_PATH_2 = path.resolve(__dirname, '../final_podcast/one-thing_script.json');
const REVIEW_PATH_1 = path.resolve(__dirname, '../final_podcast/onething_review.txt');
const REVIEW_PATH_2 = path.resolve(__dirname, '../final_podcast/one-thing_review.txt');

async function main() {
    // 1. Delete existing
    if (fs.existsSync(SCRIPT_PATH_1)) fs.unlinkSync(SCRIPT_PATH_1);
    if (fs.existsSync(SCRIPT_PATH_2)) fs.unlinkSync(SCRIPT_PATH_2);
    if (fs.existsSync(REVIEW_PATH_1)) fs.unlinkSync(REVIEW_PATH_1);
    if (fs.existsSync(REVIEW_PATH_2)) fs.unlinkSync(REVIEW_PATH_2);
    console.log("Deleted existing script and review if they existed.");

    // 2. Extract text (using either but picking one-thing.txt if it exists)
    let text;
    if (fs.existsSync(path.resolve(__dirname, '../ebook_inputs/one-thing.txt'))) {
        text = await extractTextFromFile('one-thing.txt');
    } else {
        text = await extractTextFromFile('onething.txt');
    }

    // 3. Generate script
    console.log("Generating Script for one-thing...");
    const script = await generatePodcastScript(text);
    fs.writeFileSync(SCRIPT_PATH_2, JSON.stringify(script, null, 2));
    console.log(`Script saved to ${SCRIPT_PATH_2}`);

    // 4. Update bookScripts.js
    let bookScriptsContent = fs.readFileSync(path.resolve(__dirname, '../src/data/bookScripts.js'), 'utf-8');
    const formattedScript = script.map(turn => ({
        role: turn.speaker === '제임스' ? 'A' : 'B',
        text: turn.text
    }));
    const entry = JSON.stringify(formattedScript, null, 8);

    // Remove if onething exists
    const oldEntryRegex = new RegExp(`["']?onething["']?:\\s*\\[[\\s\\S]*?\\],?`, 'g');
    bookScriptsContent = bookScriptsContent.replace(oldEntryRegex, '');

    const entryRegex = new RegExp(`["']?one-thing["']?:\\s*\\[[\\s\\S]*?\\],?`, 'g');
    if (bookScriptsContent.match(entryRegex)) {
        bookScriptsContent = bookScriptsContent.replace(entryRegex, `"one-thing": ${entry},`);
    } else {
        const lastBraceIndex = bookScriptsContent.lastIndexOf('};');
        if (lastBraceIndex !== -1) {
            bookScriptsContent = bookScriptsContent.slice(0, lastBraceIndex) + `    "one-thing": ${entry},\n` + bookScriptsContent.slice(lastBraceIndex);
        }
    }
    fs.writeFileSync(path.resolve(__dirname, '../src/data/bookScripts.js'), bookScriptsContent);
    console.log("bookScripts.js updated.");

    // 5. Generate Review
    console.log("Generating Review for one-thing...");
    const review = await generateBookReview(text, '원씽', '게리 켈러', '비즈니스북스');
    fs.writeFileSync(REVIEW_PATH_2, review);
    console.log(`Review saved to ${REVIEW_PATH_2}`);

    // 6. Update celebrities.js
    const celebFilePath = path.resolve(__dirname, '../src/data/celebrities.js');
    if (fs.existsSync(celebFilePath)) {
        let content = fs.readFileSync(celebFilePath, 'utf-8');
        const escaped = review.replace(/`/g, "'").replace(/\$/g, '\\$');
        // 'one-thing' matcher
        const reviewRegex = new RegExp(`(id:\\s*["']one-thing["'][\\s\\S]{1,1000}review:\\s*)\`[\\s\\S]*?\``);
        if (content.match(reviewRegex)) {
            content = content.replace(reviewRegex, `$1\`${escaped}\``);
            fs.writeFileSync(celebFilePath, content, 'utf-8');
            console.log("celebrities.js review updated.");
        } else {
            console.warn("Could not find review field for 'one-thing' in celebrities.js");
        }
    }

    console.log("Done generating! Ready for ElevenLabs injection.");
}

main().catch(console.error);
