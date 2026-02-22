import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';
import { db } from '../firebase';
import {
    collection, addDoc, getDocs, deleteDoc,
    doc, updateDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore';

// ─── Constants ───────────────────────────────────────────────────
const MOODS = [
    { emoji: '🔥', label: '감명받음', color: 'from-orange-600/30 to-red-600/20 border-orange-500/40 text-orange-300' },
    { emoji: '💡', label: '통찰', color: 'from-yellow-600/30 to-amber-600/20 border-yellow-500/40 text-yellow-300' },
    { emoji: '🤔', label: '고민됨', color: 'from-blue-600/30 to-indigo-600/20 border-blue-500/40 text-blue-300' },
    { emoji: '😊', label: '따뜻함', color: 'from-pink-600/30 to-rose-600/20 border-pink-500/40 text-pink-300' },
    { emoji: '⚡', label: '충격', color: 'from-violet-600/30 to-purple-600/20 border-violet-500/40 text-violet-300' },
    { emoji: '📌', label: '보관', color: 'from-teal-600/30 to-emerald-600/20 border-teal-500/40 text-teal-300' },
];

const TAG_SUGGESTIONS = ['인생', '성장', '철학', '경제', '투자', '소설', '심리', '역사', '자기계발', '과학'];

const DAILY_QUOTES = [
    { text: "책을 읽는 것만큼, 그 생각을 기록하는 것도 중요합니다. 글을 쓸 때 비로소 생각이 명확해지니까요.", author: "독서노트 에디터" },
    { text: "독서는 완성된 인간을 만들고, 대화는 재치 있는 인간을 만들며, 글쓰기는 정확한 인간을 만든다.", author: "Francis Bacon" },
    { text: "책 속에서 보낸 시간은 절대로 낭비가 아니다.", author: "Thomas Carlyle" },
    { text: "읽지 않은 책은 닫힌 문과 같고, 읽은 책은 열린 창과 같다.", author: "Victor Hugo" },
    { text: "좋은 책은 우리에게 새로운 눈을 준다.", author: "Ralph Waldo Emerson" },
    { text: "고전을 읽지 않은 사람에게 미래는 없다.", author: "Goethe" },
    { text: "한 권의 책을 제대로 읽으면 백 권의 책을 읽은 것과 같다.", author: "동양 격언" },
    { text: "오늘 읽은 한 페이지가 내일의 나를 만든다.", author: "독서노트 에디터" },
    { text: "작가가 되고 싶다면 먼저 독자가 되어야 한다.", author: "Stephen King" },
    { text: "글쓰기는 자신이 알고 있다고 생각했던 것을 실제로 알게 해주는 행위다.", author: "Flannery O'Connor" },
    { text: "읽는 것을 멈추면 생각하는 것도 멈춘다.", author: "Leo Tolstoy" },
    { text: "독서의 습관은 인생의 가장 큰 재산 중 하나다.", author: "W. Somerset Maugham" },
    { text: "진정한 독자는 책을 읽는 것이 아니라 책과 대화한다.", author: "Edgar Allan Poe" },
    { text: "다 읽은 책이라도 다시 읽으면 항상 새롭다. 변한 것은 책이 아니라 나 자신이다.", author: "독서노트 에디터" },
    { text: "내가 읽은 책들이 나를 만들었다.", author: "Maxim Gorky" },
    { text: "노트에 적힌 한 줄이 머릿속 열 줄보다 오래 남는다.", author: "독서노트 에디터" },
    { text: "생각을 글로 쓰면 혼란이 명확함이 된다.", author: "William Zinsser" },
    { text: "책은 타임머신이다. 과거로도, 미래로도 데려다 준다.", author: "Carl Sagan" },
    { text: "모든 독서는 자기 자신을 발견하는 여정이다.", author: "André Gide" },
    { text: "지식은 나눌수록 커지고, 기록할수록 깊어진다.", author: "독서노트 에디터" },
    { text: "당신은 당신이 읽은 것의 합이다.", author: "Neil Gaiman" },
    { text: "책을 사랑하는 사람만큼 자유로운 사람은 없다.", author: "독서노트 에디터" },
    { text: "한 사람의 서재는 그 사람의 정신적 초상화다.", author: "아일랜드 속담" },
    { text: "삶이 아무리 바빠도, 독서할 시간은 반드시 만들어야 한다.", author: "Bertrand Russell" },
    { text: "책은 꿈꾸는 자의 가장 믿음직한 동반자다.", author: "Martin Luther" },
    { text: "독서는 마음의 양식이요, 지식의 창고이다.", author: "Cicero" },
];

function getDailyQuote() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

function timeAgo(date) {
    if (!date) return '';
    const s = Math.floor((new Date() - date) / 1000);
    if (s < 60) return '방금 전';
    if (s < 3600) return `${Math.floor(s / 60)}분 전`;
    if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
    if (s < 604800) return `${Math.floor(s / 86400)}일 전`;
    return date.toLocaleDateString('ko-KR');
}

// ─── Main Component ───────────────────────────────────────────────
export default function ReadingNotes() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [selectedMood, setSelectedMood] = useState(null);
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [bookTitle, setBookTitle] = useState('');
    const [rating, setRating] = useState(0);
    const [noteType, setNoteType] = useState('memo'); // 'memo' | 'review'

    const [notes, setNotes] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMood, setFilterMood] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const bodyRef = useRef(null);
    const formRef = useRef(null);

    useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);

    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.style.height = 'auto';
            bodyRef.current.style.height = bodyRef.current.scrollHeight + 'px';
        }
    }, [body]);

    const fetchNotes = async () => {
        if (!user) return;
        setFetching(true);
        try {
            const snap = await getDocs(query(collection(db, 'users', user.uid, 'readingNotes'), orderBy('createdAt', 'desc')));
            setNotes(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() })));
        } catch (e) { console.error(e); }
        finally { setFetching(false); }
    };

    useEffect(() => { if (user) fetchNotes(); }, [user]);

    const handleAddTag = (t) => {
        const c = t.trim().replace(/^#/, '');
        if (c && !tags.includes(c) && tags.length < 5) setTags([...tags, c]);
        setTagInput('');
    };
    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddTag(tagInput); }
        if (e.key === 'Backspace' && !tagInput && tags.length > 0) setTags(tags.slice(0, -1));
    };

    useEffect(() => {
        const handler = () => {
            resetForm();
            setShowForm(true);
        };
        window.addEventListener('open-reading-note-form', handler);
        return () => window.removeEventListener('open-reading-note-form', handler);
    }, []);

    const resetForm = () => {
        setTitle('');
        setBody('');
        setSelectedMood(null);
        setTags([]);
        setTagInput('');
        setBookTitle('');
        setRating(0);
        setNoteType('memo');
        setEditingId(null);
        setShowForm(false);
    };

    const handleSave = async () => {
        if (!title.trim() && !body.trim() && !bookTitle.trim()) return;
        setSaving(true);
        try {
            const data = {
                title: title.trim(),
                body: body.trim(),
                mood: selectedMood,
                tags,
                type: noteType,
                bookTitle: noteType === 'review' ? bookTitle.trim() : null,
                rating: noteType === 'review' ? rating : null,
                updatedAt: serverTimestamp()
            };
            if (editingId) await updateDoc(doc(db, 'users', user.uid, 'readingNotes', editingId), data);
            else await addDoc(collection(db, 'users', user.uid, 'readingNotes'), { ...data, createdAt: serverTimestamp() });
            resetForm();
            await fetchNotes();
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const handleEdit = (note) => {
        setTitle(note.title || '');
        setBody(note.body || '');
        setSelectedMood(note.mood || null);
        setTags(note.tags || []);
        setNoteType(note.type || 'memo');
        setBookTitle(note.bookTitle || '');
        setRating(note.rating || 0);
        setEditingId(note.id);
        setShowForm(true);
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    };

    const handleDelete = async (id) => {
        await deleteDoc(doc(db, 'users', user.uid, 'readingNotes', id));
        setNotes(notes.filter(n => n.id !== id)); setDeleteConfirmId(null);
    };

    const filtered = notes.filter(n => {
        const q = searchQuery.toLowerCase();
        const m = !filterMood || n.mood?.label === filterMood;
        const s = !q || n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q) || n.bookTitle?.toLowerCase().includes(q) || n.tags?.some(t => t.includes(q));
        return m && s;
    });

    const totalBooks = new Set(notes.filter(n => n.type === 'review').map(n => n.bookTitle)).size;
    const totalThoughts = notes.length;
    const dailyQuote = getDailyQuote();

    const [activeFilter, setActiveFilter] = useState('전체보기');
    const FILTERS = ['전체보기', '#서평', '#필사', '#메모'];

    if (loading) return (
        <div className="bg-background-dark min-h-screen flex items-center justify-center">
            <div className="relative"><div className="absolute inset-0 bg-gold/20 blur-3xl rounded-full animate-pulse" /><div className="size-12 rounded-full border-t-2 border-gold animate-spin relative" /></div>
        </div>
    );
    if (!user) return null;

    const StarRating = ({ value, onChange, interactive = false }) => (
        <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    onClick={() => interactive && onChange(star)}
                    className={`transition-all duration-300 ${interactive ? 'hover:scale-125 cursor-pointer' : ''}`}
                >
                    <span className={`material-symbols-outlined text-lg ${star <= value ? 'text-gold fill-1' : 'text-white/10'}`}>
                        {star <= value ? 'star' : 'star'}
                    </span>
                </button>
            ))}
        </div>
    );

    return (
        <div className="bg-[#090b10] font-display text-slate-200 antialiased min-h-screen flex justify-center selection:bg-gold/20 relative overflow-hidden">
            {/* ── Background Ambient Lighting ── */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 blur-[130px] rounded-full" />
                <div className="absolute top-[30%] right-[-5%] w-[30%] h-[30%] bg-purple-900/5 blur-[100px] rounded-full" />
            </div>

            <div className="w-full max-w-[430px] relative min-h-screen flex flex-col pb-32 z-10">

                {/* ── Fixed Top Navigation ── */}
                <TopNavigation title="독서노트" type="sub" />

                {/* ── Header Section ── */}
                <header className="px-8 pt-7 pb-10 text-left relative">
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold text-gold uppercase tracking-[0.2em]">Current Progress</span>
                            <h2 className="text-[28px] font-bold text-white tracking-tight">지적인 탐구의 기록</h2>
                        </div>
                        <div className="flex gap-12 relative items-end">
                            <div className="space-y-1">
                                <span className="text-[12px] text-white/40 block">읽은 책</span>
                                <span className="text-2xl font-bold text-white tracking-tighter">{totalBooks}권</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[12px] text-white/40 block">남긴 생각</span>
                                <span className="text-2xl font-bold text-white tracking-tighter">{totalThoughts}개</span>
                            </div>

                        </div>
                    </div>
                </header>

                {/* ── Filter Chips ── */}
                <div className="px-6 flex gap-2 overflow-x-auto no-scrollbar mb-10">
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition-all whitespace-nowrap
                                ${activeFilter === f
                                    ? 'bg-gold text-primary shadow-lg shadow-gold/20'
                                    : 'bg-white/5 border border-white/5 text-white/40 hover:text-white/60'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>







                {/* ── Archive List ── */}
                <section className="px-6 space-y-5 relative flex-1">
                    {fetching ? (
                        <div className="space-y-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-24 text-center opacity-30">
                            <p className="serif-title text-xl font-light text-white">기록된 문장이 없습니다.</p>
                        </div>
                    ) : (
                        filtered
                            .filter(n => activeFilter === '전체보기' || n.type === activeFilter || (activeFilter === '#서평' && n.type === 'review') || (activeFilter === '#메모' && n.type === 'memo'))
                            .map(note => {
                                const isExp = expandedId === note.id;
                                const isDel = deleteConfirmId === note.id;
                                const isReview = note.type === 'review' || note.type === '#서평';

                                return (
                                    <article key={note.id} className="relative group/item scroll-mt-24">
                                        <div
                                            onClick={() => setExpandedId(isExp ? null : note.id)}
                                            className={`p-5 rounded-[1.5rem] border transition-all duration-500 relative bg-[#121826]/40 border-white/[0.03] hover:border-white/10 hover:bg-[#121826]/60 cursor-pointer ${isExp ? 'ring-1 ring-gold/20' : ''}`}
                                        >
                                            <div className="flex gap-5">
                                                {/* Left: Book Cover or Icon */}
                                                <div className="w-[84px] h-[112px] shrink-0 rounded-lg overflow-hidden bg-slate-800 shadow-xl border border-white/5 flex items-center justify-center relative group-hover/item:scale-105 transition-transform">
                                                    {isReview ? (
                                                        <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 to-slate-900 flex flex-col items-center justify-center p-2 text-center">
                                                            <span className="text-[9px] text-white/40 serif-title font-bold leading-tight break-all">{note.bookTitle}</span>
                                                            <div className="absolute inset-0 bg-black/20" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                                                            <span className="material-symbols-outlined text-2xl">description</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Content */}
                                                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-start">
                                                            <h3 className="text-[17px] font-bold text-white leading-tight truncate pr-4">
                                                                {note.bookTitle || note.title || '오늘의 단상'}
                                                            </h3>
                                                            <span className="text-[10px] text-white/20 tabular-nums pt-1">
                                                                {note.createdAt?.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.')}
                                                            </span>
                                                        </div>
                                                        <p className={`text-[13px] leading-relaxed text-white/50 font-light ${isExp ? '' : 'line-clamp-2'}`}>
                                                            {note.body}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-lg bg-white/5 text-gold/60 border border-white/[0.03]`}>
                                                            {note.type?.startsWith('#') ? note.type : (isReview ? '#서평' : '#메모')}
                                                        </span>
                                                        {note.tags?.map(t => (
                                                            <span key={t} className="text-[10px] font-bold px-3 py-1 rounded-lg bg-white/5 text-white/30 border border-white/[0.03]">#{t}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            {isExp && (
                                                <div className="mt-6 pt-5 border-t border-white/[0.05] flex gap-5 justify-end">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(note); }} className="text-[11px] font-bold text-white/40 hover:text-white transition-colors flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                                        수정
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(note.id); }} className="text-[11px] font-bold text-white/40 hover:text-red-400 transition-colors flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                                        삭제
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {isDel && (
                                            <div className="absolute inset-0 z-20 backdrop-blur-md bg-black/60 rounded-[1.5rem] flex items-center justify-center p-6 gap-4 animate-in fade-in duration-300">
                                                <button onClick={() => handleDelete(note.id)} className="flex-1 h-12 rounded-xl bg-red-500 text-white text-[12px] font-bold">영구 삭제</button>
                                                <button onClick={() => setDeleteConfirmId(null)} className="h-12 px-6 rounded-xl bg-white/10 text-white text-[12px] font-bold">취소</button>
                                            </div>
                                        )}
                                    </article>
                                );
                            })
                    )}
                </section>

                {/* ── Record Note Modal ── */}
                {showForm && (
                    <div className="fixed inset-0 z-[100] bg-[#090b10] flex flex-col animate-in slide-in-from-bottom duration-500 shadow-2xl">
                        {/* Modal Header */}
                        <div className="px-6 h-16 shrink-0 flex items-center justify-between border-b border-white/[0.05]">
                            <button onClick={resetForm} className="size-10 flex items-center justify-center -ml-2">
                                <span className="material-symbols-outlined text-white/40">close</span>
                            </button>
                            <h3 className="text-[15px] font-bold text-white tracking-tight">생각 기록</h3>
                            <div className="size-10" />
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-10 space-y-12 pb-32">
                            {/* Book Selection */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[14px] font-bold text-gold flex items-center gap-2">
                                        도서 선택 (선택 사항)
                                        <span className="material-symbols-outlined text-lg">auto_stories</span>
                                    </h4>
                                </div>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#121826] border border-white/[0.05] rounded-2xl px-5 py-4 text-[14px] text-white/80 appearance-none outline-none focus:border-gold/30 transition-all"
                                        value={bookTitle}
                                        onChange={e => {
                                            setBookTitle(e.target.value);
                                            setNoteType(e.target.value ? '#서평' : '#메모');
                                        }}
                                    >
                                        <option value="">기록할 책을 검색하거나 선택하세요</option>
                                        <option value="데미안">데미안</option>
                                        <option value="불편한 편의점">불편한 편의점</option>
                                        <option value="참을 수 없는 존재의 가벼움">참을 수 없는 존재의 가벼움</option>
                                        <option value="오늘의 단상">오늘의 단상</option>
                                        <option value="직접 입력">직접 입력...</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            {/* Category Selection */}
                            <div className="space-y-4">
                                <h4 className="text-[14px] font-bold text-gold">카테고리 선택</h4>
                                <div className="flex gap-2">
                                    {['#서평', '#메모', '#문장채집'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setNoteType(type)}
                                            className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 border text-[13px] font-bold transition-all
                                                ${noteType === type
                                                    ? 'bg-gold/10 border-gold text-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                                                    : 'bg-[#121826] border-white/5 text-white/40 hover:text-white'}`}
                                        >
                                            <span className="material-symbols-outlined text-lg">
                                                {type === '#서평' ? 'rate_review' : type === '#메모' ? 'sticky_note_2' : 'format_quote'}
                                            </span>
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Thought Input */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[14px] font-bold text-gold flex items-center gap-2">
                                        나의 생각 / 기록
                                        <span className="material-symbols-outlined text-lg rotate-12">attach_file</span>
                                        <span className="material-symbols-outlined text-lg">image</span>
                                    </h4>
                                </div>
                                <div className="relative group">
                                    <textarea
                                        value={body}
                                        onChange={e => setBody(e.target.value)}
                                        placeholder="책을 읽으며 떠오른 생각이나 간직하고 싶은 문장을 자유롭게 기록해보세요..."
                                        className="w-full bg-transparent border-none text-[16px] text-white/80 placeholder-white/20 min-h-[300px] outline-none resize-none leading-relaxed"
                                    />
                                    <div className="flex justify-end pt-4">
                                        <span className="flex items-center gap-2 text-[11px] text-white/30 font-medium">
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                            {body.length} characters
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer */}
                        <div className="p-6 pb-10 bg-gradient-to-t from-[#090b10] via-[#090b10] to-transparent shrink-0">
                            <button
                                onClick={handleSave}
                                disabled={saving || !body.trim()}
                                className="w-full h-16 rounded-2xl bg-gold text-primary font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-30 shadow-xl shadow-gold/10"
                            >
                                {saving ? (
                                    <div className="size-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>저장하기</span>
                                        <span className="material-symbols-outlined text-xl">check_circle</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                <Footer />
                <BottomNavigation />
            </div>
        </div>
    );
}

