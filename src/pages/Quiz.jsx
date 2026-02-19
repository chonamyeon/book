import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { questions } from '../data/questions';
import BottomNavigation from '../components/BottomNavigation';

export default function Quiz() {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [quizQuestions, setQuizQuestions] = useState([]);
    const navigate = useNavigate();

    // Initialize quiz with random questions on mount
    React.useEffect(() => {
        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        setQuizQuestions(shuffled.slice(0, 10)); // Select 10 random questions
    }, []);

    if (quizQuestions.length === 0) return <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-slate-500">Loading Quiz...</div>;

    const currentQuestion = quizQuestions[currentQuestionIndex];
    const totalQuestions = quizQuestions.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

    const handleOptionSelect = (optionId) => {
        const newAnswers = { ...answers, [currentQuestion.id]: optionId };
        setAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            window.scrollTo(0, 0);
        } else {
            const resultType = calculateResult(answers);
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

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen flex flex-col pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between bg-background-light/80 dark:bg-background-dark/80 px-4 py-4 backdrop-blur-md border-b border-primary/10 dark:border-white/10">
                <Link to="/" className="flex size-10 items-center justify-center rounded-full hover:bg-primary/10 dark:hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </Link>
                <div className="flex-1 px-4">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                            className="h-full bg-primary transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
                <div className="text-xs font-bold text-slate-500">
                    <span className="text-primary dark:text-white">{currentQuestionIndex + 1}</span> / {totalQuestions}
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 md:max-w-xl md:mx-auto w-full animate-fade-in">

                {/* Product Section */}
                <div className="w-full mb-8 relative rounded-2xl overflow-hidden border border-white/10 group shadow-lg">
                    <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1000&auto=format&fit=crop")' }}></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/50 to-transparent"></div>
                    <div className="relative p-6 flex flex-col justify-end h-32">
                        <span className="text-gold text-[10px] font-bold uppercase tracking-widest mb-1">당신의 지적 취향을 발견하세요</span>
                        <h3 className="text-white font-bold text-lg leading-tight">나에게 맞는 책 찾기 테스트를 통해 당신만의 개인 아카이브를 완성하세요.</h3>
                    </div>
                </div>

                {/* Question Section */}
                <div className="w-full mb-8">
                    <span className="inline-block px-3 py-1 mb-4 text-[10px] font-bold tracking-widest text-gold uppercase bg-gold/10 rounded-full">
                        Question {currentQuestionIndex + 1}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold leading-tight text-primary dark:text-white mb-2">
                        {currentQuestion.question}
                    </h2>
                </div>

                {/* Options Section */}
                <div className="w-full space-y-3">
                    {currentQuestion.options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => handleOptionSelect(option.id)}
                            className={`group flex w-full items-center justify-between p-5 text-left transition-all border rounded-2xl ${answers[currentQuestion.id] === option.id
                                ? 'bg-primary text-white border-primary ring-4 ring-primary/20 shadow-xl scale-[1.02]'
                                : 'bg-white dark:bg-white/5 border-primary/5 dark:border-white/10 hover:border-primary hover:bg-primary/5'
                                }`}
                        >
                            <span className={`text-sm md:text-base font-medium transition-colors ${answers[currentQuestion.id] === option.id ? 'text-white' : 'text-slate-700 dark:text-slate-200'
                                }`}>
                                {option.text}
                            </span>

                            <div className={`size-6 rounded-full border shrink-0 ml-4 flex items-center justify-center transition-colors ${answers[currentQuestion.id] === option.id
                                ? 'border-white bg-white/20 text-white'
                                : 'border-slate-300 dark:border-slate-600 group-hover:border-primary group-hover:bg-primary/10'
                                }`}>
                                {answers[currentQuestion.id] === option.id && (
                                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Navigation Buttons */}
                <div className="w-full mt-10">
                    <button
                        onClick={handleNext}
                        disabled={!answers[currentQuestion.id]}
                        className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg ${answers[currentQuestion.id]
                            ? 'bg-primary text-white hover:bg-primary-dark active:scale-[0.98]'
                            : 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        {currentQuestionIndex === totalQuestions - 1 ? '결과 확인하기' : '다음 질문'}
                    </button>
                </div>

            </main>
            <BottomNavigation />
        </div>
    );
}
