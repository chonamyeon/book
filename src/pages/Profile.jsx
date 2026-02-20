import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import { loginWithGoogle, loginWithGoogleRedirect, logout, auth } from '../firebase';
import { getRedirectResult } from 'firebase/auth'; // Import for redirect handling
import { useAuth } from '../hooks/useAuth';

export default function Profile() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [debugLogs, setDebugLogs] = useState([]);
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);

    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString();
        setDebugLogs(prev => [`[${time}] ${msg}`, ...prev]);
        console.log(`[${time}] ${msg}`);
    };

    // Detect Mobile & In-App Browser
    useEffect(() => {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isInApp = /KAKAOTALK|Instagram|NAVER|Snapchat|Line|Facebook/i.test(userAgent);

        setIsInAppBrowser(isInApp);
        setIsMobile(mobile);

        if (isInApp) {
            addLog("WARNING: Running in In-App Browser. Login may fail.");
        }
    }, []);

    // ... (rest of the file)

    const handleLoginPopup = async () => {
        // iOS Safari Issue: Popup often fails or is blocked.
        // We strongly rely on Redirect for mobile.
        addLog("Attempting Popup Login...");
        try {
            await loginWithGoogle();
        } catch (error) {
            addLog("Popup Failed: " + error.code + " - " + error.message);
            // If popup fails (e.g., blocked), fallback to redirect? 
            // Better to let user choose, but we can suggest it.
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
                if (confirm("팝업이 차단되었습니다. 페이지 이동 방식으로 로그인하시겠습니까?")) {
                    handleLoginRedirect();
                }
            } else {
                alert("로그인 실패: " + error.message);
            }
        }
    };

    const handleSmartLogin = async () => {
        if (isMobile || isInAppBrowser) {
            addLog("Mobile/In-App detected. Using Redirect Strategy.");
            await handleLoginRedirect();
        } else {
            addLog("Desktop detected. Using Popup Strategy.");
            await handleLoginPopup();
        }
    };

    // ...

    return (
        // ...
        <div className="w-full flex flex-col gap-3 mb-10">
            <button
                onClick={handleSmartLogin}
                className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-white text-primary font-black rounded-2xl shadow-xl hover:scale-[1.01] active:scale-95 transition-all border-b-4 border-slate-200"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="size-6" />
                <span>Google로 초고속 로그인</span>
            </button>

            <div className="mt-4 p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                <p className="text-slate-500 text-[10px] text-center mb-3 font-bold uppercase tracking-widest">Login Issues?</p>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => {
                            localStorage.clear();
                            sessionStorage.clear();
                            alert("브라우저 데이터가 초기화되었습니다. 새로고침 후 다시 시도해주세요!");
                            window.location.reload();
                        }}
                        className="py-2 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg border border-white/5 active:scale-95"
                    >
                        데이터 초기화
                    </button>
                    <button
                        onClick={handleLoginRedirect}
                        className="py-2 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg border border-white/5 active:scale-95"
                    >
                        리디렉션 시도
                    </button>
                </div>
            </div>
        </div>

                            {/* Diagnostic Logs */ }
    <div className="w-full bg-black/40 rounded-2xl p-4 border border-white/5 text-left">
        <p className="text-white text-[10px] font-bold mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-gold">bug_report</span>
                DIAGNOSTIC LOGS
            </span>
            <button onClick={() => setDebugLogs([])} className="text-[9px] opacity-40 hover:opacity-100">Clear</button>
        </p>
        <div className="h-40 overflow-y-auto font-mono text-[9px] text-emerald-400 space-y-1 bg-black/30 p-3 rounded-xl scrollbar-hide">
            {debugLogs.length === 0 ? (
                <span className="text-slate-600 italic">No activity logs.</span>
            ) : (
                debugLogs.map((log, i) => <div key={i} className="border-b border-white/5 pb-1 mb-1 break-all opacity-80">{log}</div>)
            )}
        </div>
    </div>
                        </div >
                    )
}
<p className="text-center text-[10px] text-slate-500 mt-12 mb-4">
    The Archive v1.3.0<br />
    Enhanced Diagnostic Mode Applied
</p>
                </main >

    <BottomNavigation />
            </div >
        </div >
    );
}
