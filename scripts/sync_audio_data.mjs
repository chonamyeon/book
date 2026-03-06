import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUDIO_DIR = path.resolve(__dirname, '../public/audio');
const CELEB_FILE = path.resolve(__dirname, '../src/data/celebrities.js');

async function syncAudioData() {
    console.log('🔄 [Sync] 오디오 파일과 데이터 연동 시작...');

    if (!fs.existsSync(AUDIO_DIR)) {
        console.error('❌ 오디오 폴더를 찾을 수 없습니다.');
        return;
    }

    const audioFiles = fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3'));
    console.log(`🎵 발견된 오디오 파일: ${audioFiles.length}개`);

    if (!fs.existsSync(CELEB_FILE)) {
        console.error('❌ celebrities.js 파일을 찾을 수 없습니다.');
        return;
    }

    let content = fs.readFileSync(CELEB_FILE, 'utf-8');
    let updatedCount = 0;

    // ID 매핑 (파일명 -> 데이터 ID)
    const idMapping = {
        'one-thing': 'one-thing',
        'onething': 'one-thing',
        'vegetarian-hk': 'vegetarian-hk',
        'vegetarian-rm': 'vegetarian',
        'human-acts-hk': 'human-acts',
        '1984-rm': '1984'
    };

    for (const file of audioFiles) {
        const baseName = path.parse(file).name;
        const entryId = idMapping[baseName] || baseName;
        const audioUrl = `/audio/${file}`;

        console.log(`🔍 [${entryId}] 처리 중...`);

        // id: "id" 블록을 찾아서 isPodcast와 podcastFile 필드를 업데이트하거나 추가
        // 정규식 설명: id: "entryId" 이후 다음 중괄호 } 또는 다음 id: 가 나오기 전까지의 블록을 매칭
        const blockRegex = new RegExp(`({[^{}]*?id:\s*["']${entryId}["'][^{}]*?})`, 'g');
        
        let match;
        let blockMatches = [];
        while ((match = blockRegex.exec(content)) !== null) {
            blockMatches.push(match);
        }

        if (blockMatches.length > 0) {
            for (const m of blockMatches) {
                let block = m[0];
                let originalBlock = block;

                // 이미 데이터가 있는지 확인
                if (block.includes('isPodcast: true') && block.includes(`podcastFile: "${audioUrl}"`)) {
                    continue; 
                }

                // 기존 필드가 있으면 교체, 없으면 추가
                if (block.includes('isPodcast:')) {
                    block = block.replace(/isPodcast:\s*[^,}\s]+/, 'isPodcast: true');
                } else {
                    block = block.replace(`id: "${entryId}",`, `id: "${entryId}",
                isPodcast: true,`);
                    // 쌍따옴표/홑따옴표 대응
                    block = block.replace(`id: '${entryId}',`, `id: '${entryId}',
                isPodcast: true,`);
                }

                if (block.includes('podcastFile:')) {
                    block = block.replace(/podcastFile:\s*["'][^"']*["']/, `podcastFile: "${audioUrl}"`);
                } else {
                    block = block.replace('isPodcast: true,', `isPodcast: true,
                podcastFile: "${audioUrl}",`);
                }

                if (block !== originalBlock) {
                    content = content.replace(originalBlock, block);
                    updatedCount++;
                }
            }
        }
    }

    if (updatedCount > 0) {
        fs.writeFileSync(CELEB_FILE, content, 'utf-8');
        console.log(`✅ [완료] ${updatedCount}개의 데이터 항목이 업데이트되었습니다.`);
    } else {
        console.log('ℹ️ 업데이트할 항목이 없습니다. (이미 최신 상태)');
    }
}

syncAudioData().catch(console.error);
