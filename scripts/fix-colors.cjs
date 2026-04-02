const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/orange-500/g, 'gold')
                     .replace(/orange-600/g, 'gold')
                     .replace(/orange-400/g, 'gold');
    fs.writeFileSync(filePath, content, 'utf8');
});
console.log('Processed', files.length, 'files.');
