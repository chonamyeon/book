const fs = require('fs');

const FILE_PATH = 'c:/Users/admin/Desktop/book/the-archive/src/data/celebrities.js';
const TAG = 'archiview2026-20';

// Direct Link Mapping (Sanitized for the script)
const directLinks = {
    '상실의 시대': 'https://www.amazon.com/Norwegian-Wood-Haruki-Murakami/dp/0375704027',
    '레버리지': 'https://www.amazon.com/Life-Leverage-Outsource-Everything-Lifestyle/dp/1473640285',
    '사피엔스': 'https://www.amazon.com/Sapiens-Brief-History-Humankind-ebook/dp/B00ICN0Y04',
    '팩트풀니스': 'https://www.amazon.com/Factfulness-Reasons-Wrong-About-World-ebook/dp/B075S45K3M',
    '배드 블러드': 'https://www.amazon.com/Bad-Blood-Secrets-Silicon-Valley/dp/1524731653',
    '배움의 발견': 'https://www.amazon.com/Educated-Memoir-Tara-Westover/dp/0399590501',
    '21세기를 위한 21가지 제언': 'https://www.amazon.com/21-Lessons-21st-Century-Harari/dp/0525512170',
    '데드라인': 'https://www.amazon.com/Range-Generalists-Triumph-Specialized-World/dp/0735214484',
    '디즈니만이 하는 것': 'https://www.amazon.com/Ride-Lifetime-Lessons-Learned-Disney/dp/0399592091',
    '호흡의 기술': 'https://www.amazon.com/Breath-New-Science-Lost-Art/dp/0735213615',
    '부의 추월차선': 'https://www.amazon.com/Millionaire-Fastlane-Crack-Code-Lifetime/dp/0984358102',
    '클루지': 'https://www.amazon.com/Kluge-Haphazard-Construction-Human-Mind/dp/0547055734',
    '초집중': 'https://www.amazon.com/Indistractable-Control-Attention-Choose-Life/dp/1948836531',
    '아주 작은 습관의 힘': 'https://www.amazon.com/Atomic-Habits-Proven-Build-Good/dp/0735211299',
    '정리하는 뇌': 'https://www.amazon.com/Organized-Mind-Thinking-Straight-Information/dp/0147516315',
    '타이탄의 도구들': 'https://www.amazon.com/Tools-Titans-Billionaires-Icons-World-Class/dp/1328683788',
    '제로부터 원': 'https://www.amazon.com/Zero-One-Notes-Startups-Future/dp/0804139296',
    '제로 투 원': 'https://www.amazon.com/Zero-One-Notes-Startups-Future/dp/0804139296',
    '원칙': 'https://www.amazon.com/Principles-Life-Work-Ray-Dalio/dp/1501124021',
    '다크 호스': 'https://www.amazon.com/Dark-Horse-Achieving-Success-Through/dp/0062837777',
    '4시간': 'https://www.amazon.com/4-Hour-Workweek-Escape-Anywhere-Joining/dp/0307465357',
    '생각하라 그리고 부자가 되어라': 'https://www.amazon.com/Think-Grow-Rich-Napoleon-Hill/dp/1585424331',
    '죽음의 수용소에서': 'https://www.amazon.com/Mans-Search-Meaning-Viktor-Frankl/dp/0807014273',
    '성공하는 기업들의 8가지 습관': 'https://www.amazon.com/Built-Last-Successful-Visionary-Companies/dp/0060516402',
    '좋은 기업을 넘어 위대한 기업으로': 'https://www.amazon.com/Good-Great-Some-Companies-Others/dp/0066620996',
    '혁신 기업의 딜레마': 'https://www.amazon.com/Innovators-Dilemma-Revolutionary-Change-Business/dp/0062060244',
    '스티브 잡스': 'https://www.amazon.com/Steve-Jobs-Walter-Isaacson/dp/198217686X',
    '슈독': 'https://www.amazon.com/Shoe-Dog-Memoir-Creator-Nike/dp/1501135910',
    '알리바바': 'https://www.amazon.com/Alibaba-House-That-Jack-Built/dp/0062413401',
    '하드씽': 'https://www.amazon.com/Hard-Thing-About-Things-Building/dp/0062279776',
    '생각에 관한 생각': 'https://www.amazon.com/Thinking-Fast-Slow-Daniel-Kahneman/dp/0374533555',
    '콰이어트': 'https://www.amazon.com/Quiet-Power-Introverts-World-Talking/dp/0307352153',
    '습관의 힘': 'https://www.amazon.com/Power-Habit-Why-Do-What/dp/081298160X',
    '그릿': 'https://www.amazon.com/Grit-Passion-Perseverance-Angela-Duckworth/dp/1501111108',
    '마인드셋': 'https://www.amazon.com/Mindset-New-Psychology-Success-Carol/dp/0345472322',
    '상식 밖의 경제학': 'https://www.amazon.com/Predictably Irrational-Hidden-Forces-Decisions/dp/0061353248',
    '괴짜경제학': 'https://www.amazon.com/Freakonomics-Economist-Explores-Hidden-Everything/dp/0060737416',
    '아웃라이어': 'https://www.amazon.com/Outliers-Story-Success-Malcolm-Gladwell/dp/0316017930'
};

function getAmazonUrl(title, author) {
    if (directLinks[title]) {
        const base = directLinks[title];
        return base.includes('?') ? `${base}&tag=${TAG}` : `${base}?tag=${TAG}`;
    }
    const query = `${title} ${author} book`;
    return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${TAG}`;
}

async function update() {
    console.log('Reading file...');
    const fileContent = fs.readFileSync(FILE_PATH, 'utf8');
    
    // We need to strip the "export const celebrities =" to parse it as JSON
    // Or just use a safer regex approach
    const jsonMatch = fileContent.match(/export const celebrities = ([\s\S]*);/);
    if (!jsonMatch) {
        console.error('Could not find celebrities export');
        return;
    }

    // Since it's a JS file, it might not be perfect JSON (e.g. no quotes on keys)
    // We'll use a trick: write it to a temp cjs file and require it.
    const tempFilePath = FILE_PATH.replace('.js', '_temp.cjs');
    const cjsContent = fileContent.replace('export const celebrities =', 'module.exports =');
    fs.writeFileSync(tempFilePath, cjsContent);

    const celebrities = require(tempFilePath);
    let updatedCount = 0;

    celebrities.forEach(celeb => {
        celeb.books.forEach(book => {
            if (!book.amazonLink) {
                book.amazonLink = getAmazonUrl(book.title, book.author);
                updatedCount++;
            }
        });
    });

    console.log(`Updated ${updatedCount} books.`);

    // Stringify back - use 4 spaces to match the original style (looks like 4 or 2)
    const newContent = 'export const celebrities = ' + JSON.stringify(celebrities, null, 4) + ';\n';
    fs.writeFileSync(FILE_PATH, newContent);
    fs.unlinkSync(tempFilePath);
    
    console.log('Update complete!');
}

update();
