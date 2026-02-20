import React, { useState } from 'react';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import { loadTossPayments } from '@tosspayments/payment-sdk';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('dashboard');

    // Toss Payments Init
    const handlePayment = async () => {
        try {
            const tossPayments = await loadTossPayments('test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq');
            await tossPayments.requestPayment('카드', {
                amount: 15000,
                orderId: `ORDER-${new Date().getTime()}`,
                orderName: '프리미엄 멤버십 테스트 결제',
                customerName: '김토스',
                successUrl: window.location.origin + '/admin',
                failUrl: window.location.origin + '/admin',
            });
        } catch (error) {
            console.error('Payment Error:', error);
            alert('결제 요청 중 오류가 발생했습니다: ' + error.message);
        }
    };

    // Mock Data
    const stats = [
        { title: '전체 회원수', value: '1,248', change: '+12%', icon: 'group' },
        { title: '누적 매출', value: '₩45.2M', change: '+8%', icon: 'payments' },
        { title: '관리 도서', value: '342', change: '+4', icon: 'auto_stories' },
        { title: '활성 사용자', value: '854', change: '+24%', icon: 'trending_up' },
    ];

    const users = [
        { id: 1, name: '김민수', email: 'kim@example.com', role: '일반회원', status: '활동중', date: '2024-02-15' },
        { id: 2, name: '이지원', email: 'lee@example.com', role: '프리미엄', status: '활동중', date: '2024-02-14' },
        { id: 3, name: '박준호', email: 'park@example.com', role: '일반회원', status: '휴면', date: '2024-02-10' },
        { id: 4, name: '최수진', email: 'choi@example.com', role: 'VIP', status: '활동중', date: '2024-01-20' },
        { id: 5, name: '정우성', email: 'jung@example.com', role: '일반회원', status: '정지', date: '2023-12-05' },
    ];

    const books = [
        { id: 1, title: '호모 데우스', author: '유발 하라리', stock: 12, price: '22,000' },
        { id: 2, title: '위대한 개츠비', author: 'F. 스콧 피츠제럴드', stock: 5, price: '15,000' },
        { id: 3, title: '데미안', author: '헤르만 헤세', stock: 8, price: '12,000' },
        { id: 4, title: '1984', author: '조지 오웰', stock: 0, price: '14,000' },
        { id: 5, title: '코스모스', author: '칼 세이건', stock: 3, price: '25,000' },
    ];

    const sales = [
        { id: 101, user: '김민수', item: '호모 데우스', amount: '22,000', date: '2분 전' },
        { id: 102, user: '이지원', item: '프리미엄 구독', amount: '19,000', date: '15분 전' },
        { id: 103, user: 'Unknown', item: '데미안', amount: '12,000', date: '1시간 전' },
        { id: 104, user: '최수진', item: '코스모스', amount: '25,000', date: '3시간 전' },
    ];

    const tabNames = {
        'dashboard': '대시보드',
        'members': '회원 관리',
        'books': '도서 관리',
        'sales': '매출 관리',
        'payment': '결제 설정' // New Tab
    };

    return (
        <div className="bg-white font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden border-t border-white/5">
                <TopNavigation title="관리자 대시보드" type="sub" />

                <main className="px-6 pt-8 pb-24 space-y-8 animate-fade-in-up">

                    {/* Tab Navigation */}
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 overflow-x-auto scrollbar-hide">
                        {Object.keys(tabNames).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab
                                    ? 'bg-gold text-primary shadow-lg'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {tabNames[tab]}
                            </button>
                        ))}
                    </div>

                    {/* Dashboard View */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                {stats.map((stat, idx) => (
                                    <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:bg-white/10 transition-colors">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <span className="material-symbols-outlined text-4xl">{stat.icon}</span>
                                        </div>
                                        <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">{stat.title}</p>
                                        <h3 className="text-2xl font-black text-white mb-2">{stat.value}</h3>
                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-green-500/20 text-green-400 font-bold">
                                            {stat.change}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white/5 rounded-2xl border border-white/5 p-5">
                                <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gold text-lg">notifications</span>
                                    시스템 업데이트
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-start">
                                        <div className="size-2 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                                        <div>
                                            <p className="text-slate-200 text-xs leading-relaxed">새벽 3시 정기 점검이 예정되어 있습니다.</p>
                                            <span className="text-[10px] text-slate-500">2시간 전</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="size-2 rounded-full bg-green-500 mt-2 shrink-0"></div>
                                        <div>
                                            <p className="text-slate-200 text-xs leading-relaxed">신규 도서 데이터가 성공적으로 처리되었습니다.</p>
                                            <span className="text-[10px] text-slate-500">5시간 전</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Members View */}
                    {activeTab === 'members' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-bold text-lg">회원 목록</h3>
                                <button className="size-8 rounded-full bg-gold flex items-center justify-center text-primary hover:bg-white transition-colors">
                                    <span className="material-symbols-outlined text-lg">add</span>
                                </button>
                            </div>
                            <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                <div className="divide-y divide-white/5">
                                    {users.map((user) => (
                                        <div key={user.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-white text-sm font-bold">{user.name}</p>
                                                    <p className="text-slate-500 text-[10px]">{user.email}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold mb-1 ${user.status === '활동중' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {user.status}
                                                </span>
                                                <p className="text-slate-600 text-[9px]">{user.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Books View */}
                    {activeTab === 'books' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-bold text-lg">재고 현황</h3>
                                <button className="size-8 rounded-full bg-gold flex items-center justify-center text-primary hover:bg-white transition-colors">
                                    <span className="material-symbols-outlined text-lg">add</span>
                                </button>
                            </div>
                            <div className="grid gap-3">
                                {books.map((book) => (
                                    <div key={book.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 aspect-[2/3] bg-slate-800 rounded border border-white/10"></div>
                                            <div>
                                                <h4 className="text-white text-sm font-bold truncate max-w-[150px]">{book.title}</h4>
                                                <p className="text-slate-500 text-[10px]">{book.author}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gold text-xs font-bold mb-1">₩{book.price}</p>
                                            <span className={`text-[9px] font-bold ${book.stock > 0 ? 'text-slate-400' : 'text-red-500'}`}>
                                                {book.stock > 0 ? `재고 ${book.stock}권` : '일시 품절'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sales View */}
                    {activeTab === 'sales' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-bold text-lg">최근 거래 내역</h3>
                                <button className="text-[10px] text-slate-400 underline">엑셀 다운로드</button>
                            </div>
                            <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                <div className="divide-y divide-white/5">
                                    {sales.map((sale) => (
                                        <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                            <div>
                                                <p className="text-white text-sm font-bold">{sale.item}</p>
                                                <p className="text-slate-500 text-[10px]">구매자: {sale.user}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white text-xs font-bold">+{sale.amount}</p>
                                                <p className="text-slate-600 text-[9px]">{sale.date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment Settings View (New) */}
                    {activeTab === 'payment' && (
                        <div>
                            <div className="mb-6">
                                <h3 className="text-white font-bold text-lg mb-2">결제 시스템 설정</h3>
                                <p className="text-slate-400 text-xs">토스 페이먼츠 결제 연동 테스트 및 설정이 가능합니다.</p>
                            </div>

                            <div className="bg-white/5 rounded-2xl border border-white/5 p-6 space-y-6">
                                <div>
                                    <label className="block text-slate-400 text-xs font-bold mb-2">클라이언트 키 (Client Key)</label>
                                    <div className="bg-black/30 p-3 rounded-lg border border-white/10 flex items-center justify-between">
                                        <code className="text-gold text-xs font-mono">test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq</code>
                                        <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-1 rounded">ON</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-slate-300 text-sm mb-4">결제 테스트</p>
                                    <button
                                        onClick={handlePayment}
                                        className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                    >
                                        <span className="material-symbols-outlined">credit_card</span>
                                        토스 결제창 띄우기 (테스트)
                                    </button>
                                    <p className="text-slate-500 text-[10px] text-center mt-3">
                                        * 실제 결제가 이루어지지 않는 테스트 모드입니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                </main>
                <BottomNavigation />
            </div>
        </div>
    );
}
