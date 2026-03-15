import React, { useState } from 'react';

const VOICES_MALE = ['Charon', 'Fenrir', 'Orus', 'Puck'];
const VOICES_FEMALE = ['Kore', 'Aoede', 'Zephyr', 'Leda'];

const SAMPLE_DIALOGUE = `제임스: 야 근데 그거 진짜야? 나도 작년에 딱 그랬거든.
스텔라: 아 진짜? 나는 그때 진짜 황당했거든. 분명히 내가 다 한 건데 발표는 딴 사람이 하고 있더라고.
제임스: 그러니까. 팀장한테 칭찬 들을 줄 알았는데 결국 내 일만 늘어난 거잖아. 진짜 그때 뭔가 잘못됐다 싶었거든.
스텔라: 나중에 알고 보니까 팀장이 윗사람한테 보고할 때 내 이름을 쏙 빼버린 거잖아. 진짜 그때부터 뭔가 다르게 해야겠다 싶었거든.
제임스: 맞아. 그냥 열심히 한다고 되는 게 아니더라고. 보여주는 것도 실력이라는 걸 그때 처음 깨달은 것 같아.`;

const MULTI_FUNCTION_URL = 'https://asia-northeast3-book-site-123.cloudfunctions.net/generateTTSMulti';

function playPcm(base64) {
    const pcmBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const pcm16 = new Int16Array(pcmBuffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;
    const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
    return new Promise(resolve => { source.onended = () => { audioCtx.close(); resolve(); }; });
}

export default function TtsTestPage() {
    const [voiceA, setVoiceA] = useState('Charon');
    const [voiceB, setVoiceB] = useState('Kore');
    const [dialogue, setDialogue] = useState(SAMPLE_DIALOGUE);

    const handleDialogueChange = (val) => {
        const trimmed = val.trim();

        // JSON 배열 형식: [{"speaker":"제임스","text":"..."}]
        if (trimmed.startsWith('[')) {
            try {
                const json = JSON.parse(trimmed);
                if (Array.isArray(json) && json[0]?.speaker && json[0]?.text) {
                    setDialogue(json.map(t => `${t.speaker}: ${t.text}`).join('\n'));
                    return;
                }
            } catch {}
        }

        // [번호] 화자\n대사 형식
        if (/^\[\d+\]/.test(trimmed)) {
            const blocks = trimmed.split(/\n(?=\[\d+\])/);
            const lines = blocks.map(block => {
                const parts = block.split('\n');
                const header = parts[0]; // "[1] 제임스"
                const text = parts.slice(1).join(' ').trim();
                const speaker = header.replace(/^\[\d+\]\s*/, '').trim();
                return speaker && text ? `${speaker}: ${text}` : null;
            }).filter(Boolean);
            if (lines.length > 0) {
                setDialogue(lines.join('\n'));
                return;
            }
        }

        setDialogue(val);
    };
    const [loading, setLoading] = useState(null);
    const [result, setResult] = useState('');

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Preview: 기존 Gemini API 직접 호출
    const handleTestPreview = async (modelId) => {
        if (!apiKey) return alert('VITE_GEMINI_API_KEY 없음');
        setLoading(modelId);
        setResult('생성 중...');
        try {
            const lines = dialogue.split('\n').filter(Boolean);
            const multiText = lines.join('\n');
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: multiText }] }],
                        generationConfig: {
                            responseModalities: ['audio'],
                            speechConfig: {
                                multiSpeakerVoiceConfig: {
                                    speakerVoiceConfigs: [
                                        { speaker: '제임스', voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceA } } },
                                        { speaker: '스텔라', voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceB } } },
                                    ]
                                }
                            }
                        }
                    })
                }
            );
            if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
            const data = await res.json();
            const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!part) throw new Error('오디오 데이터 없음');
            setResult('재생 중...');
            await playPcm(part);
            setResult(`✅ ${modelId} 재생 완료`);
        } catch (e) {
            setResult(`❌ ${e.message}`);
        } finally {
            setLoading(null);
        }
    };

    // GA: Firebase Function 경유 (멀티스피커)
    const handleTestGA = async () => {
        setLoading('GA');
        setResult('생성 중 (GA 멀티스피커)...');
        try {
            const res = await fetch(MULTI_FUNCTION_URL, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    text: dialogue,
                    speakerA: '제임스',
                    speakerB: '스텔라',
                    voiceA,
                    voiceB,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            if (!data.audioContent) throw new Error('오디오 데이터 없음');
            setResult('재생 중...');
            await playPcm(data.audioContent);
            setResult('✅ GA 멀티스피커 재생 완료');
        } catch (e) {
            setResult(`❌ ${e.message}`);
        } finally {
            setLoading(null);
        }
    };

    const btn = (label, id, onClick, color) => (
        <button onClick={onClick} disabled={loading !== null}
            className={`flex-1 py-3 rounded-xl text-xs font-black border transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${color}`}>
            {loading === id
                ? <><span className="material-symbols-outlined text-sm animate-spin">sync</span>생성 중</>
                : <><span className="material-symbols-outlined text-sm">play_arrow</span>{label}</>}
        </button>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
            <div className="max-w-2xl mx-auto space-y-6">

                <div>
                    <h1 className="text-2xl font-black">TTS 모델 테스트</h1>
                    <p className="text-slate-400 text-sm mt-1">제임스 + 스텔라 멀티스피커 비교 — 현재 시스템 무관</p>
                </div>

                {/* 목소리 선택 */}
                <div className="bg-white/5 rounded-2xl p-4 space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">목소리 선택</p>
                    <div>
                        <p className="text-xs text-slate-500 mb-2">🎙 제임스 (남성)</p>
                        <div className="flex gap-2 flex-wrap">
                            {VOICES_MALE.map(v => (
                                <button key={v} onClick={() => setVoiceA(v)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${voiceA === v ? 'border-blue-500/60 bg-blue-500/20 text-blue-300' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}>
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-2">🎙 스텔라 (여성)</p>
                        <div className="flex gap-2 flex-wrap">
                            {VOICES_FEMALE.map(v => (
                                <button key={v} onClick={() => setVoiceB(v)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${voiceB === v ? 'border-pink-500/60 bg-pink-500/20 text-pink-300' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}>
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 대화 대본 */}
                <div className="bg-white/5 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">테스트 대본</p>
                    <textarea value={dialogue} onChange={e => handleDialogueChange(e.target.value)} rows={8}
                        className="w-full bg-black/40 rounded-xl p-3 text-sm text-slate-200 border border-white/10 resize-none focus:outline-none focus:border-white/30 font-mono" />
                    <p className="text-xs text-slate-600">* 형식: <span className="text-slate-500">제임스: 대사{'\n'}스텔라: 대사</span></p>
                </div>

                {/* 테스트 버튼 */}
                <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">테스트</p>
                    <div className="flex gap-2">
                        {btn('Pro Preview (현재)', 'gemini-2.5-pro-preview-tts',
                            () => handleTestPreview('gemini-2.5-pro-preview-tts'),
                            'border-violet-500/40 bg-violet-500/10 text-violet-300')}
                        {btn('Flash Preview (현재)', 'gemini-2.5-flash-preview-tts',
                            () => handleTestPreview('gemini-2.5-flash-preview-tts'),
                            'border-emerald-500/40 bg-emerald-500/10 text-emerald-300')}
                    </div>
                    <div>
                        {btn('GA Pro 신버전 (Firebase Function 경유 · 키 안전)', 'GA',
                            handleTestGA,
                            'border-yellow-500/40 bg-yellow-500/10 text-yellow-300')}
                    </div>
                </div>

                {/* 결과 */}
                {result && (
                    <div className={`rounded-xl p-3 text-sm font-bold ${result.startsWith('❌') ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-slate-300'}`}>
                        {result}
                    </div>
                )}

            </div>
        </div>
    );
}
