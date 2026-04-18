import QRCode from 'qrcode';

function fillRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && cur) {
            lines.push(cur);
            cur = word;
        } else {
            cur = test;
        }
    }
    if (cur) lines.push(cur);
    return lines;
}

function goldGrad(ctx, W) {
    const g = ctx.createLinearGradient(80, 0, W - 80, 0);
    g.addColorStop(0, 'rgba(212,175,55,0)');
    g.addColorStop(0.5, 'rgba(212,175,55,0.7)');
    g.addColorStop(1, 'rgba(212,175,55,0)');
    return g;
}

async function fetchAsBlob(url) {
    const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(blobUrl); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(); };
        img.src = blobUrl;
    });
}

async function loadImageCORS(src) {
    // 1차: 직접 fetch (same-origin 또는 CORS 지원 외부 URL)
    try { return await fetchAsBlob(src); } catch {}

    // 2차: images.weserv.nl 프록시 (외부 도메인 CORS 우회)
    try {
        const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(src)}&output=jpg&il`;
        return await fetchAsBlob(proxied);
    } catch {}

    throw new Error('image load failed');
}

async function loadDataUrlImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

async function drawCard(ctx, W, H, book, shareUrl, coverImg) {
    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0a0d14');
    bg.addColorStop(1, '#0f1520');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, 520);
    glow.addColorStop(0, 'rgba(212,175,55,0.07)');
    glow.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Top branding
    ctx.font = 'italic bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(212,175,55,0.85)';
    ctx.fillText('✦  ARCHIVIEW  ✦', W / 2, 68);

    ctx.strokeStyle = goldGrad(ctx, W);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(80, 90);
    ctx.lineTo(W - 80, 90);
    ctx.stroke();

    // Book Cover
    const coverSize = 500;
    const coverX = (W - coverSize) / 2;
    const coverY = 120;

    if (coverImg) {
        ctx.shadowColor = 'rgba(212,175,55,0.25)';
        ctx.shadowBlur = 50;
        ctx.save();
        fillRoundRect(ctx, coverX, coverY, coverSize, coverSize, 20);
        ctx.clip();
        const r = coverImg.width / coverImg.height;
        let dw = coverSize, dh = coverSize, dx = coverX, dy = coverY;
        if (r > 1) { dh = coverSize / r; dy += (coverSize - dh) / 2; }
        else { dw = coverSize * r; dx += (coverSize - dw) / 2; }
        ctx.drawImage(coverImg, dx, dy, dw, dh);
        ctx.restore();
    } else {
        ctx.fillStyle = 'rgba(212,175,55,0.12)';
        fillRoundRect(ctx, coverX, coverY, coverSize, coverSize, 20);
        ctx.fill();
        ctx.font = 'bold 80px serif';
        ctx.fillStyle = 'rgba(212,175,55,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText('📚', W / 2, coverY + coverSize / 2 + 28);
    }
    ctx.shadowBlur = 0;

    const divY = coverY + coverSize + 55;
    ctx.strokeStyle = goldGrad(ctx, W);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, divY);
    ctx.lineTo(W - 120, divY);
    ctx.stroke();

    // Title
    ctx.textAlign = 'center';
    ctx.font = 'bold 74px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.fillStyle = '#ffffff';
    const titleLines = wrapText(ctx, book.title || '', W - 160);
    const titleY = divY + 82;
    titleLines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, W / 2, titleY + i * 88);
    });

    const authorY = titleY + Math.min(titleLines.length, 2) * 88 + 18;
    ctx.font = '400 38px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.fillStyle = 'rgba(212,175,55,0.75)';
    ctx.fillText(book.author || '', W / 2, authorY);

    const desc = (book.desc || book.description || '').slice(0, 60);
    if (desc) {
        const descY = authorY + 60;
        ctx.font = 'italic 30px Georgia, serif';
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        const descLines = wrapText(ctx, `"${desc}"`, W - 220);
        descLines.slice(0, 2).forEach((line, i) => {
            ctx.fillText(line, W / 2, descY + i * 46);
        });
    }

    const botY = H - 280;
    ctx.strokeStyle = goldGrad(ctx, W);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, botY);
    ctx.lineTo(W - 120, botY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(212,175,55,0.6)';
    ctx.beginPath(); ctx.arc(120, botY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W - 120, botY, 4, 0, Math.PI * 2); ctx.fill();

    // QR (data: URL → canvas 오염 없음)
    const qrSize = 230;
    try {
        const qrDataUrl = await QRCode.toDataURL(shareUrl, {
            width: 260, margin: 1,
            color: { dark: '#d4af37', light: '#0a0d1400' },
        });
        const qrImg = await loadDataUrlImage(qrDataUrl);
        ctx.drawImage(qrImg, 80, botY + 20, qrSize, qrSize);
    } catch { /* skip */ }

    ctx.textAlign = 'left';
    ctx.font = 'bold 38px Georgia, serif';
    ctx.fillStyle = 'rgba(212,175,55,0.95)';
    ctx.fillText('archiview.store', 330, botY + 80);

    ctx.font = '300 27px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText('출퇴근길 성공한 사람들의 이야기를 듣다', 330, botY + 126);

    ctx.font = '700 20px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    ctx.fillStyle = 'rgba(212,175,55,0.65)';
    ctx.fillText('PREMIUM DIGITAL LIBRARY', 330, botY + 163);

    // URL text at bottom
    ctx.textAlign = 'center';
    ctx.font = '300 24px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(shareUrl, W / 2, botY + qrSize + 36);
}

/**
 * 카드를 data URL로 생성.
 * CORS 로드 성공 → 표지 포함, 실패 → 표지 없이 (tainted canvas 방지)
 */
export async function generateShareCard(book, shareUrl) {
    const W = 1080, H = 1350;

    const rawSrc = book.cover?.startsWith('http')
        ? book.cover
        : `https://archiview.store${book.cover || ''}`;

    // CORS 로드만 허용 — no-CORS는 canvas를 오염시켜 toDataURL 실패
    let coverImg = null;
    try { coverImg = await loadImageCORS(rawSrc); } catch { coverImg = null; }

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    await drawCard(ctx, W, H, book, shareUrl, coverImg);

    try {
        return canvas.toDataURL('image/png');
    } catch {
        // tainted fallback: 표지 없이 재시도
        const c2 = document.createElement('canvas');
        c2.width = W; c2.height = H;
        await drawCard(c2.getContext('2d'), W, H, book, shareUrl, null);
        return c2.toDataURL('image/png');
    }
}

