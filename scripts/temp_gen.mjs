
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function generate() {
    const api_key = process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!api_key) {
        console.error('Missing API Key');
        return;
    }
    const genAI = new GoogleGenerativeAI(api_key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    console.log('Generating script...');
    const scriptPrompt = "Generate a 40+ turn Empathetic/Funny Office-life dialogue script (Script 2.0 style) for the book 'How to Live' by Derek Sivers. Exactly two speakers: James (Male) and Stella (Female). Consistency: James = 0, 2, 4..., Stella = 1, 3, 5... Goal: Empathize with office workers during commute/lunch. Theme: 27 conflicting answers to how to live. Output as JSON array: [ { speaker: 'James', text: '...' }, { speaker: 'Stella', text: '...' } ]";
    const scriptResult = await model.generateContent(scriptPrompt);
    const scriptMatch = scriptResult.response.text().match(/\[[\s\S]*\]/);
    if (!scriptMatch) {
       console.error('Failed to parse script JSON', scriptResult.response.text());
       return;
    }
    const scriptText = scriptMatch[0];

    console.log('Generating review...');
    const reviewPrompt = "Generate a 3,000+ chars high-density review for 'How to Live' by Derek Sivers. Style: Professional, empathetic, insightful. Emphasize how it helps office workers. Output as plain text.";
    const reviewResult = await model.generateContent(reviewPrompt);
    const reviewText = reviewResult.response.text();

    fs.mkdirSync('final_podcast', { recursive: true });
    fs.writeFileSync('final_podcast/how_to_live_script.json', scriptText);
    fs.writeFileSync('final_podcast/how_to_live_review.txt', reviewText);
    console.log('✅ Generated script and review');
}
generate().catch(console.error);
