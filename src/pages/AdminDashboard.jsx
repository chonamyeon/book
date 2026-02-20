import React, { useState } from 'react';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('dashboard');

    // Mock Data
    const stats = [
        { title: 'Total Members', value: '1,248', change: '+12%', icon: 'group' },
        { title: 'Total Sales', value: '₩45.2M', change: '+8%', icon: 'payments' },
        { title: 'Books Managed', value: '342', change: '+4', icon: 'auto_stories' },
        { title: 'Active Users', value: '854', change: '+24%', icon: 'trending_up' },
    ];

    const users = [
        { id: 1, name: 'Kim Min-su', email: 'kim@example.com', role: 'Member', status: 'Active', date: '2024-02-15' },
        { id: 2, name: 'Lee Ji-won', email: 'lee@example.com', role: 'Premium', status: 'Active', date: '2024-02-14' },
        { id: 3, name: 'Park Jun-ho', email: 'park@example.com', role: 'Member', status: 'Inactive', date: '2024-02-10' },
        { id: 4, name: 'Choi Soo-jin', email: 'choi@example.com', role: 'VIP', status: 'Active', date: '2024-01-20' },
        { id: 5, name: 'Jung Woo-sung', email: 'jung@example.com', role: 'Member', status: 'Suspended', date: '2023-12-05' },
    ];

    const books = [
        { id: 1, title: 'Sapiens', author: 'Yuval Noah Harari', stock: 12, price: '22,000' },
        { id: 2, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', stock: 5, price: '15,000' },
        { id: 3, title: 'Demian', author: 'Hermann Hesse', stock: 8, price: '12,000' },
        { id: 4, title: '1984', author: 'George Orwell', stock: 0, price: '14,000' },
        { id: 5, title: 'Cosmos', author: 'Carl Sagan', stock: 3, price: '25,000' },
    ];

    const sales = [
        { id: 101, user: 'Kim Min-su', item: 'Sapiens', amount: '22,000', date: '2 mins ago' },
        { id: 102, user: 'Lee Ji-won', item: 'Premium Sub', amount: '19,000', date: '15 mins ago' },
        { id: 103, user: 'Unknown', item: 'Demian', amount: '12,000', date: '1 hour ago' },
        { id: 104, user: 'Choi Soo-jin', item: 'Cosmos', amount: '25,000', date: '3 hours ago' },
    ];

    return (
        <div className="bg-white font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden border-t border-white/5">
                <TopNavigation title="관리자 대시보드" type="sub" />

                <main className="px-6 pt-8 pb-24 space-y-8 animate-fade-in-up">

                    {/* Tab Navigation */}
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 overflow-x-auto scrollbar-hide">
                        {['dashboard', 'members', 'books', 'sales'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab
                                        ? 'bg-gold text-primary shadow-lg'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                                    System Updates
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-start">
                                        <div className="size-2 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                                        <div>
                                            <p className="text-slate-200 text-xs leading-relaxed">System maintenance scheduled for 03:00 AM.</p>
                                            <span className="text-[10px] text-slate-500">2 hours ago</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="size-2 rounded-full bg-green-500 mt-2 shrink-0"></div>
                                        <div>
                                            <p className="text-slate-200 text-xs leading-relaxed">New batch of books processed successfully.</p>
                                            <span className="text-[10px] text-slate-500">5 hours ago</span>
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
                                <h3 className="text-white font-bold text-lg">Member List</h3>
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
                                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase mb-1 ${user.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
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
                                <h3 className="text-white font-bold text-lg">Inventory</h3>
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
                                                {book.stock > 0 ? `${book.stock} in stock` : 'Out of Stock'}
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
                                <h3 className="text-white font-bold text-lg">Recent Transactions</h3>
                                <button className="text-[10px] text-slate-400 underline">Export CSV</button>
                            </div>
                            <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                <div className="divide-y divide-white/5">
                                    {sales.map((sale) => (
                                        <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                            <div>
                                                <p className="text-white text-sm font-bold">{sale.item}</p>
                                                <p className="text-slate-500 text-[10px]">by {sale.user}</p>
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

                </main>
                <BottomNavigation />
            </div>
        </div>
    );
}