/**
 * data URL 반환 — 공유/저장은 호출 측에서 처리
 */
export async function shareCard(book, shareUrl) {
    return await generateShareCard(book, shareUrl);
}

/* ─────────────────────────────────────────────────────────────────
   결과 페이지용 QR 공유 카드
───────────────────────────────────────────────────────────────── */
const RESULT_TYPE_META = {
    growth:        { emoji: '📈', label: '성장·실행형', hex1: '#1d4ed8', hex2: '#06b6d4' },
    entertainment: { emoji: '📚', label: '창의·탐험형', hex1: '#7c3aed', hex2: '#d946ef' },
    empathy:       { emoji: '💝', label: '공감·관계형', hex1: '#e11d48', hex2: '#f59e0b' },
    mindfulness:   { emoji: '🧘', label: '사색·마음형', hex1: '#059669', hex2: '#14b8a6' },
};

export async function generateResultQRCard(data, resultType, shareUrl) {
    const W = 1080, H = 1350;
    const meta = RESULT_TYPE_META[resultType] || RESULT_TYPE_META.growth;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // ── 배경 ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#07090f');
    bg.addColorStop(1, '#0c1220');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 타입 색상 글로우
    const glow = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, 620);
    glow.addColorStop(0, meta.hex1 + '28');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // ── 상단 브랜딩 ──
    ctx.font = 'italic bold 36px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(212,175,55,0.9)';
    ctx.fillText('✦  ARCHIVIEW  ✦', W / 2, 74);

    ctx.strokeStyle = goldGrad(ctx, W);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(80, 98); ctx.lineTo(W - 80, 98); ctx.stroke();

    // "독서 성향 분석 결과"
    ctx.font = '400 28px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillText('독서 성향 분석 결과', W / 2, 148);

    // ── 타입 배지 ──
    const bW = 260, bH = 60, bX = (W - bW) / 2, bY = 176;
    const badgeG = ctx.createLinearGradient(bX, 0, bX + bW, 0);
    badgeG.addColorStop(0, meta.hex1 + 'cc');
    badgeG.addColorStop(1, meta.hex2 + 'cc');
    ctx.fillStyle = badgeG;
    fillRoundRect(ctx, bX, bY, bW, bH, bH / 2);
    ctx.fill();
    ctx.font = '700 30px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(meta.label, W / 2, bY + 42);

    // ── 이모지 ──
    ctx.font = '200px serif';
    ctx.fillText(meta.emoji, W / 2, 520);

    // ── 골드 장식선 ──
    ctx.strokeStyle = goldGrad(ctx, W);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(160, 570); ctx.lineTo(W - 160, 570); ctx.stroke();

    // ── 서브타이틀 (메인 타이틀) ──
    ctx.font = 'bold 72px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.fillStyle = '#ffffff';
    const subtitleLines = wrapText(ctx, data.subtitle || '', W - 160);
    subtitleLines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, W / 2, 660 + i * 88);
    });

    // ── 페르소나 이름 ──
    const personaY = 660 + Math.min(subtitleLines.length, 2) * 88 + 36;
    ctx.font = '400 40px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.fillStyle = 'rgba(212,175,55,0.85)';
    ctx.fillText(data.persona || '', W / 2, personaY);

    // ── 요약 발췌 ──
    const summaryText = (data.summary || '').slice(0, 72);
    if (summaryText) {
        const sumY = personaY + 70;
        ctx.font = 'italic 30px Georgia, serif';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        const sumLines = wrapText(ctx, `"${summaryText}…"`, W - 200);
        sumLines.slice(0, 2).forEach((line, i) => {
            ctx.fillText(line, W / 2, sumY + i * 46);
        });
    }

    // ── 하단 구분선 ──
    const botY = H - 296;
    ctx.strokeStyle = goldGrad(ctx, W);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(120, botY); ctx.lineTo(W - 120, botY); ctx.stroke();
    ctx.fillStyle = 'rgba(212,175,55,0.6)';
    ctx.beginPath(); ctx.arc(120, botY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W - 120, botY, 4, 0, Math.PI * 2); ctx.fill();

    // ── QR 코드 ──
    const qrSize = 230;
    try {
        const qrDataUrl = await QRCode.toDataURL(shareUrl, {
            width: 260, margin: 1,
            color: { dark: '#d4af37', light: '#0a0d1400' },
        });
        const qrImg = await loadDataUrlImage(qrDataUrl);
        ctx.drawImage(qrImg, 80, botY + 18, qrSize, qrSize);
    } catch { /* skip */ }

    ctx.textAlign = 'left';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.fillStyle = 'rgba(212,175,55,0.95)';
    ctx.fillText('archiview.store', 330, botY + 80);

    ctx.font = '300 28px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('나의 독서 성향을 확인해보세요', 330, botY + 128);

    ctx.font = '700 22px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    ctx.fillStyle = 'rgba(212,175,55,0.6)';
    ctx.fillText('THE ARCHIVIEW · COGNITIVE TEST', 330, botY + 168);

    ctx.textAlign = 'center';
    ctx.font = '300 24px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillText(shareUrl, W / 2, botY + qrSize + 38);

    return canvas.toDataURL('image/png');
}
