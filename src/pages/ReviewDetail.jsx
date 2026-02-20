import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import { celebrities } from '../data/celebrities';

export default function ReviewDetail() {
    const { id } = useParams(); // Using book title as ID for simplicity or celebId
    const navigate = useNavigate();

    // In a real app, you'd fetch by ID. Here we'll search for the book in celebrities data
    // For this demonstration, we'll focus on the target books
    const bookTitle = id === "1984" ? "1984" : "사피엔스";

    // Find the book and its review
    let targetBook = null;
    celebrities.forEach(celeb => {
        const found = celeb.books.find(b => b.title === bookTitle);
        if (found) targetBook = found;
    });

    if (!targetBook) {
        return <div className="p-20 text-white text-center">리뷰를 찾을 수 없습니다.</div>;
    }

    return (
        <div className="bg-background-dark min-h-screen pb-24 font-display flex justify-center">
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden">
                <TopNavigation title="주간 포커스 리뷰" type="sub" />

                <main className="px-6 pt-24 pb-12">
                    <div className="mb-12">
                        <div className="aspect-[2/3] w-48 mx-auto rounded-2xl overflow-hidden shadow-2xl border border-white/10 mb-8">
                            <img src={targetBook.cover} alt={targetBook.title} className="w-full h-full object-cover" />
                        </div>

                        <div className="text-center space-y-2">
                            <span className="text-gold text-[10px] font-black uppercase tracking-[0.3em]">Weekly Focus Review</span>
                            <h2 className="serif-title text-3xl text-white font-bold">{targetBook.title}</h2>
                            <p className="text-slate-500 text-sm italic">{targetBook.author}</p>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-3xl p-8 border border-white/5 relative overflow-hidden backdrop-blur-sm">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-30"></div>

                        <div className="prose prose-invert max-w-none">
                            <p className="text-slate-200 text-base leading-loose font-light whitespace-pre-wrap first-letter:text-5xl first-letter:font-serif first-letter:text-gold first-letter:float-left first-letter:mr-3 first-letter:mt-1">
                                {targetBook.review || targetBook.desc}
                            </p>
                        </div>
                    </div>

                    <div className="mt-12 flex justify-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="px-8 py-3 rounded-full border border-white/10 text-white/50 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                        >
                            Back to Editorial
                        </button>
                    </div>
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
