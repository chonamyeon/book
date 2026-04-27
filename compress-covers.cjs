const sharp = require('./node_modules/sharp');
const path = require('path');
const fs = require('fs');

const files = [
    'brain-space-part1.png',
    'brain-space-part2.png',
    'brain-space-part3.png',
];

const inputDir = './public/images/covers';

(async () => {
    for (const file of files) {
        const input = path.join(inputDir, file);
        const output = path.join(inputDir, file.replace('.png', '.jpg'));
        await sharp(input)
            .resize(400, 600, { fit: 'cover', position: 'center' })
            .jpeg({ quality: 82, progressive: true })
            .toFile(output);
        const { size } = fs.statSync(output);
        console.log(`${file} → ${Math.round(size/1024)} KB`);
    }
    console.log('완료!');
})();
