import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';
import { celebrities } from '../data/celebrities';
import { db } from '../firebase';
import {
    collection, addDoc, getDocs, deleteDoc,
    doc, updateDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { summarizeReview, generateDailyThought } from '../services/gemini';
import { AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';

// ─── Constants ───────────────────────────────────────────────────
const MOODS = [
    { emoji: '🔥', label: '감명받음', color: 'from-orange-600/30 to-red-600/20 border-orange-500/40 text-orange-300' },
    { emoji: '💡', label: '통찰', color: 'from-yellow-600/30 to-amber-600/20 border-yellow-500/40 text-yellow-300' },
    { emoji: '🤔', label: '고민', color: 'from-blue-600/30 to-indigo-600/20 border-blue-500/40 text-blue-300' },
    { emoji: '😊', label: '행복', color: 'from-pink-600/30 to-rose-600/20 border-pink-500/40 text-pink-300' },
    { emoji: '⚡', label: '충격', color: 'from-violet-600/30 to-purple-600/20 border-violet-500/40 text-violet-300' },
    { emoji: '📌', label: '중요', color: 'from-teal-600/30 to-emerald-600/20 border-teal-500/40 text-teal-300' },
    { emoji: '📚', label: '배움', color: 'from-slate-600/30 to-slate-600/20 border-slate-500/40 text-slate-300' },
    { emoji: '🌈', label: '영감', color: 'from-indigo-600/30 to-purple-600/20 border-indigo-500/40 text-indigo-300' },
    { emoji: '🌿', label: '치유', color: 'from-green-600/30 to-emerald-600/20 border-green-500/40 text-green-300' },
    { emoji: '💎', label: '가치', color: 'from-cyan-600/30 to-blue-600/20 border-cyan-500/40 text-cyan-300' },
    { emoji: '🧭', label: '방향', color: 'from-amber-600/30 to-orange-600/20 border-amber-500/40 text-amber-300' },
    { emoji: '✍️', label: '기록', color: 'from-stone-600/30 to-zinc-600/20 border-stone-500/40 text-stone-300' },
    { emoji: '🌊', label: '몰입', color: 'from-blue-700/30 to-cyan-700/20 border-blue-600/40 text-blue-300' },
    { emoji: '☀️', label: '희망', color: 'from-yellow-400/30 to-orange-400/20 border-yellow-300/40 text-yellow-200' },
    { emoji: '🌙', label: '사색', color: 'from-indigo-900/30 to-slate-900/20 border-indigo-800/40 text-indigo-200' },
    { emoji: '🍀', label: '행운', color: 'from-lime-600/30 to-green-600/20 border-lime-500/40 text-lime-300' },
    { emoji: '🎯', label: '목표', color: 'from-red-600/30 to-rose-600/20 border-red-500/40 text-red-300' },
    { emoji: '✨', label: '기적', color: 'from-yellow-300/30 to-amber-300/20 border-white/40 text-white' },
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
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiQuote, setAiQuote] = useState(null);
    const bodyRef = useRef(null);
    const formRef = useRef(null);
    const treeContainerRef = useRef(null);

    const handleDownloadTree = async () => {
        if (!treeContainerRef.current) return;
        try {
            const canvas = await html2canvas(treeContainerRef.current, {
                useCORS: true,
                backgroundColor: '#0f172a',
                scale: 2,
            });
            const link = document.createElement('a');
            link.download = `archiview-tree-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error('Download failed:', e);
            alert('이미지 다운로드에 실패했습니다.');
        }
    };

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
            const bookCover = uniqueBooks.find(b => b.title === bookTitle)?.cover || null;
            const data = {
                title: title.trim(),
                body: body.trim(),
                mood: selectedMood,
                tags,
                type: noteType,
                bookTitle: noteType !== '#메모' ? bookTitle.trim() : null,
                bookCover: noteType !== '#메모' ? bookCover : null,
                rating: noteType === '#서평' ? rating : null,
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

    const today = new Date();
    const todayNotes = notes.filter(n => {
        if (!n.createdAt) return false;
        const d = n.createdAt instanceof Date ? n.createdAt : n.createdAt.toDate?.() || new Date(n.createdAt);
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    }).length;
    const totalThoughts = notes.length;

    // AI Quote logic
    const fetchAiQuote = async () => {
        const quote = await generateDailyThought("인생과 독서", "아카이뷰 사서");
        if (quote) setAiQuote(quote);
    };

    useEffect(() => {
        fetchAiQuote();
    }, []);

    const dailyQuote = aiQuote || getDailyQuote().text;

    const handleAiRefine = async () => {
        if (!body.trim()) return;
        setIsAiProcessing(true);
        try {
            const refined = await summarizeReview(body + (bookTitle ? `\n\n책 제목: ${bookTitle}` : ''));
            if (refined) {
                if (window.confirm("AI가 제안하는 통찰로 내용을 보충할까요?")) {
                    setBody(prev => prev + "\n\n[AI Insight]\n" + refined);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsAiProcessing(false);
        }
    };

    const [activeFilter, setActiveFilter] = useState('전체보기');
    const FILTERS = ['전체보기', '#서평', '#메모'];

    // 사이트 등록 도서 목록 (celebrities.js에서 추출)
    const allBooks = celebrities.flatMap(celeb => celeb.books.map(b => ({
        title: b.title,
        author: b.author,
        cover: b.cover
    })));
    const uniqueBooks = Array.from(new Map(allBooks.map(b => [b.title, b])).values());

    // 기록의 나무 로직
    const getTreeLevel = (count) => {
        if (count >= 100) return { level: 5, name: '풍성한 지혜의 나무', fruits: 15, color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
        if (count >= 50) return { level: 4, name: '열매 맺는 나무', fruits: 5, color: 'text-green-400', bg: 'bg-green-500/20' };
        if (count >= 30) return { level: 3, name: '자라나는 나무', fruits: 3, color: 'text-lime-400', bg: 'bg-lime-500/20' };
        if (count >= 10) return { level: 2, name: '어린 나무', fruits: 1, color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
        return { level: 1, name: '작은 새싹', fruits: 0, color: 'text-slate-400', bg: 'bg-slate-500/10' };
    };

    const treeState = getTreeLevel(totalThoughts);
    const nextMilestone = totalThoughts >= 100 ? 100 : totalThoughts >= 50 ? 100 : totalThoughts >= 30 ? 50 : totalThoughts >= 10 ? 30 : 10;
    const treeProgress = Math.min(100, (totalThoughts / nextMilestone) * 100);

    const [showBenefits, setShowBenefits] = useState(false);
    const [customBookInput, setCustomBookInput] = useState(false);
    const [bookSearch, setBookSearch] = useState('');
    const [showBookDropdown, setShowBookDropdown] = useState(false);

    const filteredBooks = uniqueBooks.filter(b =>
        b.title.includes(bookSearch) || b.author.includes(bookSearch)
    );


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
                <TopNavigation title="기록노트" type="sub" />

                {/* ── Today's Choice Section (Tree of Records) ── */}
                <header className="px-6 pt-4 pb-8">
                    <div className="flex items-center justify-between mb-4 invisible h-0 overflow-hidden">
                        <h2 className="text-xl font-black flex items-center gap-2 text-white italic">
                            <span className="material-symbols-outlined text-emerald-500 fill-1">potted_plant</span>
                            기록의 나무
                        </h2>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                                LV.{totalThoughts < 10 ? 1 : totalThoughts < 30 ? 2 : totalThoughts < 50 ? 3 : totalThoughts < 100 ? 4 : 5} GROWING
                            </span>
                            <button
                                onClick={() => setShowBenefits(true)}
                                className="text-[10px] font-bold text-emerald-500/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-xs">redeem</span>
                                혜택보기
                            </button>
                            <button
                                onClick={handleDownloadTree}
                                className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 hover:bg-white/10 transition-all flex items-center gap-1 mt-1"
                            >
                                <span className="material-symbols-outlined text-xs">download</span>
                                이미지 저장
                            </button>
                        </div>
                    </div>

                    <div
                        ref={treeContainerRef}
                        className="relative group overflow-hidden rounded-[2.5rem] bg-transparent max-w-sm mx-auto"
                    >
                        <div className="flex flex-col">
                            {/* Tree Visual Section */}
                            <div className="w-full aspect-square relative overflow-hidden bg-gradient-to-b from-[#131b2e] to-[#0f172a] flex flex-col items-center justify-center p-4">
                                {/* Ambient Background Glow */}
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,33,71,0.5),rgba(15,24,35,1))]" />

                                {/* Tree Illustration */}
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="relative"
                                    >
                                        {/* Lime Tree Script Text */}
                                        <div className="absolute top-[30px] left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-80 mt-1">
                                            <motion.span
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.8, duration: 1 }}
                                                className="text-[#ffdf91] text-3xl font-normal tracking-wide"
                                                style={{ fontFamily: "'Great Vibes', cursive", textShadow: "0 0 10px rgba(255,223,145,0.4)" }}
                                            >
                                                Lime Tree
                                            </motion.span>
                                        </div>

                                        {/* Speech Bubble Annotation */}
                                        <div className="absolute top-[28%] left-[65%] -translate-x-1/2 z-20 whitespace-nowrap">
                                            <motion.div
                                                animate={{
                                                    y: [0, -4, 0],
                                                    scale: [1, 1.03, 1],
                                                    rotate: [-3, -4, -3]
                                                }}
                                                transition={{
                                                    duration: 3,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                                className="relative bg-emerald-500/95 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-xl shadow-emerald-500/30 backdrop-blur-sm border border-emerald-400/50"
                                            >
                                                메모를 남기면 열매가 생겨나요! 🍊
                                                {/* Triangle pointer */}
                                                <div className="absolute -bottom-1 left-[30%] -translate-x-1/2 w-2.5 h-2.5 bg-emerald-500 rotate-45 border-r border-b border-emerald-400/50" />
                                            </motion.div>
                                        </div>

                                        {/* Tree Background Image - Local Asset with Pulse & Glow */}
                                        <div className="relative w-[320px] h-[320px] flex items-center justify-center mt-16">
                                            <motion.div
                                                animate={{
                                                    scale: totalThoughts >= 100 ? [1.1, 1.12, 1.1] : totalThoughts >= 50 ? [1.05, 1.07, 1.05] : [1, 1.02, 1],
                                                    filter: ["drop-shadow(0 0 10px rgba(16,185,129,0.1))", "drop-shadow(0 0 25px rgba(16,185,129,0.3))", "drop-shadow(0 0 10px rgba(16,185,129,0.1))"]
                                                }}
                                                transition={{
                                                    duration: 4,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                                className="w-full h-full bg-contain bg-no-repeat bg-center"
                                                style={{ backgroundImage: "url('/images/tree.png')" }}
                                            />



                                            {/* Golden Fruits - Balanced for round canopy */}
                                            <div className="absolute inset-0 pointer-events-none">
                                                {Array.from({ length: treeState.fruits }).map((_, i) => {
                                                    // Optimized positioning for a lush round canopy
                                                    // Fruits stay in the upper 2/3rds where the leaves are
                                                    const angles = [
                                                        -45, -90, -135, // Top
                                                        -20, -70, -110, -160, // Mid 
                                                        0, -180, // Sides
                                                        -30, -60, -120, -150, // Inner
                                                        -45, -135 // Cluster
                                                    ];
                                                    const dists = [
                                                        70, 85, 75, // Outer
                                                        60, 95, 80, 70, // Spread
                                                        100, 100, // Wide
                                                        50, 45, 55, 60, // Inner
                                                        30, 40 // Center
                                                    ];
                                                    const angle = angles[i % angles.length];
                                                    const dist = dists[i % dists.length] * 0.8; // Scaled dist for smaller tree
                                                    const x = 160 + Math.cos(angle * Math.PI / 180) * dist;
                                                    const y = 150 + Math.sin(angle * Math.PI / 180) * dist;

                                                    return (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ scale: 0, opacity: 0 }}
                                                            animate={{
                                                                scale: [1, 1.3, 0.8, 1.2, 1],
                                                                opacity: [1, 0.8, 1, 0.9, 1],
                                                                boxShadow: [
                                                                    '0 0 15px rgba(255,159,67,0.4)',
                                                                    '0 0 30px rgba(255,159,67,1)',
                                                                    '0 0 20px rgba(255,159,67,0.2)',
                                                                    '0 0 35px rgba(255,159,67,0.8)',
                                                                    '0 0 15px rgba(255,159,67,0.4)'
                                                                ],
                                                                filter: [
                                                                    'brightness(1)',
                                                                    'brightness(1.6)',
                                                                    'brightness(0.7)',
                                                                    'brightness(1.4)',
                                                                    'brightness(1)'
                                                                ]
                                                            }}
                                                            transition={{
                                                                duration: 2 + Math.random() * 2,
                                                                repeat: Infinity,
                                                                ease: "easeInOut",
                                                                delay: i * 0.2
                                                            }}
                                                            style={{ left: `${x}px`, top: `${y}px` }}
                                                            className="absolute size-3.5 bg-gradient-to-br from-[#ffda79] via-[#ff9f43] to-[#ee5253] rounded-full border border-white/40 z-20 shadow-lg"
                                                        >
                                                            <div className="absolute top-0.5 left-0.5 size-1 bg-white rounded-full opacity-70" />
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>

                            {/* Info Section (Positioned to reveal roots) */}
                            <div className="px-8 pt-10 pb-10 space-y-8 text-center bg-[#0f172a] -mt-4 relative z-30 rounded-t-[3rem] shadow-[0_-20px_40px_rgba(15,23,42,0.8)] border-t border-white/5">
                                {/* Tree Info (Progress Bar) */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-left">
                                            <h3 className="text-white font-bold text-sm tracking-wide">{totalThoughts}개의 기록 열매</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`px-3 py-1.5 h-[28px] ${treeState.bg} ${treeState.color} border border-white/10 rounded-full flex items-center justify-center gap-1.5 shadow-lg`}>
                                                <span className="text-[9px] font-black opacity-60">LV.{treeState.level}</span>
                                                <span className="text-[10px] font-black tracking-wider">{treeState.name}</span>
                                            </div>
                                            <button
                                                onClick={() => setShowBenefits(true)}
                                                className="text-[10px] h-[28px] text-emerald-500 font-black border border-emerald-500/30 px-3 py-1.5 rounded-full hover:bg-emerald-500/10 transition-all active:scale-95 bg-white/5 backdrop-blur-sm flex items-center justify-center"
                                            >
                                                레벨혜택보기
                                            </button>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${treeProgress}%` }}
                                            className={`h-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]`}
                                        />
                                    </div>
                                </div>

                                {/* Quote */}
                                <div className="space-y-2 py-4">
                                    <p className="text-white text-[16px] font-bold leading-relaxed italic">
                                        "지혜는 눈에 보이지 않지만<br />아카이뷰에서는 나무로 자라납니다."
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 py-4 border-y border-white/5">
                                    <div className="flex flex-col items-center p-3 rounded-2xl bg-white/[0.02]">
                                        <span className="text-emerald-400 font-black text-xl leading-none">{totalThoughts >= 100 ? 'MAX' : (nextMilestone - totalThoughts > 0 ? nextMilestone - totalThoughts : 0)}</span>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase mt-1">{totalThoughts >= 100 ? 'Level' : 'Next Fruit'}</span>
                                    </div>
                                    <div className="flex flex-col items-center p-3 rounded-2xl bg-white/[0.02]">
                                        <span className="text-gold font-black text-xl leading-none">{totalThoughts}</span>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase mt-1">Record Fruit</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { resetForm(); setShowForm(true); }}
                                        className="flex-1 px-8 py-5 bg-emerald-600 text-white rounded-2xl font-black text-[14px] uppercase tracking-[0.2em] transition-all hover:bg-emerald-500 hover:shadow-2xl hover:shadow-emerald-600/30 active:scale-95 text-center flex items-center justify-center shadow-lg"
                                    >
                                        기록 남기고 성장하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>







                {/* ── Archive List ── */}
                <section className="px-6 space-y-6 pt-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-gold">history_edu</span>
                            나의 기록 피드
                        </h2>
                    </div>

                    {/* Filter Chips inside Feed Section */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                        {FILTERS.map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap
                                    ${activeFilter === f
                                        ? 'bg-gold text-primary shadow-lg shadow-gold/20'
                                        : 'bg-white/5 border border-white/5 text-white/40 hover:text-white'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {fetching ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse border border-slate-800" />
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-20 text-center opacity-30 border border-dashed border-white/10 rounded-2xl">
                                <p className="text-white text-sm">기록된 문장이 없습니다.</p>
                            </div>
                        ) : (
                            filtered
                                .filter(n => activeFilter === '전체보기' || n.type === activeFilter || (activeFilter === '#서평' && n.type === 'review') || (activeFilter === '#메모' && n.type === 'memo'))
                                .map(note => {
                                    const isExp = expandedId === note.id;
                                    const isDel = deleteConfirmId === note.id;
                                    const isReview = note.type === 'review' || note.type === '#서평';

                                    return (
                                        <article key={note.id} className="relative group scroll-mt-24">
                                            <div
                                                onClick={() => setExpandedId(isExp ? null : note.id)}
                                                className={`flex gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer 
                                                    ${isReview
                                                        ? (isExp ? 'border-gold bg-white/10' : 'bg-white/5 border-slate-800 hover:border-gold/50')
                                                        : (isExp ? 'border-emerald-500 bg-white/10' : 'bg-white/5 border-slate-800 hover:border-emerald-500/50')
                                                    }`}
                                            >
                                                {/* Left: Thumbnail */}
                                                <div className={`w-20 h-28 rounded shadow-lg overflow-hidden shrink-0 flex items-center justify-center relative 
                                                    ${isReview
                                                        ? 'bg-slate-800'
                                                        : 'bg-transparent border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                                    }`}
                                                >
                                                    {isReview ? (
                                                        note.bookCover ? (
                                                            <img src={note.bookCover} alt={note.bookTitle} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="flex flex-col items-center p-2 text-center">
                                                                <span className="material-symbols-outlined text-slate-600 text-3xl">menu_book</span>
                                                                <span className="text-[8px] text-slate-500 font-bold line-clamp-2 mt-1">{note.bookTitle}</span>
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span style={{ fontSize: '36px', filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.3))' }}>{note.mood?.emoji || '📝'}</span>
                                                            <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest opacity-80">MEMO</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Content */}
                                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                                    <div>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className={`font-bold text-[10px] uppercase tracking-wider ${isReview ? 'text-gold' : 'text-emerald-500'}`}>
                                                                {isReview ? 'Book Review' : 'Short Memo'}
                                                            </h4>
                                                            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap ml-2">
                                                                {note.createdAt?.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.')}
                                                            </span>
                                                        </div>

                                                        <h4 className="font-bold text-sm text-white mb-1 truncate">
                                                            {isReview ? note.bookTitle : (note.title || '오늘의 기록')}
                                                        </h4>

                                                        {isReview && note.rating > 0 && (
                                                            <div className="flex gap-0.5 mb-2">
                                                                {[1, 2, 3, 4, 5].map(star => (
                                                                    <span key={star} className={`material-symbols-outlined text-[10px] ${star <= note.rating ? 'text-gold fill-1' : 'text-slate-600'}`}>star</span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <p className={`text-xs text-slate-400 leading-relaxed ${isExp ? '' : 'line-clamp-2'}`}>
                                                            {note.body}
                                                        </p>
                                                    </div>

                                                    {!isExp && (
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {note.tags?.map(t => (
                                                                <span key={t} className={`text-[9px] font-semibold italic ${isReview ? 'text-gold/60' : 'text-emerald-500/60'}`}>#{t}</span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Action Buttons when expanded */}
                                                    {isExp && (
                                                        <div className="mt-4 pt-4 border-t border-white/5 flex gap-4 justify-end">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleEdit(note); }}
                                                                className="text-[10px] font-bold text-white/40 hover:text-white transition-colors flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                                                수정
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(note.id); }}
                                                                className="text-[10px] font-bold text-white/40 hover:text-red-400 transition-colors flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                                                삭제
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {isDel && (
                                                <div className="absolute inset-0 z-20 backdrop-blur-md bg-black/60 rounded-xl flex items-center justify-center p-6 gap-4 animate-in fade-in duration-300">
                                                    <button onClick={() => handleDelete(note.id)} className="flex-1 h-10 rounded-lg bg-red-500 text-white text-[12px] font-bold">삭제 확정</button>
                                                    <button onClick={() => setDeleteConfirmId(null)} className="h-10 px-6 rounded-lg bg-white/10 text-white text-[12px] font-bold">취소</button>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })
                        )}
                    </div>

                    {/* Library Status Banner */}
                    <div className="pt-10 pb-20">
                        <div className="p-6 rounded-2xl bg-primary text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                            <div className="absolute right-0 top-0 opacity-10 scale-150 pointer-events-none translate-x-1/4 -translate-y-1/4">
                                <span className="material-symbols-outlined text-[150px]">ink_pen</span>
                            </div>
                            <div className="z-10 text-center md:text-left">
                                <h3 className="text-lg font-bold mb-1">사유의 기록이 쌓이고 있습니다</h3>
                                <p className="text-blue-200 text-[11px] opacity-80">지금까지 {totalThoughts}개의 소중한 기록을 남겼습니다.</p>
                            </div>
                            <div className="z-10 flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => { resetForm(); setShowForm(true); }}
                                    className="flex-1 md:flex-none px-5 py-2 bg-white text-primary rounded-lg font-bold text-xs shadow-lg hover:bg-blue-50 transition-colors"
                                >
                                    기록하기
                                </button>
                                <button
                                    onClick={() => navigate('/library')}
                                    className="flex-1 md:flex-none px-5 py-2 bg-white/10 text-white border border-white/30 rounded-lg font-bold text-xs hover:bg-white/20 transition-colors"
                                >
                                    서재 가기
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Record Note Modal ── */}
                {
                    showForm && (
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
                                {/* Category Selection */}
                                <div className="space-y-4">
                                    <h4 className="text-[14px] font-bold text-gold">카테고리 선택</h4>
                                    <div className="flex gap-2">
                                        {['#서평', '#메모'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setNoteType(type)}
                                                className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 border text-[13px] font-bold transition-all
                                                ${noteType === type
                                                        ? 'bg-gold/10 border-gold text-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                                                        : 'bg-[#121826] border-white/5 text-white/40 hover:text-white'}`}
                                            >
                                                <span className="material-symbols-outlined text-lg">
                                                    {type === '#서평' ? 'rate_review' : 'sticky_note_2'}
                                                </span>
                                                {type === '#서평' ? '도서한줄평' : '메모'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Book Selection - #서평 시에만 표시 */}
                                {noteType === '#서평' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[14px] font-bold text-gold flex items-center gap-2">
                                                도서 선택 (선택 사항)
                                                <span className="material-symbols-outlined text-lg">auto_stories</span>
                                            </h4>
                                            {bookTitle && (
                                                <button
                                                    onClick={() => { setBookTitle(''); setBookSearch(''); setCustomBookInput(false); setShowBookDropdown(false); }}
                                                    className="text-[11px] text-white/30 hover:text-red-400 transition-colors flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                    선택 해제
                                                </button>
                                            )}
                                        </div>

                                        {/* 선택된 도서 표시 */}
                                        {bookTitle && !customBookInput && (
                                            <div className="flex items-center gap-3 px-4 py-3 bg-gold/10 border border-gold/30 rounded-2xl">
                                                <span className="material-symbols-outlined text-gold text-lg">menu_book</span>
                                                <span className="text-[14px] text-gold font-bold truncate">{bookTitle}</span>
                                            </div>
                                        )}

                                        {/* 검색 입력 */}
                                        {!customBookInput && (
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg pointer-events-none">search</span>
                                                <input
                                                    type="text"
                                                    placeholder="책 제목이나 저자로 검색..."
                                                    value={bookSearch}
                                                    onChange={e => { setBookSearch(e.target.value); setShowBookDropdown(true); }}
                                                    onFocus={() => setShowBookDropdown(true)}
                                                    className="w-full bg-[#121826] border border-white/[0.05] rounded-2xl pl-11 pr-10 py-4 text-[14px] text-white/80 outline-none focus:border-gold/30 transition-all placeholder-white/20"
                                                />
                                                {bookSearch && (
                                                    <button onClick={() => { setBookSearch(''); setShowBookDropdown(false); }} className="absolute right-4 top-1/2 -translate-y-1/2">
                                                        <span className="material-symbols-outlined text-white/30 text-lg">close</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* 검색 결과 드롭다운 */}
                                        {showBookDropdown && !customBookInput && (
                                            <div className="bg-[#0e1420] border border-white/[0.07] rounded-2xl overflow-hidden shadow-2xl">
                                                <div className="max-h-56 overflow-y-auto">
                                                    {filteredBooks.length === 0 && bookSearch ? (
                                                        <div className="px-5 py-5 text-[13px] text-white/30 text-center">
                                                            해당 도서를 찾을 수 없습니다.
                                                        </div>
                                                    ) : (
                                                        filteredBooks.map(book => (
                                                            <button
                                                                key={book.title}
                                                                onClick={() => {
                                                                    setBookTitle(book.title);
                                                                    setBookSearch('');
                                                                    setShowBookDropdown(false);
                                                                }}
                                                                className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/[0.03] last:border-0"
                                                            >
                                                                <span className="material-symbols-outlined text-white/20 text-base shrink-0">menu_book</span>
                                                                <div className="min-w-0">
                                                                    <p className="text-[13px] text-white/80 font-bold truncate">{book.title}</p>
                                                                    <p className="text-[11px] text-white/30 truncate">{book.author}</p>
                                                                </div>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => { setCustomBookInput(true); setShowBookDropdown(false); setBookSearch(''); }}
                                                    className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-white/5 transition-colors border-t border-white/[0.06]"
                                                >
                                                    <span className="material-symbols-outlined text-gold/50 text-base shrink-0">edit</span>
                                                    <span className="text-[13px] text-gold/70 font-bold">직접 입력...</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* 직접 입력 모드 */}
                                        {customBookInput && (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="책 제목을 직접 입력하세요"
                                                    value={bookTitle}
                                                    onChange={e => setBookTitle(e.target.value)}
                                                    className="w-full bg-[#121826] border border-gold/20 rounded-2xl px-5 py-4 text-[14px] text-white/80 outline-none focus:border-gold/50 transition-all placeholder-white/20"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => { setCustomBookInput(false); setBookTitle(''); }}
                                                    className="text-[11px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                                                    목록에서 선택하기
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}


                                {/* Mood Selection - #메모 시에만 표시 */}
                                {noteType === '#메모' && (
                                    <div className="space-y-4">
                                        <h4 className="text-[14px] font-bold text-gold flex items-center gap-2">
                                            이모지 선택 (필수)
                                            <span className="material-symbols-outlined text-lg">mood</span>
                                        </h4>
                                        <div className="grid grid-cols-6 gap-2">
                                            {MOODS.map((m) => (
                                                <button
                                                    key={m.label}
                                                    onClick={() => setSelectedMood(m)}
                                                    className={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all border
                                                    ${selectedMood?.label === m.label
                                                            ? 'bg-gold/20 border-gold shadow-[0_0_15px_rgba(212,175,55,0.2)] scale-110 z-10'
                                                            : 'bg-[#121826] border-white/5 hover:border-white/20'}`}
                                                >
                                                    {m.emoji}
                                                </button>
                                            ))}
                                        </div>
                                        {selectedMood && (
                                            <p className="text-[11px] text-gold/60 font-medium">선택됨: {selectedMood.label}</p>
                                        )}
                                    </div>
                                )}

                                {/* Thought Input */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[14px] font-bold text-gold flex items-center gap-2">
                                            나의 생각 / 기록
                                            <span className="material-symbols-outlined text-lg rotate-12">attach_file</span>
                                        </h4>
                                        <button
                                            onClick={handleAiRefine}
                                            disabled={isAiProcessing || !body.trim()}
                                            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all
                                            ${isAiProcessing ? 'bg-gold/20 text-gold animate-pulse' : 'bg-white/5 text-white/40 hover:bg-gold/10 hover:text-gold border border-white/10'}`}
                                        >
                                            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{isAiProcessing ? 'Processing' : 'AI Insight'}</span>
                                        </button>
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
                                    disabled={saving || !body.trim() || (noteType === '#메모' && !selectedMood) || (noteType === '#서평' && !bookTitle.trim())}
                                    className="w-full h-16 rounded-2xl bg-gold text-primary font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale shadow-xl shadow-gold/10"
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
                    )
                }

                <Footer />
                <BottomNavigation />
                {/* ── Benefit Info Modal ── */}
                {
                    showBenefits && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                className="w-full max-w-sm bg-[#0f172a] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl"
                            >
                                <div className="p-8 space-y-8">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-black text-white italic flex items-center gap-2">
                                            <span className="material-symbols-outlined text-emerald-500 fill-1">redeem</span>
                                            나무 성장 혜택
                                        </h3>
                                        <button onClick={() => setShowBenefits(false)} className="size-10 rounded-full bg-white/5 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white/50">close</span>
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            { lv: 1, name: '어린 나무 (10개)', benefit: '커스텀 프로필 뱃지 지급' },
                                            { lv: 2, name: '자라나는 나무 (30개)', benefit: '사이트 테마 - 에메랄드 해제' },
                                            { lv: 3, name: '열매 맺는 나무 (50개)', benefit: '한정판 기록 템플릿 제공' },
                                            { lv: 4, name: '풍성한 지혜의 나무 (100개)', benefit: '아카이뷰 VIP 멤버십 승격' }
                                        ].map((item, idx) => (
                                            <div key={idx} className={`p-4 rounded-2xl flex items-center gap-4 border transition-all ${totalThoughts >= (idx === 0 ? 10 : idx === 1 ? 30 : idx === 2 ? 50 : 100) ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/5 opacity-50'}`}>
                                                <div className={`size-10 rounded-xl flex items-center justify-center font-black ${totalThoughts >= (idx === 0 ? 10 : idx === 1 ? 30 : idx === 2 ? 50 : 100) ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/30'}`}>
                                                    {idx + 2}
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-white">{item.name}</p>
                                                    <p className="text-[11px] text-emerald-500/70 font-medium">{item.benefit}</p>
                                                </div>
                                                {totalThoughts >= (idx === 0 ? 10 : idx === 1 ? 30 : idx === 2 ? 50 : 100) && (
                                                    <span className="material-symbols-outlined text-emerald-500 ml-auto fill-1">check_circle</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setShowBenefits(false)}
                                        className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/20"
                                    >
                                        확인했습니다
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </div >
        </div >
    );
}
