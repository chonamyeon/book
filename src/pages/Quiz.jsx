import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { questions } from '../data/questions';
import BottomNavigation from '../components/BottomNavigation';
import TopNavigation from '../components/TopNavigation';

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
            const resultType = calculateResult(answers);
            localStorage.setItem('quizResult', resultType); // Save result for Library access
            navigate('/result', { state: { resultType } });
        }
    };

    const calculateResult = (finalAnswers) => {
        // Score Calculation: A=Growth, B=Entertainment, C=Empathy, D=Mindfulness
        const scores = { A: 0, B: 0, C: 0, D: 0 };

        Object.values(finalAnswers).forEach(option => {
            if (scores[option] !== undefined) {
                scores[option]++;
            }
        });

        let maxScore = -1;
        let resultType = 'growth';

        const typeMap = {
            'A': 'growth',
            'B': 'entertainment',
            'C': 'empathy',
            'D': 'mindfulness'
        };

        for (const [key, value] of Object.entries(scores)) {
            if (value > maxScore) {
                maxScore = value;
                resultType = typeMap[key];
            }
        }

        return resultType;
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
                <TopNavigation title="성향 분석" type="sub" />

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
                <BottomNavigation />
            </div>
        </div>
    );
}
