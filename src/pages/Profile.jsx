import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainHeader from '../components/MainHeader';
import LoadingScreen from '../components/LoadingScreen';
import BottomNavigation from '../components/BottomNavigation';
import { logout, auth, db, getFCMToken } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import Footer from '../components/Footer';
import KakaoAdFit from '../components/KakaoAdFit';
import { deleteUser, reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const TYPE_META = {
    growth:        { label: '성장·실행형', accent: '#3B82F6' },
    entertainment: { label: '창의·탐험형', accent: '#8B5CF6' },
    empathy:       { label: '공감·관계형', accent: '#F43F5E' },
    mindfulness:   { label: '사색·마음형', accent: '#10B981' },
};

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const isInStandaloneMode = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

const AppleIcon = () => (
    <svg width="13" height="15" viewBox="0 0 814 1000" fill="currentColor">
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.2 172.5 46.2 42.8 0 109.6-49 192.8-49 31.2 0 134.2 2.9 209.4 100.5zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
    </svg>
);
const AndroidIcon = () => (
    <svg width="13" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.523 15.341c-.582 0-1.054-.473-1.054-1.054s.472-1.054 1.054-1.054 1.054.473 1.054 1.054-.472 1.054-1.054 1.054m-11.046 0c-.582 0-1.054-.473-1.054-1.054s.472-1.054 1.054-1.054 1.054.473 1.054 1.054-.472 1.054-1.054 1.054m11.404-6.702l2.1-3.64a.434.434 0 0 0-.159-.593.434.434 0 0 0-.593.159l-2.127 3.685C15.401 7.484 13.762 7 12 7s-3.401.484-5.102 1.25L4.771 4.565a.434.434 0 0 0-.593-.159.434.434 0 0 0-.159.593l2.1 3.64C3.641 10.073 2 12.454 2 15.2h20c0-2.746-1.641-5.127-4.119-6.561"/>
    </svg>
);

const IconBox = ({ icon }) => (
    <div className="flex-shrink-0 flex items-center justify-center"
        style={{ width: 36, height: 36, background: 'rgba(255,107,0,0.12)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#FF6B00', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
    </div>
);

// 설치 가이드 모달 공통 래퍼
const InstallModal = ({ onClose, children }) => (
    <div className="fixed inset-0 z-[600] flex items-center justify-center px-5"
        style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)' }}
        onClick={onClose}>
        <div className="w-full max-w-[360px] overflow-hidden shadow-2xl"
            style={{ background: '#151921', borderRadius: 16 }}
            onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

export default function Profile() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [pwaInstalled, setPwaInstalled] = useState(false);
    const [showIphoneGuide, setShowIphoneGuide] = useState(false);
    const [showAndroidGuide, setShowAndroidGuide] = useState(false);

    const [commuteOn, setCommuteOn] = useState(() => localStorage.getItem('commute_on') === 'true');
    const [commuteGo, setCommuteGo] = useState(() => localStorage.getItem('commute_go') || '08:00');
    const [commuteBack, setCommuteBack] = useState(() => localStorage.getItem('commute_back') || '18:00');
    const [commuteDays, setCommuteDays] = useState(() => {
        try { return JSON.parse(localStorage.getItem('commute_days')) || [0,1,2,3,4]; }
        catch { return [0,1,2,3,4]; }
    });
    const [notifPermission, setNotifPermission] = useState(() =>
        typeof Notification !== 'undefined' ? Notification.permission : 'default');
    const [commuteSaved, setCommuteSaved] = useState(false);
    const commuteTimerRef = useRef(null);

    useEffect(() => {
        const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => setPwaInstalled(true));
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // Firestore에서 페르소나 + 출퇴근 설정 로드
    useEffect(() => {
        if (!user) return;
        import('firebase/firestore').then(({ doc: fsDoc, getDoc }) => {
            import('../firebase').then(({ db: fsDb }) => {
                getDoc(fsDoc(fsDb, 'users', user.uid)).then(snap => {
                    if (!snap.exists()) return;
                    const data = snap.data();
                    const remote = data.quizResult || data.myResultType;
                    if (remote) {
                        setQuizResultType(remote);
                        localStorage.setItem('quizResult', remote);
                    }
                    if (data.commuteGo)   { setCommuteGo(data.commuteGo);   localStorage.setItem('commute_go', data.commuteGo); }
                    if (data.commuteBack) { setCommuteBack(data.commuteBack); localStorage.setItem('commute_back', data.commuteBack); }
                    if (Array.isArray(data.commuteDays)) { setCommuteDays(data.commuteDays); localStorage.setItem('commute_days', JSON.stringify(data.commuteDays)); }
                    if (data.commuteAlarm !== undefined) { setCommuteOn(data.commuteAlarm); localStorage.setItem('commute_on', data.commuteAlarm ? 'true' : 'false'); }
                }).catch(() => {});
            });
        });
    }, [user?.uid]);

    // 포그라운드 폴백: 앱이 열려있을 때 1분마다 체크
    useEffect(() => {
        if (!commuteOn) return;
        if (typeof Notification === 'undefined') return;
        const check = () => {
            try {
                const now = new Date();
                const dayIdx = (now.getDay() + 6) % 7;
                if (!commuteDays.includes(dayIdx)) return;
                const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
                if (Notification.permission === 'granted') {
                    if (hhmm === commuteGo) {
                        const n = new Notification('🎧 출근길 콘텐츠 준비됐어요!', { body: '탭해서 바로 들어보세요.', icon: '/icons/icon-192.png' });
                        n.onclick = () => { window.focus(); navigate('/?autoplay=go', { replace: true }); };
                    } else if (hhmm === commuteBack) {
                        const n = new Notification('🌙 퇴근길 콘텐츠 준비됐어요!', { body: '탭해서 바로 들어보세요.', icon: '/icons/icon-192.png' });
                        n.onclick = () => { window.focus(); navigate('/?autoplay=back', { replace: true }); };
                    }
                }
            } catch {}
        };
        commuteTimerRef.current = setInterval(check, 60000);
        return () => clearInterval(commuteTimerRef.current);
    }, [commuteOn, commuteGo, commuteBack, commuteDays]);

    // SW에 알림 스케줄 등록 (백그라운드/PWA 지원)
    useEffect(() => {
        if (!commuteOn) return;
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.ready.then((reg) => {
            if (reg && reg.active) {
                reg.active.postMessage({
                    type: 'SCHEDULE_NOTIFICATIONS',
                    commuteGo,
                    commuteBack,
                    commuteDays,
                });
            }
        }).catch(() => {});
        return () => {
            navigator.serviceWorker.ready.then((reg) => {
                if (reg && reg.active) reg.active.postMessage({ type: 'CANCEL_NOTIFICATIONS' });
            }).catch(() => {});
        };
    }, [commuteOn, commuteGo, commuteBack, commuteDays]);

    useEffect(() => {
        if (!loading && !user) navigate('/login');
    }, [user, loading, navigate]);

    const toggleDay = (idx) =>
        setCommuteDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx].sort());

    const handleAndroidInstall = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(({ outcome }) => {
                if (outcome === 'accepted') setPwaInstalled(true);
                setDeferredPrompt(null);
            });
        } else {
            setShowAndroidGuide(true);
        }
    };

    const handleSaveCommute = async () => {
        // 1) localStorage 저장 (항상, 즉시)
        localStorage.setItem('commute_on', 'true');
        localStorage.setItem('commute_go', commuteGo);
        localStorage.setItem('commute_back', commuteBack);
        localStorage.setItem('commute_days', JSON.stringify(commuteDays));
        setCommuteOn(true);
        setCommuteSaved(true);
        setTimeout(() => setCommuteSaved(false), 2000);

        // 2) 알림 권한 요청 (사용자 제스처 컨텍스트 안에서 먼저)
        if (typeof Notification !== 'undefined') {
            try {
                if (Notification.permission === 'default') {
                    const perm = await Notification.requestPermission();
                    setNotifPermission(perm);
                } else {
                    setNotifPermission(Notification.permission);
                }
            } catch {}
        }

        alert(`✓ 알림 시간이 저장됐어요!\n출근 ${formatTime(commuteGo)} · 퇴근 ${formatTime(commuteBack)}`);

        // 3) Firestore 저장 — FCM 토큰과 무관하게 반드시 먼저 실행
        if (user) {
            try {
                await setDoc(doc(db, 'users', user.uid), {
                    commuteGo, commuteBack, commuteDays, commuteAlarm: true,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } catch {}
        }

        // 4) FCM 토큰 등록 — 별도로, 실패해도 저장에 영향 없음
        if (user && 'serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                // 5초 타임아웃 적용 (모바일 웹에서 FCM 지원 안 될 때 무한 대기 방지)
                const tokenPromise = getFCMToken();
                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
                const fcmToken = await Promise.race([tokenPromise, timeout]).catch(() => null);
                if (fcmToken) {
                    await setDoc(doc(db, 'users', user.uid), { fcmToken }, { merge: true });
                }
            } catch {}
        }
    };

    const handleToggleCommute = (val) => {
        setCommuteOn(val);
        localStorage.setItem('commute_on', val ? 'true' : 'false');
        if (!val) clearInterval(commuteTimerRef.current);
    };

    const handlePersona = () => {
        const qs = (() => { try { return JSON.parse(localStorage.getItem('quizScores')); } catch { return null; } })();
        quizResultType ? navigate('/result', { state: { resultType: quizResultType, scores: qs } }) : navigate('/quiz');
    };

    const handleDeleteAccount = async () => {
        setDeleteLoading(true); setDeleteError('');
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('인증 정보 없음');
            await reauthenticateWithPopup(currentUser, new GoogleAuthProvider());
            const { email, uid } = currentUser;
            const safeKey = email.replace(/[.#$[\]]/g, '_');
            await setDoc(doc(db, 'deletedUsers', safeKey), { email, uid, deletedAt: serverTimestamp() });
            await deleteDoc(doc(db, 'users', uid));
            await deleteUser(currentUser);
            navigate('/', { replace: true });
        } catch (err) {
            setDeleteError(err.code === 'auth/popup-closed-by-user'
                ? '재인증을 완료해야 탈퇴가 가능합니다.'
                : '탈퇴 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally { setDeleteLoading(false); }
    };

    const handleLogout = async () => {
        if (window.confirm('로그아웃 하시겠습니까?')) {
            try { await logout(); navigate('/login'); }
            catch (e) { alert('로그아웃 중 오류: ' + e.message); }
        }
    };

    if (loading) return <LoadingScreen />;
    if (!user) return null;

    const memberSince = (() => {
        const t = user?.metadata?.creationTime;
        if (!t) return '';
        const d = new Date(t);
        return `${d.getFullYear()}. ${String(d.getMonth()+1).padStart(2,'0')}. ${String(d.getDate()).padStart(2,'0')}`;
    })();

    const [quizResultType, setQuizResultType] = useState(() => localStorage.getItem('quizResult') || localStorage.getItem('myResultType') || null);
    const persona = TYPE_META[quizResultType];

    const formatTime = (val) => {
        const [h, m] = val.split(':').map(Number);
        return `${h < 12 ? '오전' : '오후'} ${String(h===0?12:h>12?h-12:h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    };

    const sLabel = { fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em' };
    const card = { background: '#161616' };
    const dim = { color: 'rgba(255,255,255,0.55)' };  // 설명 텍스트
    const dimLow = { color: 'rgba(255,255,255,0.38)' }; // 더 낮은 단계

    // 모달 공통 헤더
    const ModalHeader = ({ title, onClose }) => (
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 flex items-center justify-center" style={{ background: '#FF6B00', borderRadius: 6 }}>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 14, fontVariationSettings:"'FILL' 1" }}>bar_chart</span>
                </div>
                <div>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>아카이뷰 앱 설치</p>
                    <p className="text-[13px] font-bold text-white leading-none mt-0.5">{title}</p>
                </div>
            </div>
            <button onClick={onClose} className="active:opacity-50 flex items-center justify-center"
                style={{ width: 28, height: 28, background: '#2a2a2a', borderRadius: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>close</span>
            </button>
        </div>
    );

    return (
        <div className="min-h-screen pb-28" style={{ background: '#0d0d0d', color: '#e0e0e0', fontFamily: "'Manrope', sans-serif" }}>
            <MainHeader showBack />

            <main className="px-4 pt-6 pb-8 space-y-2 max-w-lg mx-auto">

                {/* ── 멤버십 카드 ── */}
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.58/1' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black" />
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.15)1px,transparent 1px)',
                        backgroundSize: '12px 12px'
                    }} />
                    <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full" style={{ background: 'rgba(255,107,0,0.12)', filter: 'blur(80px)' }} />
                    <div className="absolute inset-0 p-6 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg italic tracking-wider" style={{ fontFamily: 'serif', color: '#ffb693' }}>The Archiview</h3>
                                <span className="block mt-1" style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Private Membership</span>
                            </div>
                            <div className="size-8 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(4px)' }}>
                                <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>fingerprint</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-4 mb-4">
                                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=333&color=fff`}
                                    alt={user.displayName} className="size-12 object-cover"
                                    style={{ border: '1.5px solid rgba(255,182,147,0.4)' }} />
                                <div>
                                    <p className="text-white font-bold text-lg leading-none">{user.displayName}</p>
                                    <p className="text-xs mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.55)' }}>{user.email}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-end pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <div>
                                    <span className="block" style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Member Since</span>
                                    <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{memberSince}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block" style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Status</span>
                                    <span className="text-xs font-bold" style={{ color: '#10B981', letterSpacing: '0.05em' }}>ACTIVE</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-5 pb-1" style={{...sLabel, fontSize: 12}}>알림 설정</div>

                {/* ── PWA 설치 배너 ── */}
                {!isInStandaloneMode() && (
                    <div className="p-5 space-y-4" style={card}>
                        <div>
                            <p className="text-[13px] font-semibold text-white">출퇴근 알림을 받으려면 홈화면에 추가하세요</p>
                            <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>설정한 시간에 오늘의 콘텐츠 알림을 보내드립니다.</p>
                            <div className="flex items-center gap-1.5 mt-2">
                                <span style={{ fontSize: 12 }}>⚠️</span>
                                <p className="text-[11px] font-medium" style={{ color: '#fb923c' }}>앱 설치 후에만 푸시 알림이 작동합니다</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {/* Android 버튼 */}
                            <button onClick={handleAndroidInstall}
                                className="flex items-center justify-center gap-2 text-[12px] font-bold active:opacity-70 transition-opacity"
                                style={{ background: 'linear-gradient(135deg, #1a7a3a 0%, #22c55e 100%)', color: '#fff', borderRadius: 8, height: 32 }}>
                                <AndroidIcon />
                                {pwaInstalled ? '✓ 설치됨' : 'Android 설치'}
                            </button>
                            {/* iPhone 버튼 */}
                            <button onClick={() => setShowIphoneGuide(true)}
                                className="flex items-center justify-center gap-2 text-[12px] font-bold active:opacity-70 transition-opacity"
                                style={{ background: 'linear-gradient(135deg, #1a4080 0%, #3b82f6 100%)', color: '#fff', borderRadius: 8, height: 32 }}>
                                <AppleIcon />
                                iPhone 설치
                            </button>
                        </div>
                    </div>
                )}

                {/* ── 출퇴근 알림 ── */}
                <div className="p-5 space-y-5" style={card}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[14px] font-semibold text-white">출퇴근 알림</p>
                            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>설정 시간에 콘텐츠 알림을 보내드립니다</p>
                        </div>
                        <button onClick={() => handleToggleCommute(!commuteOn)}
                            className="relative flex-shrink-0 transition-colors duration-200"
                            style={{ width: 28, height: 16, minWidth: 28, minHeight: 16, padding: 0, background: commuteOn ? '#FF6B00' : '#2a2a2a', borderRadius: 8 }}>
                            <span className="absolute transition-transform duration-200"
                                style={{ top: 2, left: 2, width: 12, height: 12, background: '#fff', borderRadius: '50%',
                                    transform: commuteOn ? 'translateX(12px)' : 'translateX(0)', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                        </button>
                    </div>

                    {/* 요일 */}
                    <div className="space-y-2">
                        <p style={sLabel}>알림 요일</p>
                        <div className="flex gap-1">
                            {DAYS.map((day, idx) => {
                                const on = commuteDays.includes(idx);
                                return (
                                    <button key={day} onClick={() => toggleDay(idx)}
                                        className="flex-1 py-2.5 text-[13px] font-semibold transition-all active:opacity-60"
                                        style={{
                                            background: on ? '#2c2c2c' : 'transparent',
                                            borderRadius: 6,
                                            color: on ? '#fff'
                                                : idx === 6 ? 'rgba(248,113,113,0.7)'
                                                : idx === 5 ? 'rgba(96,165,250,0.7)'
                                                : 'rgba(255,255,255,0.45)',
                                        }}>
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 시간 */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: '출근 시간', val: commuteGo, set: setCommuteGo },
                            { label: '퇴근 시간', val: commuteBack, set: setCommuteBack },
                        ].map(({ label: lbl, val, set }) => {
                            const [h, m] = val.split(':').map(Number);
                            return (
                                <div key={lbl} className="space-y-2">
                                    <p style={sLabel}>{lbl}</p>
                                    <div className="p-3 space-y-1" style={{ background: '#111', borderRadius: 8 }}>
                                        <p className="text-[16px] font-bold text-white">{formatTime(val)}</p>
                                        <div className="flex gap-2">
                                            <select value={h}
                                                onChange={e => set(`${String(Number(e.target.value)).padStart(2,'0')}:${String(m).padStart(2,'0')}`)}
                                                className="bg-transparent text-[11px] outline-none cursor-pointer"
                                                style={{ color: 'rgba(255,255,255,0.6)', border: 'none', WebkitAppearance: 'none' }}>
                                                {Array.from({length:24},(_,i)=>i).map(hh=>(
                                                    <option key={hh} value={hh} style={{background:'#1a1a1a'}}>
                                                        {hh<12?`오전 ${hh===0?12:hh}시`:`오후 ${hh===12?12:hh-12}시`}
                                                    </option>
                                                ))}
                                            </select>
                                            <select value={m}
                                                onChange={e => set(`${String(h).padStart(2,'0')}:${String(Number(e.target.value)).padStart(2,'0')}`)}
                                                className="bg-transparent text-[11px] outline-none cursor-pointer"
                                                style={{ color: 'rgba(255,255,255,0.6)', border: 'none', WebkitAppearance: 'none' }}>
                                                {[0,10,20,30,40,50].map(mm=>(
                                                    <option key={mm} value={mm} style={{background:'#1a1a1a'}}>{String(mm).padStart(2,'0')}분</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button onClick={handleSaveCommute}
                        className="w-full py-3.5 text-[13px] font-semibold tracking-wide transition-all active:opacity-70"
                        style={{ background: commuteSaved ? '#c25200' : '#FF6B00', color: '#fff', borderRadius: 8 }}>
                        {commuteSaved ? '✓ 저장됐어요' : '알림 시간 저장'}
                    </button>

                    {notifPermission === 'denied' && (
                        <div className="flex items-center justify-center gap-2 py-2.5"
                            style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#F87171' }}>notifications_off</span>
                            <p className="text-[12px] font-semibold" style={{ color: '#F87171' }}>브라우저 설정에서 알림을 허용해주세요</p>
                        </div>
                    )}
                    {notifPermission === 'granted' && commuteOn && (
                        <div className="flex items-center justify-center gap-2 py-2.5"
                            style={{ background: 'rgba(16,185,129,0.12)', borderRadius: 8 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#10B981', fontVariationSettings:"'FILL' 1" }}>check_circle</span>
                            <p className="text-[12px] font-semibold" style={{ color: '#10B981' }}>알림이 활성화됐어요</p>
                        </div>
                    )}
                </div>

                {/* ── 이렇게 사용하세요 ── */}
                <div className="pt-5 pb-1" style={{...sLabel, fontSize: 12}}>이렇게 사용하세요</div>
                <div className="p-5 space-y-4" style={card}>
                    <div className="space-y-3">
                        {[
                            { icon: 'install_mobile',  title: '① 앱 설치',        desc: '아래 Android / iPhone 설치 버튼으로 홈화면에 추가하세요' },
                            { icon: 'schedule',        title: '② 시간·요일 설정', desc: '출퇴근 요일과 시간을 선택 후 저장하세요' },
                            { icon: 'notifications',   title: '③ 푸시 알림 허용', desc: '저장 시 브라우저 알림 권한 팝업이 뜨면 허용을 눌러주세요' },
                            { icon: 'mark_chat_read',  title: '④ 알림 수신',      desc: '설정 시간에 「🎧 출근길 콘텐츠 준비됐어요!」알림이 도착해요' },
                            { icon: 'touch_app',       title: '⑤ 알림 탭',        desc: '알림을 탭하면 아카이뷰가 바로 열려요' },
                            { icon: 'play_circle',     title: '⑥ 자동 재생 시작', desc: '오늘의 추천 콘텐츠가 자동으로 재생돼요' },
                        ].map(({ icon, title, desc }, i, arr) => (
                            <div key={title} className="flex items-start gap-3">
                                <div className="flex flex-col items-center flex-shrink-0">
                                    <div className="flex items-center justify-center" style={{ width: 32, height: 32, background: 'rgba(255,107,0,0.1)' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#FF6B00', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                                    </div>
                                    {i < arr.length - 1 && <div style={{ width: 1, minHeight: 14, background: 'rgba(255,255,255,0.06)', marginTop: 3 }} />}
                                </div>
                                <div className="pb-1 pt-1">
                                    <p className="text-[13px] font-semibold text-white">{title}</p>
                                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── MY ARCHIVIEW ── */}
                <div className="pt-5 pb-1" style={sLabel}>My Archiview</div>
                <div style={card}>
                    {[
                        { icon: 'shelves',    label: '나의 서재',     sub: '',                   onClick: () => {} },
                        { icon: 'edit_note',  label: '기록노트',      sub: '',                   onClick: () => navigate('/reading-notes') },
                        { icon: 'psychology', label: '나의 페르소나', sub: persona?.label || '', onClick: handlePersona },
                    ].map(({ icon, label, sub, onClick }, i, arr) => (
                        <button key={label} onClick={onClick}
                            className="w-full flex items-center justify-between px-4 py-4 transition-colors text-left active:bg-[#1e1e1e]"
                            style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <div className="flex items-center gap-3">
                                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 18, lineHeight: 1, width: 20, textAlign: 'center' }}>·</span>
                                <div>
                                    <span className="text-[14px] text-white" style={{ opacity: 0.8 }}>{label}</span>
                                    {sub && <span className="block text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{sub}</span>}
                                </div>
                            </div>
                            <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.15)', fontSize: 16 }}>chevron_right</span>
                        </button>
                    ))}
                </div>

                {/* ── Account ── */}
                <div className="pt-5 pb-1" style={sLabel}>Account</div>
                <div style={card}>
                    <div className="flex justify-center px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <KakaoAdFit unit="DAN-aXfyL1HtK8zp0vui" width="320" height="100" />
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-4 active:bg-[#1e1e1e] transition-colors"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#F87171' }}>
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 18, lineHeight: 1, width: 20, textAlign: 'center' }}>·</span>
                        <span className="text-[14px]">로그아웃</span>
                    </button>
                    <button onClick={() => setShowDeleteModal(true)} className="w-full flex items-center gap-3 px-5 py-4 active:bg-[#1e1e1e] transition-colors"
                        style={{ color: 'rgba(255,255,255,0.45)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 18, lineHeight: 1, width: 20, textAlign: 'center' }}>·</span>
                        <span className="text-[13px]">탈퇴하기</span>
                    </button>
                </div>

                <Footer />
            </main>

            {/* ══════════════════════════════════
                Android 설치 가이드 모달
            ══════════════════════════════════ */}
            {showAndroidGuide && (
                <InstallModal onClose={() => setShowAndroidGuide(false)}>
                    <ModalHeader title="Android 설치 방법" onClose={() => setShowAndroidGuide(false)} />

                    <div className="px-5 pb-2 text-center">
                        <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            아카이뷰 서비스를 쉽고 편하게<br />
                            이용하시려면 <span className="text-white font-bold">"홈화면에 추가"</span>를<br />
                            하신 후 이용하시기 바랍니다.
                        </p>
                    </div>

                    <div className="px-5 space-y-3 pb-5">
                        {/* Step 1 */}
                        <div className="p-4 space-y-2" style={{ background: '#1e2433' }}>
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                    style={{ background: '#3b82f6', borderRadius: 4 }}>1</span>
                                <p className="text-[12px] font-semibold text-white">크롬으로 접속 후 우측 상단 ⋮ 탭</p>
                            </div>
                            {/* 크롬 URL바 모형 */}
                            <div className="p-3 space-y-2" style={{ background: '#111827', borderRadius: 8 }}>
                                <div className="flex items-center gap-2 px-2 py-1.5" style={{ background: '#1f2937', borderRadius: 6 }}>
                                    <span className="text-[11px] flex-1" style={{ color: 'rgba(255,255,255,0.5)' }}>archiview.store</span>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>more_vert</span>
                                </div>
                                <div className="flex items-center justify-between px-2 py-2" style={{ background: '#166534', borderRadius: 6 }}>
                                    <span className="text-[11px] text-white font-medium">앱 설치 / 홈화면에 추가</span>
                                    <span className="text-[14px]">👆</span>
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="p-4 space-y-2" style={{ background: '#1e2433' }}>
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                    style={{ background: '#3b82f6', borderRadius: 4 }}>2</span>
                                <p className="text-[12px] font-semibold text-white">"설치" 탭 → 홈화면에 아이콘 추가</p>
                            </div>
                            {/* 앱 설치 모형 */}
                            <div className="p-3" style={{ background: '#111827', borderRadius: 8 }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: '#FF6B00', borderRadius: 10 }}>
                                        <span className="material-symbols-outlined text-white" style={{ fontSize: 20, fontVariationSettings:"'FILL' 1" }}>bar_chart</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[12px] font-bold text-white">Archiview</p>
                                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>홈화면에 추가되면 앱처럼 실행됩니다</p>
                                    </div>
                                    <div className="w-7 h-7 flex items-center justify-center" style={{ background: '#16a34a', borderRadius: '50%' }}>
                                        <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>add</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-5 pb-5">
                        <button onClick={() => setShowAndroidGuide(false)}
                            className="w-full py-3.5 text-[14px] font-bold text-white active:opacity-80 transition-opacity"
                            style={{ background: 'linear-gradient(135deg, #1a7a3a 0%, #22c55e 100%)', borderRadius: 8 }}>
                            확인했습니다
                        </button>
                    </div>
                </InstallModal>
            )}

            {/* ══════════════════════════════════
                iPhone 설치 가이드 모달
            ══════════════════════════════════ */}
            {showIphoneGuide && (
                <InstallModal onClose={() => setShowIphoneGuide(false)}>
                    <ModalHeader title="iPhone 설치 방법" onClose={() => setShowIphoneGuide(false)} />

                    <div className="px-5 pb-2 text-center">
                        <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            아카이뷰 서비스를 쉽고 편하게<br />
                            이용하시려면 <span className="text-white font-bold">"홈화면에 추가"</span>를<br />
                            하신 후 이용하시기 바랍니다.
                        </p>
                    </div>

                    <div className="px-5 space-y-3 pb-5">
                        {/* Step 1 */}
                        <div className="p-4 space-y-2" style={{ background: '#1e2433' }}>
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                    style={{ background: '#3b82f6', borderRadius: 4 }}>1</span>
                                <p className="text-[12px] font-semibold text-white">사파리로 접속 후 하단 공유 버튼 탭</p>
                            </div>
                            {/* 사파리 URL바 모형 */}
                            <div className="p-3 space-y-2" style={{ background: '#111827', borderRadius: 8 }}>
                                <div className="flex items-center gap-2 px-2 py-1.5" style={{ background: '#1f2937', borderRadius: 6 }}>
                                    <span className="text-[11px] flex-1 text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>archiview.store</span>
                                </div>
                                <div className="flex items-center justify-around pt-1">
                                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)' }}>chevron_left</span>
                                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)' }}>chevron_right</span>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#3b82f6', fontVariationSettings:"'FILL' 0" }}>ios_share</span>
                                        <span className="text-[8px]" style={{ color: '#3b82f6' }}>공유</span>
                                    </div>
                                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)' }}>bookmark_border</span>
                                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)' }}>tab</span>
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="p-4 space-y-2" style={{ background: '#1e2433' }}>
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                    style={{ background: '#3b82f6', borderRadius: 4 }}>2</span>
                                <p className="text-[12px] font-semibold text-white">"홈 화면에 추가" 선택 → "추가" 탭</p>
                            </div>
                            {/* 공유시트 모형 */}
                            <div className="space-y-1" style={{ background: '#111827', borderRadius: 8, overflow: 'hidden' }}>
                                {['AirDrop으로 공유', '메시지', '메일'].map(item => (
                                    <div key={item} className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{item}</span>
                                    </div>
                                ))}
                                <div className="px-3 py-2.5 flex items-center gap-2" style={{ background: 'rgba(59,130,246,0.12)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#3b82f6', fontVariationSettings:"'FILL' 1" }}>add_box</span>
                                    <span className="text-[11px] font-semibold" style={{ color: '#3b82f6' }}>홈 화면에 추가</span>
                                    <span className="ml-auto text-[14px]">👆</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-5 pb-5">
                        <button onClick={() => setShowIphoneGuide(false)}
                            className="w-full py-3.5 text-[14px] font-bold text-white active:opacity-80 transition-opacity"
                            style={{ background: 'linear-gradient(135deg, #1a4080 0%, #3b82f6 100%)', borderRadius: 8 }}>
                            확인했습니다
                        </button>
                    </div>
                </InstallModal>
            )}

            {/* ── 탈퇴 확인 모달 ── */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center px-6"
                    style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }}>
                    <div className="w-full max-w-[320px] shadow-2xl" style={{ background: '#161616' }}>
                        <div className="p-6 space-y-4">
                            <h3 className="text-white font-semibold text-[16px]">정말 탈퇴하시겠습니까?</h3>
                            <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                탈퇴 시 모든 데이터가 영구 삭제되며 복구가 불가능합니다.
                            </p>
                            <p className="text-[11px] font-semibold leading-relaxed" style={{ color: '#F87171' }}>
                                ※ 탈퇴 후 동일한 구글 계정으로 재가입이 불가능합니다.
                            </p>
                            {deleteError && (
                                <p className="text-[11px] p-3" style={{ color: '#F87171', background: 'rgba(239,68,68,0.08)' }}>{deleteError}</p>
                            )}
                            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.18)' }}>본인 확인을 위해 구글 재인증이 필요합니다.</p>
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => { setShowDeleteModal(false); setDeleteError(''); }}
                                    className="flex-1 py-3 text-white text-[13px] font-semibold active:opacity-60"
                                    style={{ background: '#222' }}>취소</button>
                                <button onClick={handleDeleteAccount} disabled={deleteLoading}
                                    className="flex-1 py-3 text-white text-[13px] font-semibold active:opacity-70 disabled:opacity-30"
                                    style={{ background: '#7f1d1d' }}>
                                    {deleteLoading ? '처리중...' : '탈퇴하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <BottomNavigation />
        </div>
    );
}
