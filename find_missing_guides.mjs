import fs from 'fs';
import path from 'path';

const filePath = 'c:/Users/admin/Desktop/book/the-archive/src/data/celebrities.js';
const content = fs.readFileSync(filePath, 'utf8');

// Use a regex to find all book blocks
// A simple way is to find all "title: " occurrences and check if "actionGuide: " follows before the next book or end of celebrity
const books = [];
const bookRegex = /\{\s*id:\s*"([^"]+)",[\s\S]*?title:\s*"([^"]+)"[\s\S]*?\}/g;
let match;

while ((match = bookRegex.exec(content)) !== null) {
    const bookBlock = match[0];
    const id = match[1];
    const title = match[2];

    if (!bookBlock.includes('actionGuide:')) {
        books.push({ id, title });
    }
}

console.log(JSON.stringify(books, null, 2));
