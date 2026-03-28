const fs = require('fs');
const path = require('path');

// Mock export to read the file
const content = fs.readFileSync('c:/Users/admin/Desktop/book/the-archive/src/data/celebrities.js', 'utf8');
// Very basic extraction of the object
const mockModule = { exports: {} };
const code = content.replace('export const celebrities =', 'module.exports =');
fs.writeFileSync('c:/Users/admin/Desktop/book/the-archive/src/data/temp_celeb.js', code);

const celebrities = require('./temp_celeb.js');

const books = [];
celebrities.forEach(celeb => {
    celeb.books.forEach(book => {
        books.push({
            celeb: celeb.name,
            title: book.title,
            author: book.author,
            id: book.id
        });
    });
});

console.log(JSON.stringify(books, null, 2));
fs.unlinkSync('c:/Users/admin/Desktop/book/the-archive/src/data/temp_celeb.js');
