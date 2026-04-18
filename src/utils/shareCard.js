import QRCode from 'qrcode';

function loadImageCORS(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('CORS load failed'));
        img.src = src;
    });
}

function loadImageNoCORS(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = src;
    });
}

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

async function drawCard(ctx, W, H, book, shareUrl, coverImg) {
    // ── Background ──────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0a0d14');
    bg.addColorStop(1, '#0f1520');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Gold center glow
    const glow = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, 520);
    glow.addColorStop(0, 'rgba(212,175,55,0.07)');
    glow.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // ── Top branding ─────────────────────────────────
    ctx.font = 'italic bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(212,175,55,0.85)';
    ctx.fillText('✦  ARCHIVIEW  ✦', W / 2, 68);

    // Top divider
    ctx.strokeStyle = goldGrad(ctx, W);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(80, 90);
    ctx.lineTo(W - 80, 90);
    ctx.stroke();

    // ── Book Cover ───────────────────────────────────
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
        ctx.font = 'bold 48px Georgia';
        ctx.fillStyle = 'rgba(212,175,55,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText('📚', W / 2, coverY + coverSize / 2 + 16);
    }
    ctx.shadowBlur = 0;

    // ── Divider ──────────────────────────────────────
    const divY = coverY + coverSize + 55;
    ctx.strokeStyle = goldGrad(ctx, W);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, divY);
    ctx.lineTo(W - 120, divY);
    ctx.stroke();

    // ── Title ────────────────────────────────────────
    ctx.textAlign = 'center';
    ctx.font = 'bold 74px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.fillStyle = '#ffffff';
    const titleLines = wrapText(ctx, book.title || '', W - 160);
    const titleY = divY + 82;
    titleLines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, W / 2, titleY + i * 88);
    });

    // ── Author ───────────────────────────────────────
    const authorY = titleY + Math.min(titleLines.length, 2) * 88 + 18;
    ctx.font = '400 38px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.fillStyle = 'rgba(212,175,55,0.75)';
    ctx.fillText(book.author || '', W / 2, authorY);

    // ── Description quote ────────────────────────────
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

    // ── Bottom Section ───────────────────────────────
    const botY = H - 220;

    // Bottom divider
    ctx.strokeStyle = goldGrad(ctx, W);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, botY);
    ctx.lineTo(W - 120, botY);
    ctx.stroke();

    // Gold corner dots
    ctx.fillStyle = 'rgba(212,175,55,0.6)';
    ctx.beginPath(); ctx.arc(120, botY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W - 120, botY, 4, 0, Math.PI * 2); ctx.fill();

    // QR Code
    try {
        const qrDataUrl = await QRCode.toDataURL(shareUrl, {
            width: 180,
            margin: 1,
            color: { dark: '#d4af37', light: '#0a0d1400' },
        });
        const qrImg = await loadImageNoCORS(qrDataUrl);
        ctx.drawImage(qrImg, 95, botY + 18, 162, 162);
    } catch {
        // QR 실패 시 스킵
    }

    // URL text
    ctx.textAlign = 'left';
    ctx.font = 'bold 38px Georgia, serif';
    ctx.fillStyle = 'rgba(212,175,55,0.95)';
    ctx.fillText('archiview.shop', 288, botY + 82);

    ctx.font = '300 27px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText('출퇴근길 성공한 사람들의 이야기를 듣다', 288, botY + 128);

    ctx.font = '700 20px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    ctx.fillStyle = 'rgba(212,175,55,0.65)';
    ctx.fillText('PREMIUM DIGITAL LIBRARY', 288, botY + 165);
}

function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob returned null')), 'image/png');
        } catch (e) {
            reject(e);
        }
    });
}

export async function generateShareCard(book, shareUrl) {
    const W = 1080;
    const H = 1350;

    const src = book.cover?.startsWith('http')
        ? book.cover
        : `https://archiview.shop${book.cover}`;

    // 1. CORS 로드 시도 (archiview.shop 등 CORS 지원 서버)
    let coverImg = null;
    try {
        coverImg = await loadImageCORS(src);
    } catch {
        // 2. CORS 없이 로드 시도 (yes24 등 외부 이미지 — canvas가 tainted될 수 있음)
        try {
            coverImg = await loadImageNoCORS(src);
        } catch {
            coverImg = null;
        }
    }

    // 3. 카드 그리기 (coverImg가 있으면 표지 포함)
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    await drawCard(ctx, W, H, book, shareUrl, coverImg);

    // 4. toBlob 시도 — tainted canvas면 SecurityError 발생
    try {
        return await canvasToBlob(canvas);
    } catch {
        // 5. Tainted canvas fallback: 표지 없이 재생성
        const canvas2 = document.createElement('canvas');
        canvas2.width = W;
        canvas2.height = H;
        const ctx2 = canvas2.getContext('2d');
        await drawCard(ctx2, W, H, book, shareUrl, null);
        return await canvasToBlob(canvas2);
    }
}

export async function shareCard(book, shareUrl) {
    const blob = await generateShareCard(book, shareUrl);
    const fileName = `archiview-${book.id || book.title}.png`;

    // 모바일: 네이티브 이미지 공유 (인스타 스토리 등)
    if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: `[아카이뷰] ${book.title}`,
                url: shareUrl,
            });
            return;
        }
    }

    // PC 폴백: 이미지 다운로드
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}
