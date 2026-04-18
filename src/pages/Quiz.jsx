import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { questions } from '../data/questions';
import BottomNavigation from '../components/BottomNavigation';
import MainHeader from '../components/MainHeader';
import Footer from '../components/Footer';

export default function Quiz() {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [quizQuestions, setQuizQuestions] = useState([]);
    const navigate = useNavigate();

    // Initialize quiz with random questions on mount
    useEffect(() => {
        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        setQuizQuestions(shuffled.slice(0, 10)); // Select 10 random questions
    }, []);

    const handleOptionSelect = (optionId) => {
        const questionId = quizQuestions[currentQuestionIndex].id;
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < quizQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            window.scrollTo(0, 0);
        } else {
            const { scores, resultType } = calculateResult(answers);
            // 상세 점수와 유형 모두 저장
            localStorage.setItem('quizResult', resultType);
            localStorage.setItem('quizScores', JSON.stringify(scores));
            navigate('/result', { state: { resultType, scores } });
        }
    };

    const calculateResult = (finalAnswers) => {
        // 가중치 기반 점수 계산: A=Growth, B=Entertainment, C=Empathy, D=Mindfulness
        const scores = { A: 0, B: 0, C: 0, D: 0 };

        // 각 질문의 가중치를 반영한 점수 합산
        Object.entries(finalAnswers).forEach(([questionId, optionId]) => {
            const question = quizQuestions.find(q => q.id === parseInt(questionId));
            if (question) {
                const option = question.options.find(o => o.id === optionId);
                if (option && option.weights) {
                    // 가중치가 있는 경우: 다차원 점수 반영
                    scores.A += option.weights.A || 0;
                    scores.B += option.weights.B || 0;
                    scores.C += option.weights.C || 0;
                    scores.D += option.weights.D || 0;
                } else {
                    // 가중치가 없는 기존 질문: 단순 카운트
                    if (scores[optionId] !== undefined) {
                        scores[optionId]++;
                    }
                }
            }
        });

        // 주 유형 결정
        const typeMap = { A: 'growth', B: 'entertainment', C: 'empathy', D: 'mindfulness' };
        let maxKey = 'A';
        for (const key of ['B', 'C', 'D']) {
            if (scores[key] > scores[maxKey]) maxKey = key;
        }

        return { scores, resultType: typeMap[maxKey] };
    };

    if (quizQuestions.length === 0) return (
        <div className="bg-background-dark min-h-screen flex flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-10">
                <div className="absolute inset-0 bg-gold/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                <div className="size-20 rounded-full border-t-2 border-gold animate-spin"></div>
            </div>
            <h2 className="text-white text-xl font-bold mb-2">질문 준비 중...</h2>
            <p className="text-slate-500 text-sm">잠시만 기다려주세요.</p>
        </div>
    );

    const currentQuestion = quizQuestions[currentQuestionIndex];
    const totalQuestions = quizQuestions.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    const isSelected = !!answers[currentQuestion.id];

    return (
        <div className="bg-white font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden border-t border-white/5 flex flex-col">
                <MainHeader showBack />

                {/* Progress Bar */}
                <div className="w-full h-1 bg-white/5">
                    <div
                        className="h-full bg-gold transition-all duration-500 ease-out shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <main className="flex-1 px-6 pt-10 pb-24 flex flex-col animate-fade-in relative z-10">

                    {/* Decorative Elements */}
                    <div className="absolute top-20 right-0 w-64 h-64 bg-gold/5 blur-[100px] rounded-full pointer-events-none"></div>

                    {/* Question Header */}
                    <div className="mb-10 text-center relative">
                        <span className="inline-block px-3 py-1 mb-6 text-[10px] font-bold tracking-[0.2em] text-gold uppercase border border-gold/20 rounded-full bg-gold/5">
                            Question {currentQuestionIndex + 1}
                        </span>
                        <h2 className="serif-title text-2xl md:text-3xl font-medium leading-relaxed text-white drop-shadow-xl">
                            {currentQuestion.question}
                        </h2>
                    </div>

                    {/* Options */}
                    <div className="space-y-4 flex-1">
                        {currentQuestion.options.map((option) => {
                            const selected = answers[currentQuestion.id] === option.id;
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleOptionSelect(option.id)}
                                    className={`w-full p-6 text-left transition-all duration-300 rounded-xl border relative overflow-hidden group ${selected
                                        ? 'bg-gold/10 border-gold shadow-[0_0_20px_rgba(212,175,55,0.15)]'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                        }`}
                                >
                                    <div className="flex items-center justify-between relative z-10">
                                        <span className={`text-sm md:text-base font-medium transition-colors ${selected ? 'text-white' : 'text-slate-300 group-hover:text-white'
                                            }`}>
                                            {option.text}
                                        </span>
                                        <div className={`size-5 rounded-full border flex items-center justify-center transition-all ${selected
                                            ? 'border-gold bg-gold text-black scale-110'
                                            : 'border-white/20 group-hover:border-white/40'
                                            }`}>
                                            {selected && <span className="material-symbols-outlined text-xs font-bold">check</span>}
                                        </div>
                                    </div>
                                    {/* Selection Glow Effect */}
                                    {selected && <div className="absolute inset-0 bg-gradient-to-r from-gold/5 to-transparent pointer-events-none"></div>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Next Button */}
                    <div className="mt-12">
                        <button
                            onClick={handleNext}
                            disabled={!isSelected}
                            className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2 ${isSelected
                                ? 'bg-gold text-primary shadow-[0_4px_20px_rgba(212,175,55,0.4)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.6)] active:scale-[0.98]'
                                : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                                }`}
                        >
                            {currentQuestionIndex === totalQuestions - 1 ? (
                                <>
                                    결과 분석하기
                                    <span className="material-symbols-outlined text-sm">analytics</span>
                                </>
                            ) : (
                                <>
                                    다음 질문
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </div>

                </main>
                <Footer />
                <BottomNavigation />
            </div>
        </div>
    );
}
